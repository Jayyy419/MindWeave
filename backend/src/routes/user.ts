import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";
import { adminMiddleware } from "../middleware/adminAuth";
import { sendTrackedEmail } from "../services/email";

const router = Router();
const prisma = new PrismaClient();

const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_POLICY_ERROR =
  "New password must be at least 8 characters and include uppercase, lowercase, number, and symbol";

type PendingEmailOtp = {
  email: string;
  codeHash: string;
  expiresAt: number;
};

const pendingEmailOtps = new Map<string, PendingEmailOtp>();

function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function isStrongPassword(password: string): boolean {
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function isUsernameValid(username: string): boolean {
  return /^[A-Za-z0-9_.-]{3,24}$/.test(username);
}

async function sendEmailOtp(email: string, otp: string): Promise<void> {
  await sendTrackedEmail(
    {
      to: email,
    subject: "Your MindWeave email verification code",
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;color:#222;line-height:1.5;">
        <h2>Email verification code</h2>
        <p>Use this code to verify your new email address:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:12px 0;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
    },
    { purpose: "email-otp" }
  );
}

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
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
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

router.get("/username-available", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const username = String(req.query.username || "").trim();

  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  if (!isUsernameValid(username)) {
    res.status(400).json({ error: "username must be 3-24 chars and use letters, numbers, ., _, -" });
    return;
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        username,
        id: { not: userId },
      },
      select: { id: true },
    });
    res.json({ available: !existing });
  } catch (error) {
    console.error("Error checking username availability:", error);
    res.status(500).json({ error: "Failed to check username availability" });
  }
});

router.post("/username", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const username = String(req.body?.username || "").trim();

  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  if (!isUsernameValid(username)) {
    res.status(400).json({ error: "username must be 3-24 chars and use letters, numbers, ., _, -" });
    return;
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        username,
        id: { not: userId },
      },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username },
      select: { id: true, email: true, username: true, isAdmin: true },
    });

    res.json({
      message: "Username updated",
      user,
    });
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({ error: "Failed to update username" });
  }
});

router.post("/email-otp/send", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Please enter a valid email address" });
    return;
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        email,
        id: { not: userId },
      },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: "Email is already in use" });
      return;
    }

    const otp = String(randomInt(100000, 1000000));
    pendingEmailOtps.set(userId, {
      email,
      codeHash: hashOtpCode(otp),
      expiresAt: Date.now() + EMAIL_OTP_TTL_MS,
    });

    await sendEmailOtp(email, otp);
    res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error("Error sending email OTP:", error);
    res.status(500).json({ error: "Failed to send verification code" });
  }
});

router.post("/email-otp/verify", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const email = String(req.body?.email || "").trim().toLowerCase();
  const otp = String(req.body?.otp || "").trim();

  if (!email || !otp) {
    res.status(400).json({ error: "email and otp are required" });
    return;
  }

  const pending = pendingEmailOtps.get(userId);
  if (!pending || pending.email !== email) {
    res.status(400).json({ error: "No verification request found for this email" });
    return;
  }

  if (Date.now() > pending.expiresAt) {
    pendingEmailOtps.delete(userId);
    res.status(400).json({ error: "Verification code expired" });
    return;
  }

  if (hashOtpCode(otp) !== pending.codeHash) {
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { email },
      select: { id: true, email: true, username: true, isAdmin: true },
    });
    pendingEmailOtps.delete(userId);
    res.json({ message: "Email updated", user });
  } catch (error) {
    console.error("Error verifying email OTP:", error);
    res.status(500).json({ error: "Failed to update email" });
  }
});

router.post("/password", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const repeatNewPassword = String(req.body?.repeatNewPassword || "");

  if (!currentPassword || !newPassword || !repeatNewPassword) {
    res.status(400).json({ error: "All password fields are required" });
    return;
  }

  if (newPassword !== repeatNewPassword) {
    res.status(400).json({ error: "New password fields do not match" });
    return;
  }

  if (newPassword.length < 8 || !isStrongPassword(newPassword)) {
    res.status(400).json({ error: PASSWORD_POLICY_ERROR });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      res.status(400).json({ error: "Password change is not available for this account" });
      return;
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: "Password updated" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

router.get("/consents", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    const consents = await prisma.dataAccessConsent.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        opportunity: {
          select: {
            id: true,
            slug: true,
            title: true,
            organizerName: true,
            summary: true,
          },
        },
      },
    });

    res.json(
      consents.map((consent) => ({
        id: consent.id,
        status: consent.status,
        scopes: JSON.parse(consent.scopes),
        purposeSnapshot: consent.purposeSnapshot,
        organizerSnapshot: consent.organizerSnapshot,
        expiresAt: consent.expiresAt,
        grantedAt: consent.grantedAt,
        revokedAt: consent.revokedAt,
        opportunity: consent.opportunity,
      }))
    );
  } catch (error) {
    console.error("Error listing consents:", error);
    res.status(500).json({ error: "Failed to list consents" });
  }
});

router.post("/consents/:id/revoke", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;

  try {
    const consent = await prisma.dataAccessConsent.findFirst({
      where: { id, userId },
    });

    if (!consent) {
      res.status(404).json({ error: "Consent record not found" });
      return;
    }

    const updated = await prisma.dataAccessConsent.update({
      where: { id },
      data: {
        status: "revoked",
        revokedAt: new Date(),
      },
    });

    res.json({
      id: updated.id,
      status: updated.status,
      revokedAt: updated.revokedAt,
    });
  } catch (error) {
    console.error("Error revoking consent:", error);
    res.status(500).json({ error: "Failed to revoke consent" });
  }
});

router.get("/admin/users", adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const searchQuery = String(req.query.q || "").trim();

  try {
    const users = await prisma.user.findMany({
      where: searchQuery
        ? {
            OR: [
              { email: { contains: searchQuery, mode: "insensitive" } },
              { username: { contains: searchQuery, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ isAdmin: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        level: true,
        createdAt: true,
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    res.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        level: user.level,
        entryCount: user._count.entries,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error listing admin users:", error);
    res.status(500).json({ error: "Failed to load users" });
  }
});

router.patch("/admin/users/:id/admin", adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const currentUserId = (req as any).userId as string;
  const targetUserId = String(req.params.id);
  const isAdmin = Boolean(req.body?.isAdmin);

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        level: true,
        createdAt: true,
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (currentUserId === targetUserId && !isAdmin) {
      res.status(400).json({ error: "You cannot remove your own admin access" });
      return;
    }

    if (targetUser.isAdmin && !isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        res.status(400).json({ error: "At least one admin must remain" });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        level: true,
        createdAt: true,
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    res.json({
      message: isAdmin ? "Admin access granted" : "Admin access removed",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        isAdmin: updatedUser.isAdmin,
        level: updatedUser.level,
        entryCount: updatedUser._count.entries,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error updating admin role:", error);
    res.status(500).json({ error: "Failed to update admin access" });
  }
});

export default router;
