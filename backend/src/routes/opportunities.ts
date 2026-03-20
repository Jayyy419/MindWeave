import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

const VALID_ACCESS_SCOPES = [
  "profileBasics",
  "interestProfile",
  "reflectionSummary",
  "selectedJournalExcerpts",
  "fullJournalAccess",
] as const;

type AccessScope = (typeof VALID_ACCESS_SCOPES)[number];

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseScopes(value: unknown): AccessScope[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (scope): scope is AccessScope =>
      typeof scope === "string" && (VALID_ACCESS_SCOPES as readonly string[]).includes(scope)
  );
}

function buildReflectionSummary(entries: Array<{ title: string; originalText: string; tags: string; createdAt: Date }>) {
  const recentTitles = entries.map((entry) => entry.title).filter(Boolean).slice(0, 3);
  const dominantTags = Array.from(
    new Set(entries.flatMap((entry) => parseStringArray(entry.tags)))
  ).slice(0, 8);

  return {
    recentEntryCount: entries.length,
    recentEntryTitles: recentTitles,
    recurringThemes: dominantTags,
    summary:
      entries.length === 0
        ? "No recent journal entries available for summary."
        : `Recent reflections show repeated attention to ${dominantTags.slice(0, 4).join(", ") || "personal growth"}.`,
  };
}

async function buildAccessPackage(userId: string, scopes: AccessScope[]) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      level: true,
      badges: true,
      tags: true,
      createdAt: true,
    },
  });

  if (!user) {
    return null;
  }

  const entryCount = await prisma.entry.count({ where: { userId } });
  const recentEntries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      title: true,
      originalText: true,
      reframedText: true,
      tags: true,
      createdAt: true,
    },
  });

  const payload: Record<string, unknown> = {};

  if (scopes.includes("profileBasics")) {
    payload.profileBasics = {
      username: user.username,
      email: user.email,
      level: user.level,
      badges: parseStringArray(user.badges),
      memberSince: user.createdAt,
      entryCount,
    };
  }

  if (scopes.includes("interestProfile")) {
    payload.interestProfile = {
      tags: parseStringArray(user.tags),
    };
  }

  if (scopes.includes("reflectionSummary")) {
    payload.reflectionSummary = buildReflectionSummary(recentEntries);
  }

  if (scopes.includes("selectedJournalExcerpts")) {
    payload.selectedJournalExcerpts = recentEntries.slice(0, 3).map((entry) => ({
      title: entry.title,
      createdAt: entry.createdAt,
      excerpt: entry.originalText.slice(0, 280),
      reframedPerspective: entry.reframedText.slice(0, 280),
    }));
  }

  if (scopes.includes("fullJournalAccess")) {
    payload.fullJournalAccess = recentEntries.map((entry) => ({
      title: entry.title,
      createdAt: entry.createdAt,
      originalText: entry.originalText,
      reframedText: entry.reframedText,
    }));
  }

  return payload;
}

async function getEligibility(opportunityId: string, userId: string) {
  const [opportunity, user, entryCount] = await Promise.all([
    prisma.opportunity.findUnique({ where: { id: opportunityId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.entry.count({ where: { userId } }),
  ]);

  if (!opportunity || !user) {
    return null;
  }

  const userTags = parseStringArray(user.tags);
  const matchingTags = parseStringArray(opportunity.matchingTags);
  const overlap = matchingTags.filter((tag) => userTags.includes(tag));

  return {
    opportunity,
    eligible:
      opportunity.isActive &&
      entryCount >= opportunity.minimumEntries &&
      user.level >= opportunity.minimumLevel &&
      overlap.length > 0,
    entryCount,
    overlap,
  };
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    const [opportunities, user, entryCount, consents] = await Promise.all([
      prisma.opportunity.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.entry.count({ where: { userId } }),
      prisma.dataAccessConsent.findMany({
        where: { userId },
        orderBy: { grantedAt: "desc" },
      }),
    ]);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const userTags = parseStringArray(user.tags);

    const result = opportunities.map((opportunity) => {
      const overlap = parseStringArray(opportunity.matchingTags).filter((tag) => userTags.includes(tag));
      const consent = consents.find((item) => item.opportunityId === opportunity.id && item.revokedAt === null);
      const eligible =
        entryCount >= opportunity.minimumEntries &&
        user.level >= opportunity.minimumLevel &&
        overlap.length > 0;

      return {
        id: opportunity.id,
        slug: opportunity.slug,
        title: opportunity.title,
        organizerName: opportunity.organizerName,
        summary: opportunity.summary,
        description: opportunity.description,
        benefits: parseStringArray(opportunity.benefits),
        resourceHighlights: parseStringArray(opportunity.resourceHighlights),
        requestedScopes: parseStringArray(opportunity.requestedScopes),
        eligible,
        matchedTags: overlap,
        minimumEntries: opportunity.minimumEntries,
        minimumLevel: opportunity.minimumLevel,
        consent:
          consent && consent.revokedAt === null
            ? {
                id: consent.id,
                status: consent.status,
                scopes: parseStringArray(consent.scopes),
                grantedAt: consent.grantedAt,
                expiresAt: consent.expiresAt,
              }
            : null,
      };
    });

    res.json({
      opportunities: result,
      overview: {
        entryCount,
        level: user.level,
        userTags,
      },
    });
  } catch (error) {
    console.error("Error listing opportunities:", error);
    res.status(500).json({ error: "Failed to list opportunities" });
  }
});

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;

  try {
    const eligibility = await getEligibility(id, userId);
    if (!eligibility) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }

    const consent = await prisma.dataAccessConsent.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId: id,
        },
      },
    });

    res.json({
      id: eligibility.opportunity.id,
      slug: eligibility.opportunity.slug,
      title: eligibility.opportunity.title,
      organizerName: eligibility.opportunity.organizerName,
      summary: eligibility.opportunity.summary,
      description: eligibility.opportunity.description,
      benefits: parseStringArray(eligibility.opportunity.benefits),
      resourceHighlights: parseStringArray(eligibility.opportunity.resourceHighlights),
      requestedScopes: parseStringArray(eligibility.opportunity.requestedScopes),
      matchedTags: eligibility.overlap,
      minimumEntries: eligibility.opportunity.minimumEntries,
      minimumLevel: eligibility.opportunity.minimumLevel,
      eligible: eligibility.eligible,
      consent:
        consent && consent.revokedAt === null
          ? {
              id: consent.id,
              status: consent.status,
              scopes: parseStringArray(consent.scopes),
              grantedAt: consent.grantedAt,
              expiresAt: consent.expiresAt,
            }
          : null,
    });
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    res.status(500).json({ error: "Failed to fetch opportunity" });
  }
});

