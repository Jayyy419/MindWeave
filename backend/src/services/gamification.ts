import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Calculate user level based on entry count.
 * Level = floor(entryCount / 5) + 1
 * (1-4 entries = level 1, 5-9 = level 2, etc.)
 */
export function calculateLevel(entryCount: number): number {
  return Math.floor(entryCount / 5) + 1;
}

/**
 * Determine which badges the user has earned.
 * Returns an array of badge name strings.
 */
export async function calculateBadges(userId: string): Promise<string[]> {
  const badges: string[] = [];

  // Fetch all entries for this user
  const entries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const entryCount = entries.length;
  if (entryCount === 0) return badges;

  // Badge: "First Entry" – awarded after the first entry
  if (entryCount >= 1) {
    badges.push("First Entry");
  }

  // Badge: "Consistent" – entries on 7 distinct days within the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentEntries = entries.filter(
    (e) => new Date(e.createdAt) >= sevenDaysAgo
  );
  const distinctDays = new Set(
    recentEntries.map((e) => new Date(e.createdAt).toISOString().split("T")[0])
  );
  if (distinctDays.size >= 7) {
    badges.push("Consistent");
  }

  // Badge: "Deep Diver" – used all three frameworks at least once
  const frameworks = new Set(entries.map((e) => e.framework));
  if (
    frameworks.has("cbt") &&
    frameworks.has("iceberg") &&
    frameworks.has("growth")
  ) {
    badges.push("Deep Diver");
  }

  return badges;
}

/**
 * Merge new tags into the user's existing tag list (deduplicated).
 */
export function mergeTags(
  existingTagsJson: string,
  newTags: string[]
): string[] {
  const existing: string[] = JSON.parse(existingTagsJson);
  const merged = new Set([...existing, ...newTags]);
  return Array.from(merged);
}

/**
 * Update user's level, badges, and tags after a new entry is created.
 */
export async function updateUserGamification(
  userId: string,
  newTags: string[]
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // Count entries
  const entryCount = await prisma.entry.count({ where: { userId } });

  // Calculate new level
  const level = calculateLevel(entryCount);

  // Calculate badges
  const badges = await calculateBadges(userId);

  // Merge tags
  const allTags = mergeTags(user.tags, newTags);

  // Update the user record
  await prisma.user.update({
    where: { id: userId },
    data: {
      level,
      badges: JSON.stringify(badges),
      tags: JSON.stringify(allTags),
    },
  });
}
