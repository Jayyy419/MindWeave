import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { reframeText, extractTags } from "../services/gemini";
import { updateUserGamification } from "../services/gamification";

const router = Router();
const prisma = new PrismaClient();

// Valid frameworks the user can select
const VALID_FRAMEWORKS = ["cbt", "iceberg", "growth"];

/**
 * POST /api/entries
 * Create a new journal entry with AI reframing and tag extraction.
 *
 * Body: { text: string, framework: "cbt" | "iceberg" | "growth" }
 * Returns the created entry with reframed text.
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const { text, framework } = req.body;

  // Validate input
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required and must be a non-empty string" });
    return;
  }

  if (!framework || !VALID_FRAMEWORKS.includes(framework)) {
    res.status(400).json({
      error: `framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`,
    });
    return;
  }

  // Limit text length to prevent abuse
  if (text.length > 5000) {
    res.status(400).json({ error: "text must be 5000 characters or fewer" });
    return;
  }

  try {
    // Call Gemini API for reframing and tag extraction in parallel
    const [reframedText, tags] = await Promise.all([
      reframeText(text.trim(), framework),
      extractTags(text.trim()),
    ]);

    // Save entry to database
    const entry = await prisma.entry.create({
      data: {
        userId,
        framework,
        originalText: text.trim(),
        reframedText,
        tags: JSON.stringify(tags),
      },
    });

    // Update user gamification (level, badges, tags)
    await updateUserGamification(userId, tags);

    res.status(201).json({
      id: entry.id,
      framework: entry.framework,
      originalText: entry.originalText,
      reframedText: entry.reframedText,
      tags,
      createdAt: entry.createdAt,
    });
  } catch (error) {
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
        framework: true,
        originalText: true,
        createdAt: true,
      },
    });

    // Return entries with a text preview
    const result = entries.map((e) => ({
      id: e.id,
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
      framework: entry.framework,
      originalText: entry.originalText,
      reframedText: entry.reframedText,
      tags: JSON.parse(entry.tags),
      createdAt: entry.createdAt,
    });
  } catch (error) {
    console.error("Error fetching entry:", error);
    res.status(500).json({ error: "Failed to fetch entry" });
  }
});

export default router;
