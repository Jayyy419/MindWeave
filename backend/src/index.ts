import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import entriesRouter from "./routes/entries";
import userRouter from "./routes/user";
import thinkTanksRouter from "./routes/thinktanks";
import opportunitiesRouter from "./routes/opportunities";
import learningRouter from "./routes/learning";
import impactRouter from "./routes/impact";
import authRouter from "./routes/auth";
import surveysRouter, { ensureBaselineSurvey } from "./routes/surveys";
import { authMiddleware } from "./middleware/auth";
import { adminMiddleware } from "./middleware/adminAuth";
import { PrismaClient } from "@prisma/client";
import { getSmtpStatus, verifySmtpConnection } from "./services/email";
import { requestLogger } from "./middleware/requestLogger";
import { createRateLimitMiddleware } from "./middleware/rateLimit";

const prisma = new PrismaClient();

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ADMIN_BOOTSTRAP_IDENTIFIER = process.env.ADMIN_BOOTSTRAP_IDENTIFIER?.trim().toLowerCase();
const ENABLE_ADMIN_BOOTSTRAP = process.env.ENABLE_ADMIN_BOOTSTRAP === "true";
const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "600000", 10);
const AUTH_LOGIN_RATE_LIMIT_MAX = parseInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || "10", 10);
const AUTH_FORGOT_RATE_LIMIT_MAX = parseInt(process.env.AUTH_FORGOT_RATE_LIMIT_MAX || "5", 10);

const allowedOrigins = CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin: cors.CorsOptions["origin"] =
  allowedOrigins.length === 1 && allowedOrigins[0] === "*"
    ? true
    : (origin, callback) => {
        // Allow non-browser requests with no Origin header.
        if (!origin) {
          callback(null, true);
          return;
        }

        callback(null, allowedOrigins.includes(origin));
      };

// Middleware
app.use(
  cors({
    origin: corsOrigin,
  })
);
app.use(express.json());
app.set("trust proxy", true);
app.use(requestLogger);

const loginRateLimiter = createRateLimitMiddleware({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  maxRequests: AUTH_LOGIN_RATE_LIMIT_MAX,
  keyPrefix: "auth-login",
});

const forgotPasswordRateLimiter = createRateLimitMiddleware({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  maxRequests: AUTH_FORGOT_RATE_LIMIT_MAX,
  keyPrefix: "auth-forgot-password",
});

// Health check (no auth required)
app.get("/", (_req, res) => {
  res.status(200).send("MindWeave backend is running");
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    smtp: getSmtpStatus(),
  });
});

// Authentication routes (no auth middleware required)
app.use("/api/auth/login", loginRateLimiter);
app.use("/api/auth/forgot-password", forgotPasswordRateLimiter);
app.use("/api/auth", authRouter);

// All API routes require anonymous user identification
app.use("/api/entries", authMiddleware, entriesRouter);
app.use("/api/user", authMiddleware, userRouter);
app.use("/api/thinktanks", authMiddleware, thinkTanksRouter);
app.use("/api/opportunities", authMiddleware, opportunitiesRouter);
app.use("/api/learning", authMiddleware, learningRouter);
app.use("/api/surveys", authMiddleware, surveysRouter);
app.use("/api/impact", authMiddleware, adminMiddleware, impactRouter);

async function ensureAdminColumn(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false`
  );
}

async function ensureSurveyTables(): Promise<void> {
  // Prisma will handle table creation, but ensure columns exist if needed
  // This is called after prisma schema changes
}

async function bootstrapInitialAdmin(): Promise<void> {
  if (!ENABLE_ADMIN_BOOTSTRAP) {
    if (ADMIN_BOOTSTRAP_IDENTIFIER) {
      console.warn(
        "ADMIN_BOOTSTRAP_IDENTIFIER is set but ENABLE_ADMIN_BOOTSTRAP is not true. Skipping admin bootstrap."
      );
    }
    return;
  }

  if (!ADMIN_BOOTSTRAP_IDENTIFIER) {
    return;
  }

  const existingAdminCount = await prisma.user.count({ where: { isAdmin: true } });
  if (existingAdminCount > 0) {
    console.log("Skipping admin bootstrap because at least one admin already exists.");
    return;
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: ADMIN_BOOTSTRAP_IDENTIFIER },
        { username: ADMIN_BOOTSTRAP_IDENTIFIER },
      ],
    },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
    },
  });

  if (!targetUser) {
    console.log(`Skipping admin bootstrap because no user matched "${ADMIN_BOOTSTRAP_IDENTIFIER}".`);
    return;
  }

  if (targetUser.isAdmin) {
    console.log(`Skipping admin bootstrap because ${ADMIN_BOOTSTRAP_IDENTIFIER} is already an admin.`);
    return;
  }

  await prisma.user.update({
    where: { id: targetUser.id },
    data: { isAdmin: true },
  });

  console.log(
    `Bootstrapped admin access for ${targetUser.username || targetUser.email || targetUser.id}.`
  );
}

async function startServer(): Promise<void> {
  try {
    await ensureAdminColumn();
    await ensureSurveyTables();
    await bootstrapInitialAdmin();
    await ensureBaselineSurvey();
    const smtpCheck = await verifySmtpConnection();
    if (!smtpCheck.ok) {
      console.warn(`SMTP verification failed: ${smtpCheck.reason}`);
    }

    app.listen(PORT, () => {
      console.log(`MindWeave backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exit(1);
  }
}

void startServer();