router.get("/:id/access-preview", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  const rawScope = req.query.scope;
  const scopes = parseScopes(Array.isArray(rawScope) ? rawScope : rawScope ? [rawScope] : []);

  if (scopes.length === 0) {
    res.status(400).json({ error: "At least one valid scope is required" });
    return;
  }

  try {
    const eligibility = await getEligibility(id, userId);
    if (!eligibility) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }

    const requestedScopes = parseStringArray(eligibility.opportunity.requestedScopes);
    if (scopes.some((scope) => !requestedScopes.includes(scope))) {
      res.status(400).json({ error: "Requested preview scopes are not allowed for this opportunity" });
      return;
    }

    const accessPackage = await buildAccessPackage(userId, scopes);
    res.json({
      opportunityId: id,
      scopes,
      accessPackage,
    });
  } catch (error) {
    console.error("Error generating access preview:", error);
    res.status(500).json({ error: "Failed to generate access preview" });
  }
});

router.post("/:id/consent", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  const scopes = parseScopes(req.body?.scopes);
  const expiresAtRaw = req.body?.expiresAt as string | undefined;

  if (scopes.length === 0) {
    res.status(400).json({ error: "Select at least one valid data scope" });
    return;
  }

  try {
    const eligibility = await getEligibility(id, userId);
    if (!eligibility) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }

    if (!eligibility.eligible) {
      res.status(403).json({ error: "This opportunity is not unlocked for your account yet" });
      return;
    }

    const requestedScopes = parseStringArray(eligibility.opportunity.requestedScopes);
    if (scopes.some((scope) => !requestedScopes.includes(scope))) {
      res.status(400).json({ error: "One or more selected scopes are not available for this opportunity" });
      return;
    }

    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
    if (expiresAtRaw && Number.isNaN(expiresAt?.getTime())) {
      res.status(400).json({ error: "expiresAt must be a valid ISO date" });
      return;
    }

    const consent = await prisma.dataAccessConsent.upsert({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId: id,
        },
      },
      update: {
        status: "granted",
        scopes: JSON.stringify(scopes),
        purposeSnapshot: eligibility.opportunity.summary,
        organizerSnapshot: eligibility.opportunity.organizerName,
        expiresAt,
        revokedAt: null,
        grantedAt: new Date(),
      },
      create: {
        userId,
        opportunityId: id,
        status: "granted",
        scopes: JSON.stringify(scopes),
        purposeSnapshot: eligibility.opportunity.summary,
        organizerSnapshot: eligibility.opportunity.organizerName,
        expiresAt,
      },
    });

    res.status(201).json({
      id: consent.id,
      status: consent.status,
      scopes: parseStringArray(consent.scopes),
      grantedAt: consent.grantedAt,
      expiresAt: consent.expiresAt,
    });
  } catch (error) {
    console.error("Error saving consent:", error);
    res.status(500).json({ error: "Failed to save consent" });
  }
});

export default router;