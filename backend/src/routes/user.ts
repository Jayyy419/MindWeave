import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/user/profile
 * Returns the current user's profile: level, badges, tags, and entry count.
 */
router.get("/profile", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const entryCount = await prisma.entry.count({ where: { userId } });

    res.json({
      level: user.level,
      badges: JSON.parse(user.badges),
      tags: JSON.parse(user.tags),
      entryCount,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
