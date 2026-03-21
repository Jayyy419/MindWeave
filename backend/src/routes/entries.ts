import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { reframeText, extractTags } from "../services/gemini";
import { updateUserGamification } from "../services/gamification";
import { VALID_FRAMEWORK_IDS, CULTURAL_FRAMEWORK_IDS } from "../config/frameworks";

const router = Router();
const prisma = new PrismaClient();
const MAX_ENTRY_WORDS = 100;

const OFF_TOPIC_ERROR =
  "MindWeave is a personal journaling tool. Please write about your own thoughts, feelings, and experiences.";
const MAX_TITLE_LENGTH = 100;
const VALID_CULTURAL_TONE_STRENGTHS = ["light", "medium", "strong"] as const;

type CulturalToneStrength = (typeof VALID_CULTURAL_TONE_STRENGTHS)[number];
type EntryChunk = {
  id: string;
  userText: string;
  aiText: string;
};

type SafetyResource = {
  label: string;
  contact: string;
  type: "hotline" | "ngo";
};

type SafetySignal = {
  level: "none" | "high";
  reasons: string[];
  message: string | null;
  supportCountry: string;
  supportResources: SafetyResource[];
};

const SUPPORT_DIRECTORY: Record<string, SafetyResource[]> = {
  singapore: [
    { label: "Samaritans of Singapore", contact: "1767", type: "hotline" },
    { label: "Institute of Mental Health Helpline", contact: "6389 2222", type: "hotline" },
  ],
  indonesia: [
    { label: "SEJIWA", contact: "119 ext 8", type: "hotline" },
    { label: "Into The Light Indonesia", contact: "intothelightid.org", type: "ngo" },
  ],
  malaysia: [
    { label: "Befrienders KL", contact: "03-7627 2929", type: "hotline" },
    { label: "Talian HEAL", contact: "15555", type: "hotline" },
  ],
  thailand: [
    { label: "Thai Mental Health Hotline", contact: "1323", type: "hotline" },
    { label: "Samaritans of Thailand", contact: "samaritansthai.com", type: "ngo" },
  ],
  philippines: [
    { label: "NCMH Crisis Hotline", contact: "1553", type: "hotline" },
    { label: "In Touch Community Services", contact: "+63 2 8893 7603", type: "hotline" },
  ],
  vietnam: [
    { label: "Blue Dragon Childline", contact: "111", type: "hotline" },
    { label: "CSAGA", contact: "csaga.org.vn", type: "ngo" },
  ],
  brunei: [
    { label: "Talian Harapan 145", contact: "145", type: "hotline" },
    { label: "Healthline", contact: "148", type: "hotline" },
  ],
  cambodia: [
    { label: "TPO Cambodia", contact: "023 222 214", type: "ngo" },
    { label: "Child Helpline", contact: "1280", type: "hotline" },
  ],
  laos: [
    { label: "Lao Youth Union Support", contact: "1093", type: "hotline" },
    { label: "WHO Laos Mental Health Directory", contact: "who.int/laos", type: "ngo" },
  ],
  myanmar: [
    { label: "Myanmar Mental Health Support", contact: "mhmmyanmar.org", type: "ngo" },
    { label: "Emergency Health Line", contact: "192", type: "hotline" },
  ],
  general: [
    { label: "Emergency Services", contact: "Call local emergency number now", type: "hotline" },
    { label: "FindAHelpline", contact: "findahelpline.com", type: "ngo" },
  ],
};

