import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { createHash, randomBytes } from "crypto";
import nodemailer from "nodemailer";

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "mindweave-dev-secret";
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

type AuthBody = {
  email?: string;
  username?: string;
  password?: string;
  token?: string;
};

const PASSWORD_POLICY_ERROR =
  "password must be at least 8 characters and include uppercase, lowercase, number, and symbol";

function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isStrongPassword(password: string): boolean {
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "MindWeave <no-reply@mindweave.app>";

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Reset your MindWeave password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;line-height:1.5;color:#222;">
        <h2 style="margin-bottom:8px;">Reset your password</h2>
        <p>You requested a password reset for your MindWeave account.</p>
        <p>This link expires in 1 hour.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#1f7a8c;color:#fff;text-decoration:none;border-radius:8px;">Reset Password</a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `Reset your MindWeave password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const { email, username, password } = req.body as AuthBody;

  if (!email || !username || !password) {
    res.status(400).json({ error: "email, username, and password are required" });
    return;
  }

  if (password.length < 8 || !isStrongPassword(password)) {
    res.status(400).json({ error: PASSWORD_POLICY_ERROR });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  try {
    const existingByEmail = await prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (existingByEmail) {
      res.status(409).json({ error: "Email is already registered" });
      return;
    }

    const existingByUsername = await prisma.user.findFirst({ where: { username: normalizedUsername } });
    if (existingByUsername) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
        anonymousId: `acct-${randomUUID()}`,
      },
    });

    const token = createToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Failed to register" });
  }
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as AuthBody;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user?.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = createToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

router.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as AuthBody;

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    // Do not reveal whether the email exists.
    if (!user?.email) {
      res.json({ message: "If an account exists, a reset link has been sent." });
      return;
    }

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${FRONTEND_BASE_URL.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body as AuthBody;

  if (!token || !password) {
    res.status(400).json({ error: "token and password are required" });
    return;
  }

  if (password.length < 8 || !isStrongPassword(password)) {
    res.status(400).json({ error: PASSWORD_POLICY_ERROR });
    return;
  }

  try {
    const tokenHash = hashResetToken(token);
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    });

    if (!resetToken) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
        },
      }),
    ]);

    res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

router.get("/username-available", async (req: Request, res: Response): Promise<void> => {
  const rawUsername = String(req.query.username || "").trim();

  if (!rawUsername) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(rawUsername)) {
    res.status(400).json({ error: "username must be 3-24 chars and use letters, numbers, ., _, -" });
    return;
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { username: rawUsername },
      select: { id: true },
    });
    res.json({ available: !existing });
  } catch (error) {
    console.error("Username availability check error:", error);
    res.status(500).json({ error: "Failed to check username availability" });
  }
});

export default router;
