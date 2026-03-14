import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

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
                anonymousId: true,
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
      members: tank.memberships.map((m: any) => ({
        userId: m.user.id,
        anonymousId: m.user.anonymousId.substring(0, 8) + "...",
        level: m.user.level,
        joinedAt: m.joinedAt,
      })),
      isJoined: tank.memberships.some((m: any) => m.userId === userId),
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
      const existingMembership = (tank as any).memberships.find(
        (m: any) => m.userId === userId
      );
      if (existingMembership) {
        res.status(400).json({ error: "Already a member of this think tank" });
        return;
      }

      // Check capacity
      if ((tank as any).memberships.length >= tank.maxMembers) {
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

export default router;