const HIGH_RISK_PATTERNS: Array<{ reason: string; regex: RegExp }> = [
  { reason: "self-harm mention", regex: /\b(kill myself|suicide|end my life|hurt myself|self harm)\b/i },
  { reason: "hopelessness crisis", regex: /\b(no reason to live|can't go on|want to disappear)\b/i },
  { reason: "immediate danger", regex: /\b(overdose|jump off|cut myself|die tonight)\b/i },
];

function parseCulturalToneStrength(value: unknown): CulturalToneStrength | undefined {
  if (typeof value !== "string") return undefined;
  return (VALID_CULTURAL_TONE_STRENGTHS as readonly string[]).includes(value)
    ? (value as CulturalToneStrength)
    : undefined;
}

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function getSupportResources(culturalFramework?: string): { supportCountry: string; supportResources: SafetyResource[] } {
  if (culturalFramework && SUPPORT_DIRECTORY[culturalFramework]) {
    return {
      supportCountry: culturalFramework,
      supportResources: SUPPORT_DIRECTORY[culturalFramework],
    };
  }

  return {
    supportCountry: "general",
    supportResources: SUPPORT_DIRECTORY.general,
  };
}

function detectSafetySignal(text: string, culturalFramework?: string): SafetySignal {
  const reasons = HIGH_RISK_PATTERNS.filter((item) => item.regex.test(text)).map((item) => item.reason);
  const { supportCountry, supportResources } = getSupportResources(culturalFramework);

  if (reasons.length === 0) {
    return {
      level: "none",
      reasons: [],
      message: null,
      supportCountry,
      supportResources,
    };
  }

  return {
    level: "high",
    reasons,
    message:
      "Your journal text may indicate urgent emotional risk. Please contact immediate support if you feel unsafe right now.",
    supportCountry,
    supportResources,
  };
}

function buildExplainability(framework: string, culturalFramework?: string, culturalToneStrength?: CulturalToneStrength) {
  return {
    framework,
    culturalFramework: culturalFramework || null,
    culturalToneStrength: culturalFramework ? culturalToneStrength || "medium" : null,
    steps: [
      "Your entry is processed as reflection text (not as a command/task request).",
      "MindWeave applies your selected framework prompt to generate a balanced reframe.",
      "A second pass extracts keyword tags used for journaling insights and progression.",
      "Safety scanning checks for high-risk language and surfaces country-relevant support resources.",
    ],
  };
}

function parseEntryChunks(value: unknown): EntryChunk[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (chunk): chunk is EntryChunk =>
        typeof chunk === "object" &&
        chunk !== null &&
        typeof (chunk as EntryChunk).id === "string" &&
        typeof (chunk as EntryChunk).userText === "string" &&
        typeof (chunk as EntryChunk).aiText === "string"
    )
    .map((chunk) => ({
      id: chunk.id.trim(),
      userText: chunk.userText.trim(),
      aiText: chunk.aiText.trim(),
    }))
    .filter((chunk) => chunk.id.length > 0 && chunk.userText.length > 0);
}

function getStoredChunks(chunksRaw: string, originalText: string, reframedText: string): EntryChunk[] {
  try {
    const parsed = JSON.parse(chunksRaw) as EntryChunk[];
    const chunks = parseEntryChunks(parsed);
    if (chunks.length > 0) return chunks;
  } catch {
    // Fall through to legacy compatibility format.
  }

  return [
    {
      id: "legacy-1",
      userText: originalText,
      aiText: reframedText,
    },
  ];
}

/**
 * POST /api/entries/reframe-preview
 * Generate a live reframing preview without saving to database.
 *
 * Body: { text: string, framework: "cbt" | "iceberg" | "growth" }
 */
router.post("/reframe-preview", async (req: Request, res: Response): Promise<void> => {
  const { text, framework, culturalToneStrength, culturalFramework } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required and must be a non-empty string" });
    return;
  }

  if (!framework || !VALID_FRAMEWORK_IDS.includes(framework)) {
    res.status(400).json({
      error: `framework must be one of: ${VALID_FRAMEWORK_IDS.join(", ")}`,
    });
    return;
  }

  const parsedToneStrength = parseCulturalToneStrength(culturalToneStrength);
  if (culturalToneStrength !== undefined && !parsedToneStrength) {
    res.status(400).json({
      error: `culturalToneStrength must be one of: ${VALID_CULTURAL_TONE_STRENGTHS.join(", ")}`,
    });
    return;
  }

  const isCulturalFramework = (CULTURAL_FRAMEWORK_IDS as readonly string[]).includes(framework);
  if (!isCulturalFramework && parsedToneStrength) {
    res.status(400).json({
      error: "culturalToneStrength can only be used with cultural frameworks",
    });
    return;
  }

  if (
    culturalFramework !== undefined &&
    !(CULTURAL_FRAMEWORK_IDS as readonly string[]).includes(culturalFramework)
  ) {
    res.status(400).json({
      error: `culturalFramework must be one of: ${CULTURAL_FRAMEWORK_IDS.join(", ")}`,
    });
    return;
  }

  if (text.length > 5000) {
    res.status(400).json({ error: "text must be 5000 characters or fewer" });
    return;
  }

  if (countWords(text) > MAX_ENTRY_WORDS) {
    res.status(400).json({ error: `text must be ${MAX_ENTRY_WORDS} words or fewer` });
    return;
  }

  const safety = detectSafetySignal(text, culturalFramework);
  const explainability = buildExplainability(framework, culturalFramework, parsedToneStrength);

  try {
    const reframedText = await reframeText(text.trim(), framework, {
      allowFallback: false,
      culturalFramework,
      culturalToneStrength: parsedToneStrength,
    });
    res.json({
      originalText: text.trim(),
      reframedText,
      framework,
      source: "ai",
      explainability,
      safety,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_JOURNAL_ENTRY") {
      res.status(422).json({ error: OFF_TOPIC_ERROR });
      return;
    }
    console.error("Error generating reframe preview:", error);
    res.status(503).json({ error: "Live AI reframing is temporarily unavailable" });
  }
});

router.get("/support-resources", (req: Request, res: Response): void => {
  const culturalFrameworkRaw = req.query.culturalFramework;
  const culturalFrameworkValue = Array.isArray(culturalFrameworkRaw)
    ? culturalFrameworkRaw[0]
    : culturalFrameworkRaw;
  const culturalFramework = typeof culturalFrameworkValue === "string" ? culturalFrameworkValue : undefined;

  const { supportCountry, supportResources } = getSupportResources(culturalFramework);
  res.json({ supportCountry, supportResources });
});

/**
 * POST /api/entries
 * Create a new journal entry with AI reframing and tag extraction.
 *
 * Body: { text: string, framework: "cbt" | "iceberg" | "growth" }
 * Returns the created entry with reframed text.
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const { title, text, framework, culturalToneStrength, culturalFramework, chunks } = req.body;

  // Validate input
  if (typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ error: "title is required and must be a non-empty string" });
    return;
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    res.status(400).json({ error: `title must be ${MAX_TITLE_LENGTH} characters or fewer` });
    return;
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required and must be a non-empty string" });
    return;
  }

  if (!framework || !VALID_FRAMEWORK_IDS.includes(framework)) {
    res.status(400).json({
      error: `framework must be one of: ${VALID_FRAMEWORK_IDS.join(", ")}`,
    });
    return;
  }

  const parsedToneStrength = parseCulturalToneStrength(culturalToneStrength);
  if (culturalToneStrength !== undefined && !parsedToneStrength) {
    res.status(400).json({
      error: `culturalToneStrength must be one of: ${VALID_CULTURAL_TONE_STRENGTHS.join(", ")}`,
    });
    return;
  }

  const isCulturalFramework = (CULTURAL_FRAMEWORK_IDS as readonly string[]).includes(framework);
  if (!isCulturalFramework && parsedToneStrength) {
    res.status(400).json({
      error: "culturalToneStrength can only be used with cultural frameworks",
    });
    return;
  }

  if (
    culturalFramework !== undefined &&
    !(CULTURAL_FRAMEWORK_IDS as readonly string[]).includes(culturalFramework)
  ) {
    res.status(400).json({
      error: `culturalFramework must be one of: ${CULTURAL_FRAMEWORK_IDS.join(", ")}`,
    });
    return;
  }

  // Limit text length to prevent abuse
  if (text.length > 5000) {
    res.status(400).json({ error: "text must be 5000 characters or fewer" });
    return;
  }

  if (countWords(text) > MAX_ENTRY_WORDS) {
    res.status(400).json({ error: `text must be ${MAX_ENTRY_WORDS} words or fewer` });
    return;
  }

  const parsedChunks = parseEntryChunks(chunks);
  const safety = detectSafetySignal(text, culturalFramework);
  const explainability = buildExplainability(framework, culturalFramework, parsedToneStrength);

  try {
    // Validate journal intent first, then extract tags in parallel.
    // reframeText throws NOT_JOURNAL_ENTRY if the content is off-topic.
    const [reframedText, tags] = await Promise.all([
      reframeText(text.trim(), framework, {
        culturalFramework,
        culturalToneStrength: parsedToneStrength,
      }),
      extractTags(text.trim()),
    ]);

    // Save entry to database
    const entry = await prisma.entry.create({
      data: {
        userId,
        title: title.trim(),
        framework,
        originalText: text.trim(),
        reframedText,
        chunks: JSON.stringify(parsedChunks),
        tags: JSON.stringify(tags),
      },
    });

    // Update user gamification (level, badges, tags)
    await updateUserGamification(userId, tags);

    res.status(201).json({
      id: entry.id,
      title: entry.title,
      framework: entry.framework,
      originalText: entry.originalText,
      reframedText: entry.reframedText,
      chunks: getStoredChunks(entry.chunks, entry.originalText, entry.reframedText),
      tags,
      createdAt: entry.createdAt,
      explainability,
      safety,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_JOURNAL_ENTRY") {
      res.status(422).json({ error: OFF_TOPIC_ERROR });
      return;
    }
    console.error("Error creating entry:", error);
    res.status(500).json({ error: "Failed to create entry. Please try again." });
  }
});

/**
 * GET /api/entries
 * List all entries for the current user, ordered by newest first.
 * Returns a preview (first 120 chars) of each entry.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    const entries = await prisma.entry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        framework: true,
        originalText: true,
        createdAt: true,
      },
    });

    // Return entries with a text preview
    const result = entries.map((e) => ({
      id: e.id,
      title: e.title,
      framework: e.framework,
      preview:
        e.originalText.length > 120
          ? e.originalText.substring(0, 120) + "..."
          : e.originalText,
      createdAt: e.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error listing entries:", error);
    res.status(500).json({ error: "Failed to list entries" });
  }
});

/**
 * GET /api/entries/:id
 * Get a single entry by ID. Only returns entries belonging to the current user.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;

  try {
    const entry = await prisma.entry.findFirst({
      where: { id, userId },
    });

    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    res.json({
      id: entry.id,
      title: entry.title,
      framework: entry.framework,
      originalText: entry.originalText,
      reframedText: entry.reframedText,
      chunks: getStoredChunks(entry.chunks, entry.originalText, entry.reframedText),
      tags: JSON.parse(entry.tags),
      createdAt: entry.createdAt,
    });
  } catch (error) {
    console.error("Error fetching entry:", error);
    res.status(500).json({ error: "Failed to fetch entry" });
  }
});

/**
 * DELETE /api/entries
 * Delete multiple entries owned by the current user.
 * Body: { ids: string[] }
 */
router.delete("/", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const { ids } = req.body as { ids?: unknown };

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }

  const sanitizedIds = ids
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim());

  if (sanitizedIds.length === 0) {
    res.status(400).json({ error: "ids must contain valid entry IDs" });
    return;
  }

  try {
    const result = await prisma.entry.deleteMany({
      where: {
        userId,
        id: { in: sanitizedIds },
      },
    });

    res.json({ deletedCount: result.count });
  } catch (error) {
    console.error("Error deleting multiple entries:", error);
    res.status(500).json({ error: "Failed to delete selected entries" });
  }
});

/**
 * DELETE /api/entries/:id
 * Delete one entry owned by the current user.
 */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;

  try {
    const deleted = await prisma.entry.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

export default router;
