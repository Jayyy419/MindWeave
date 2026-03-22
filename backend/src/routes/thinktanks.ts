import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateChatBotReply } from "../services/gemini";
import { writeAiAuditLog } from "../services/governance";

const router = Router();
const prisma = new PrismaClient();

const JAY_DEMO_USERNAME = "jay";
const JAY_DEMO_TANK_NAME = "Mindful Living";

function isJayDemoUser(username: string | null | undefined): boolean {
  return (username || "").trim().toLowerCase() === JAY_DEMO_USERNAME;
}

async function ensureJayDemoThinkTankData(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  if (!isJayDemoUser(user?.username)) {
    return;
  }

  const demoTank = await prisma.thinkTank.findFirst({ where: { name: JAY_DEMO_TANK_NAME } });
  if (!demoTank) {
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_thinkTankId: {
        userId,
        thinkTankId: demoTank.id,
      },
    },
  });

  if (!membership) {
    await prisma.membership.create({
      data: {
        userId,
        thinkTankId: demoTank.id,
      },
    });
  }

  const existingCount = await prisma.message.count({
    where: {
      thinkTankId: demoTank.id,
    },
  });

  if (existingCount === 0) {
    await prisma.message.create({
      data: {
        thinkTankId: demoTank.id,
        userId,
        role: "user",
        usernameSnapshot: "jay",
        content:
          "Hey team, I am preparing for the ASEAN youth challenge walkthrough. Can we align on how to present wellbeing impact clearly?",
      },
    });

    await prisma.message.create({
      data: {
        thinkTankId: demoTank.id,
        role: "bot",
        usernameSnapshot: "MindWeave Bot",
        content:
          "Great prompt, Jay. A strong walkthrough flow is: 1) problem context 2) emotional support mechanism 3) measurable outcomes from surveys and learning completion.",
      },
    });

    await prisma.message.create({
      data: {
        thinkTankId: demoTank.id,
        role: "user",
        usernameSnapshot: "Alina",
        content:
          "I can cover the user story and why cultural tone settings matter for trust and adoption.",
      },
    });

    await prisma.message.create({
      data: {
        thinkTankId: demoTank.id,
        role: "bot",
        usernameSnapshot: "MindWeave Bot",
        content:
          "Nice. Pair that with one concrete metric (for example, stress delta trend) so judges see both empathy and evidence.",
      },
    });
  }
}

/**
 * GET /api/thinktanks
 * List all predefined think tanks.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    await ensureJayDemoThinkTankData(userId);

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
      isJoined: t.memberships.some((m) => m.userId === userId),
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
      await ensureJayDemoThinkTankData(userId);

      // Check if user has enough entries
      const entryCount = await prisma.entry.count({ where: { userId } });
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, tags: true },
      });

      const isJayDemo = isJayDemoUser(currentUser?.username);

      if (entryCount < 3 && !isJayDemo) {
        res.json({
          message:
            "Write at least 3 journal entries to unlock think tank matching.",
          available: [],
        });
        return;
      }

      // Get user's tags
      if (!currentUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const userTags: string[] = JSON.parse(currentUser.tags);

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
          if (isJayDemo && tank.name === JAY_DEMO_TANK_NAME) {
            return true;
          }
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

      res.json({
        message: isJayDemo
          ? "Demo profile active for Jay: Think Tank match and facilitator chat are preloaded for walkthrough."
          : undefined,
        available,
      });
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
    await ensureJayDemoThinkTankData(userId);

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

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const isJayDemo = isJayDemoUser(currentUser?.username) && tank.name === JAY_DEMO_TANK_NAME;

    const demoMembers = isJayDemo
      ? [
          {
            userId: "demo-alina",
            username: "alina",
            level: 21,
            joinedAt: new Date("2026-02-11T10:00:00.000Z"),
          },
          {
            userId: "demo-faris",
            username: "faris",
            level: 19,
            joinedAt: new Date("2026-02-14T10:00:00.000Z"),
          },
        ]
      : [];

    const liveMembers = tank.memberships.map((m) => ({
      userId: m.user.id,
      username: m.user.username || `User-${m.user.id.substring(0, 6)}`,
      level: m.user.level,
      joinedAt: m.joinedAt,
    }));

    const seenUserIds = new Set(liveMembers.map((member) => member.userId));
    const mergedMembers = [
      ...liveMembers,
      ...demoMembers.filter((member) => !seenUserIds.has(member.userId)),
    ];

    res.json({
      id: tank.id,
      name: tank.name,
      description: tank.description,
      tags: JSON.parse(tank.tags),
      maxMembers: tank.maxMembers,
      members: mergedMembers,
      isJoined: tank.memberships.some((m) => m.userId === userId) || isJayDemo,
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
    await ensureJayDemoThinkTankData(userId);

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const tank = await prisma.thinkTank.findUnique({
      where: { id },
      select: { name: true },
    });

    const isJayDemo = isJayDemoUser(currentUser?.username) && tank?.name === JAY_DEMO_TANK_NAME;

    const membership = await prisma.membership.findUnique({
      where: {
        userId_thinkTankId: {
          userId,
          thinkTankId: id,
        },
      },
    });

    if (!membership && !isJayDemo) {
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
    await ensureJayDemoThinkTankData(userId);

    const tank = await prisma.thinkTank.findUnique({ where: { id } });
    if (!tank) {
      res.status(404).json({ error: "Think tank not found" });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const isJayDemo = isJayDemoUser(currentUser?.username) && tank.name === JAY_DEMO_TANK_NAME;

    const membership = await prisma.membership.findUnique({
      where: {
        userId_thinkTankId: {
          userId,
          thinkTankId: id,
        },
      },
    });

    if (!membership && !isJayDemo) {
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
