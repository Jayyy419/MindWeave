import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateChatBotReply } from "../services/gemini";
import { writeAiAuditLog } from "../services/governance";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/thinktanks
 * List all predefined think tanks.
 */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const tanks = await prisma.thinkTank.findMany({
      include: {
        memberships: {
          select: { userId: true },
        },
      },
    });

    const result = tanks.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      tags: JSON.parse(t.tags),
      maxMembers: t.maxMembers,
      memberCount: t.memberships.length,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error listing think tanks:", error);
    res.status(500).json({ error: "Failed to list think tanks" });
  }
});

/**
 * GET /api/thinktanks/available
 * List think tanks that match the current user's accumulated tags.
 * Requires the user to have at least 3 entries before matching.
 */
router.get(
  "/available",
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId as string;

    try {
      // Check if user has enough entries
      const entryCount = await prisma.entry.count({ where: { userId } });
      if (entryCount < 3) {
        res.json({
          message:
            "Write at least 3 journal entries to unlock think tank matching.",
          available: [],
        });
        return;
      }

      // Get user's tags
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const userTags: string[] = JSON.parse(user.tags);

      // Get all think tanks
      const tanks = await prisma.thinkTank.findMany({
        include: {
          memberships: {
            select: { userId: true },
          },
        },
      });

      // Filter tanks that have at least one overlapping tag with the user
      const available = tanks
        .filter((tank) => {
          const tankTags: string[] = JSON.parse(tank.tags);
          return tankTags.some((tag) => userTags.includes(tag));
        })
        .map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          tags: JSON.parse(t.tags),
          maxMembers: t.maxMembers,
          memberCount: t.memberships.length,
          isFull: t.memberships.length >= t.maxMembers,
          isJoined: t.memberships.some((m) => m.userId === userId),
        }));

      res.json({ available });
    } catch (error) {
      console.error("Error fetching available tanks:", error);
      res.status(500).json({ error: "Failed to fetch available think tanks" });
    }
  }
);

/**
 * GET /api/thinktanks/:id
 * Get a single think tank with its member list.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = (req as any).userId as string;

  try {
    const tank = await prisma.thinkTank.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                level: true,
              },
            },
          },
        },
      },
    });

    if (!tank) {
      res.status(404).json({ error: "Think tank not found" });
      return;
    }

    res.json({
      id: tank.id,
      name: tank.name,
      description: tank.description,
      tags: JSON.parse(tank.tags),
      maxMembers: tank.maxMembers,
      members: tank.memberships.map((m) => ({
        userId: m.user.id,
        username: m.user.username || `User-${m.user.id.substring(0, 6)}`,
        level: m.user.level,
        joinedAt: m.joinedAt,
      })),
      isJoined: tank.memberships.some((m) => m.userId === userId),
    });
  } catch (error) {
    console.error("Error fetching think tank:", error);
    res.status(500).json({ error: "Failed to fetch think tank" });
  }
});

/**
 * POST /api/thinktanks/:id/join
 * Join a think tank. Max 5 members per tank.
 */
router.post(
  "/:id/join",
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId as string;
    const id = req.params.id as string;

    try {
      // Verify think tank exists
      const tank = await prisma.thinkTank.findUnique({
        where: { id },
        include: { memberships: true },
      });

      if (!tank) {
        res.status(404).json({ error: "Think tank not found" });
        return;
      }

      // Check if already a member
      const existingMembership = tank.memberships.find((m) => m.userId === userId);
      if (existingMembership) {
        res.status(400).json({ error: "Already a member of this think tank" });
        return;
      }

      // Check capacity
      if (tank.memberships.length >= tank.maxMembers) {
        res.status(400).json({ error: "This think tank is full" });
        return;
      }

      // Create membership
      await prisma.membership.create({
        data: {
          userId,
          thinkTankId: id,
        },
      });

      res.status(201).json({ message: "Successfully joined think tank" });
    } catch (error) {
      console.error("Error joining think tank:", error);
      res.status(500).json({ error: "Failed to join think tank" });
    }
  }
);

/**
 * GET /api/thinktanks/:id/messages
 * Fetch recent chat messages for a think tank (members only).
 */
router.get("/:id/messages", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;

  try {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_thinkTankId: {
          userId,
          thinkTankId: id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: "Join this think tank before accessing chat" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { thinkTankId: id },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        role: true,
        usernameSnapshot: true,
        content: true,
        createdAt: true,
      },
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

/**
 * POST /api/thinktanks/:id/messages
 * Post a chat message and auto-generate AI bot facilitator reply.
 */
router.post("/:id/messages", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const username = (req as any).username as string;
  const id = req.params.id as string;
  const content = (req.body?.content as string | undefined)?.trim();

  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  if (content.length > 1000) {
    res.status(400).json({ error: "content must be 1000 characters or fewer" });
    return;
  }

  try {
    const tank = await prisma.thinkTank.findUnique({ where: { id } });
    if (!tank) {
      res.status(404).json({ error: "Think tank not found" });
      return;
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_thinkTankId: {
          userId,
          thinkTankId: id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: "Join this think tank before sending messages" });
      return;
    }

    const userMessage = await prisma.message.create({
      data: {
        thinkTankId: id,
        userId,
        role: "user",
        usernameSnapshot: username,
        content,
      },
    });

    const shouldTriggerBot = content.startsWith("/ask") || content.startsWith("@bot") || content.length > 40;

    let botMessage = null;
    if (shouldTriggerBot) {
      const botReply = await generateChatBotReply(tank.name, username, content);
      botMessage = await prisma.message.create({
        data: {
          thinkTankId: id,
          role: "bot",
          usernameSnapshot: "MindWeave Bot",
          content: botReply,
        },
      });

      await writeAiAuditLog({
        userId,
        route: "/api/thinktanks/:id/messages",
        action: "group-chat-bot-reply",
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        moderationOutcome: "none",
        success: true,
        inputText: content,
        outputText: botReply,
        metadata: {
          thinkTankId: id,
          thinkTankName: tank.name,
        },
      });
    }

    res.status(201).json({
      userMessage,
      botMessage,
    });
  } catch (error) {
    await writeAiAuditLog({
      userId,
      route: "/api/thinktanks/:id/messages",
      action: "group-chat-bot-reply",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      moderationOutcome: "unknown",
      success: false,
      errorCode: error instanceof Error ? error.message : "THINKTANK_MESSAGE_FAILED",
      inputText: content,
      metadata: {
        thinkTankId: id,
      },
    }).catch((auditError) => {
      console.warn("Failed to write AI audit log:", auditError);
    });

    console.error("Error sending chat message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
