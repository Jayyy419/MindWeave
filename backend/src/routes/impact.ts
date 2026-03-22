import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { assignAbVariant, ensureGovernanceTables } from "../services/governance";

const router = Router();
const prisma = new PrismaClient();

let ensureImpactTablesPromise: Promise<void> | null = null;

const ASEAN_EVIDENCE = [
  {
    id: "asean-youth-stress",
    title: "Rising youth stress and anxiety in ASEAN",
    detail:
      "Regional youth studies consistently report increased stress, burnout, and emotional strain among students and early-career youth.",
    sourceLabel: "ASEAN youth wellbeing reports",
  },
  {
    id: "asean-access-gap",
    title: "Support access remains uneven",
    detail:
      "Many communities still face barriers such as cost, stigma, and low awareness of practical mental wellness support.",
    sourceLabel: "Public health and NGO observations",
  },
  {
    id: "asean-digital-opportunity",
    title: "Digital-first support can close coverage gaps",
    detail:
      "Mobile-first, low-friction tools provide a scalable path to early support and AI awareness in underserved groups.",
    sourceLabel: "Digital health implementation patterns",
  },
];

const BENEFICIARY_GROUPS = [
  "secondary-students",
  "polytechnic-students",
  "university-students",
  "early-career-youth",
  "community-youth",
] as const;

const BASE_FRONTEND_URL =
  process.env.FRONTEND_BASE_URL?.trim() || "https://d1n2io4499e5zf.cloudfront.net";

type BeneficiaryGroup = (typeof BENEFICIARY_GROUPS)[number];

type AbVariantInput = {
  key: string;
  weight?: number;
  message?: string;
};

const ALLOWED_ADMIN_SCOPES = [
  "impact.read",
  "impact.write",
  "impact.export",
  "campaign.manage",
  "governance.manage",
] as const;

function parseScore(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function createShareToken(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function hasAdminScope(req: Request, scope: (typeof ALLOWED_ADMIN_SCOPES)[number]): boolean {
  if ((req as any).isAdmin) return true;
  const scopes = ((req as any).adminScopes as string[] | undefined) || [];
  return scopes.includes(scope);
}

function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const escape = (value: string | number | null): string => {
    if (value === null || value === undefined) return "";
    const raw = String(value);
    if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}

function normalizeAbVariants(input: unknown): Array<{ key: string; weight: number; message?: string }> {
  if (!Array.isArray(input)) {
    return [{ key: "control", weight: 100 }];
  }

  const variants = input
    .filter((item): item is AbVariantInput => typeof item === "object" && item !== null)
    .map((item) => ({
      key: String(item.key || "").trim(),
      weight: Math.max(1, Math.round(Number(item.weight || 1))),
      message: typeof item.message === "string" && item.message.trim().length > 0 ? item.message.trim() : undefined,
    }))
    .filter((item) => item.key.length > 0);

  return variants.length > 0 ? variants : [{ key: "control", weight: 100 }];
}

async function ensureImpactTables(): Promise<void> {
  if (!ensureImpactTablesPromise) {
    ensureImpactTablesPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UserImpactProfile" (
          "userId" TEXT NOT NULL,
          "beneficiaryGroup" TEXT NOT NULL DEFAULT 'university-students',
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "UserImpactProfile_pkey" PRIMARY KEY ("userId"),
          CONSTRAINT "UserImpactProfile_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UserOutcomeSurvey" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "surveyType" TEXT NOT NULL,
          "stressScore" INTEGER NOT NULL,
          "copingConfidenceScore" INTEGER NOT NULL,
          "helpSeekingConfidenceScore" INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "UserOutcomeSurvey_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "UserOutcomeSurvey_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "UserOutcomeSurvey_userId_surveyType_idx"
        ON "UserOutcomeSurvey"("userId", "surveyType")
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OutreachCampaign" (
          "id" TEXT NOT NULL,
          "ownerUserId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "channel" TEXT NOT NULL,
          "targetReach" INTEGER NOT NULL,
          "currentReach" INTEGER NOT NULL DEFAULT 0,
          "status" TEXT NOT NULL DEFAULT 'active',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "OutreachCampaign_ownerUserId_fkey"
            FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "OutreachCampaign_ownerUserId_idx"
        ON "OutreachCampaign"("ownerUserId")
      `);

      await prisma.$executeRawUnsafe(
        `ALTER TABLE "OutreachCampaign" ADD COLUMN IF NOT EXISTS "qrToken" TEXT`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "OutreachCampaign" ADD COLUMN IF NOT EXISTS "referralCode" TEXT`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "OutreachCampaign" ADD COLUMN IF NOT EXISTS "funnelImpressions" INTEGER NOT NULL DEFAULT 0`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "OutreachCampaign" ADD COLUMN IF NOT EXISTS "funnelScans" INTEGER NOT NULL DEFAULT 0`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "OutreachCampaign" ADD COLUMN IF NOT EXISTS "funnelSignups" INTEGER NOT NULL DEFAULT 0`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "OutreachCampaign" ADD COLUMN IF NOT EXISTS "funnelActiveUsers" INTEGER NOT NULL DEFAULT 0`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "OutreachCampaign" ADD COLUMN IF NOT EXISTS "funnelCompletions" INTEGER NOT NULL DEFAULT 0`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "OutreachCampaign_qrToken_key" ON "OutreachCampaign"("qrToken")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "OutreachCampaign_referralCode_key" ON "OutreachCampaign"("referralCode")`
      );

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LearningAssessmentEvent" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "frameworkId" TEXT NOT NULL,
          "lessonId" TEXT NOT NULL,
          "source" TEXT NOT NULL,
          "score" INTEGER NOT NULL,
          "passed" BOOLEAN NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "LearningAssessmentEvent_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "LearningAssessmentEvent_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "LearningAssessmentEvent_createdAt_idx"
        ON "LearningAssessmentEvent"("createdAt")
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OutreachTouchpoint" (
          "id" TEXT NOT NULL,
          "campaignId" TEXT NOT NULL,
          "participantCount" INTEGER NOT NULL,
          "sourceNote" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "OutreachTouchpoint_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "OutreachTouchpoint_campaignId_fkey"
            FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "OutreachTouchpoint_campaignId_idx"
        ON "OutreachTouchpoint"("campaignId")
      `);
    })().catch((error) => {
      ensureImpactTablesPromise = null;
      throw error;
    });
  }

  await ensureImpactTablesPromise;
}

router.get("/asean-evidence", (_req: Request, res: Response) => {
  res.json({ evidence: ASEAN_EVIDENCE });
});

router.get("/beneficiary-groups", (_req: Request, res: Response) => {
  res.json({ groups: BENEFICIARY_GROUPS });
});

router.get("/profile", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    await ensureImpactTables();

    const profileRows = (await prisma.$queryRawUnsafe(
      `SELECT "userId", "beneficiaryGroup", "updatedAt" FROM "UserImpactProfile" WHERE "userId" = $1`,
      userId
    )) as Array<{ userId: string; beneficiaryGroup: string; updatedAt: Date }>;

    if (profileRows.length === 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "UserImpactProfile"("userId", "beneficiaryGroup") VALUES ($1, 'university-students')`,
        userId
      );
    }

    const baselineRows = (await prisma.$queryRawUnsafe(
      `SELECT "id", "surveyType", "stressScore", "copingConfidenceScore", "helpSeekingConfidenceScore", "createdAt"
       FROM "UserOutcomeSurvey" WHERE "userId" = $1 AND "surveyType" = 'baseline'
       ORDER BY "createdAt" DESC LIMIT 1`,
      userId
    )) as Array<{
      id: string;
      surveyType: string;
      stressScore: number;
      copingConfidenceScore: number;
      helpSeekingConfidenceScore: number;
      createdAt: Date;
    }>;

    const followUpRows = (await prisma.$queryRawUnsafe(
      `SELECT "id", "surveyType", "stressScore", "copingConfidenceScore", "helpSeekingConfidenceScore", "createdAt"
       FROM "UserOutcomeSurvey" WHERE "userId" = $1 AND "surveyType" <> 'baseline'
       ORDER BY "createdAt" DESC LIMIT 3`,
      userId
    )) as Array<{
      id: string;
      surveyType: string;
      stressScore: number;
      copingConfidenceScore: number;
      helpSeekingConfidenceScore: number;
      createdAt: Date;
    }>;

    const updatedProfileRows = (await prisma.$queryRawUnsafe(
      `SELECT "userId", "beneficiaryGroup", "updatedAt" FROM "UserImpactProfile" WHERE "userId" = $1`,
      userId
    )) as Array<{ userId: string; beneficiaryGroup: string; updatedAt: Date }>;

    const profile = updatedProfileRows[0];

    res.json({
      beneficiaryGroup: profile?.beneficiaryGroup ?? "university-students",
      updatedAt: profile?.updatedAt ?? null,
      baselineSurvey: baselineRows[0] ?? null,
      followUpSurveys: followUpRows,
    });
  } catch (error) {
    console.error("Error loading impact profile:", error);
    res.status(500).json({ error: "Failed to load impact profile" });
  }
});

router.put("/profile", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const beneficiaryGroup = String(req.body?.beneficiaryGroup || "").trim() as BeneficiaryGroup;

  if (!BENEFICIARY_GROUPS.includes(beneficiaryGroup)) {
    res.status(400).json({ error: "Invalid beneficiary group" });
    return;
  }

  try {
    await ensureImpactTables();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "UserImpactProfile"("userId", "beneficiaryGroup", "updatedAt")
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT ("userId")
       DO UPDATE SET "beneficiaryGroup" = EXCLUDED."beneficiaryGroup", "updatedAt" = CURRENT_TIMESTAMP`,
      userId,
      beneficiaryGroup
    );

    res.json({ message: "Beneficiary profile updated", beneficiaryGroup });
  } catch (error) {
    console.error("Error updating beneficiary group:", error);
    res.status(500).json({ error: "Failed to update beneficiary group" });
  }
});

router.post("/survey", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const surveyTypeRaw = String(req.body?.surveyType || "").trim();
  const surveyType =
    surveyTypeRaw === "baseline" || surveyTypeRaw === "day7" || surveyTypeRaw === "day14" || surveyTypeRaw === "day30"
      ? surveyTypeRaw
      : "";

  if (!surveyType) {
    res.status(400).json({ error: "surveyType must be one of baseline/day7/day14/day30" });
    return;
  }

  const stressScore = parseScore(req.body?.stressScore);
  const copingConfidenceScore = parseScore(req.body?.copingConfidenceScore);
  const helpSeekingConfidenceScore = parseScore(req.body?.helpSeekingConfidenceScore);

  try {
    await ensureImpactTables();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "UserOutcomeSurvey"("id", "userId", "surveyType", "stressScore", "copingConfidenceScore", "helpSeekingConfidenceScore")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      randomUUID(),
      userId,
      surveyType,
      stressScore,
      copingConfidenceScore,
      helpSeekingConfidenceScore
    );

    res.json({
      message: "Survey saved",
      surveyType,
      stressScore,
      copingConfidenceScore,
      helpSeekingConfidenceScore,
    });
  } catch (error) {
    console.error("Error saving survey:", error);
    res.status(500).json({ error: "Failed to save survey" });
  }
});

router.get("/campaigns", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    await ensureImpactTables();

    const campaigns = (await prisma.$queryRawUnsafe(
      `SELECT "id", "name", "channel", "targetReach", "currentReach", "status", "createdAt", "updatedAt",
              COALESCE("qrToken", '') AS "qrToken",
              COALESCE("referralCode", '') AS "referralCode",
              "funnelImpressions", "funnelScans", "funnelSignups", "funnelActiveUsers", "funnelCompletions"
       FROM "OutreachCampaign"
       WHERE "ownerUserId" = $1
       ORDER BY "updatedAt" DESC`,
      userId
    )) as Array<{
      id: string;
      name: string;
      channel: string;
      targetReach: number;
      currentReach: number;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      qrToken: string;
      referralCode: string;
      funnelImpressions: number;
      funnelScans: number;
      funnelSignups: number;
      funnelActiveUsers: number;
      funnelCompletions: number;
    }>;

    res.json({
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        qrUrl: `${BASE_FRONTEND_URL}/auth?campaign=${encodeURIComponent(campaign.qrToken)}`,
        referralUrl: `${BASE_FRONTEND_URL}/auth?ref=${encodeURIComponent(campaign.referralCode)}`,
      })),
    });
  } catch (error) {
    console.error("Error listing campaigns:", error);
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

router.post("/campaigns", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const name = String(req.body?.name || "").trim();
  const channel = String(req.body?.channel || "").trim();
  const targetReach = Math.max(1, Math.round(Number(req.body?.targetReach || 0)));

  if (!name || !channel) {
    res.status(400).json({ error: "name and channel are required" });
    return;
  }

  try {
    await ensureImpactTables();

    const id = randomUUID();
    const qrToken = createShareToken("qr");
    const referralCode = createShareToken("ref");

    await prisma.$executeRawUnsafe(
      `INSERT INTO "OutreachCampaign"(
         "id", "ownerUserId", "name", "channel", "targetReach", "currentReach", "status", "qrToken", "referralCode",
         "funnelImpressions", "funnelScans", "funnelSignups", "funnelActiveUsers", "funnelCompletions"
       )
       VALUES ($1, $2, $3, $4, $5, 0, 'active', $6, $7, 0, 0, 0, 0, 0)`,
      id,
      userId,
      name,
      channel,
      targetReach,
      qrToken,
      referralCode
    );

    res.status(201).json({
      id,
      name,
      channel,
      targetReach,
      currentReach: 0,
      status: "active",
      qrToken,
      referralCode,
      qrUrl: `${BASE_FRONTEND_URL}/auth?campaign=${encodeURIComponent(qrToken)}`,
      referralUrl: `${BASE_FRONTEND_URL}/auth?ref=${encodeURIComponent(referralCode)}`,
      funnelImpressions: 0,
      funnelScans: 0,
      funnelSignups: 0,
      funnelActiveUsers: 0,
      funnelCompletions: 0,
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.post("/campaigns/:id/touchpoints", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const campaignId = req.params.id;
  const participantCount = Math.max(1, Math.round(Number(req.body?.participantCount || 0)));
  const sourceNote = String(req.body?.sourceNote || "Manual update").trim();

  try {
    await ensureImpactTables();

    const campaignRows = (await prisma.$queryRawUnsafe(
      `SELECT "id", "currentReach" FROM "OutreachCampaign" WHERE "id" = $1 AND "ownerUserId" = $2`,
      campaignId,
      userId
    )) as Array<{ id: string; currentReach: number }>;

    if (campaignRows.length === 0) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "OutreachTouchpoint"("id", "campaignId", "participantCount", "sourceNote") VALUES ($1, $2, $3, $4)`,
      randomUUID(),
      campaignId,
      participantCount,
      sourceNote
    );

    await prisma.$executeRawUnsafe(
      `UPDATE "OutreachCampaign"
       SET "currentReach" = "currentReach" + $1,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $2`,
      participantCount,
      campaignId
    );

    res.json({ message: "Touchpoint recorded", participantCount });
  } catch (error) {
    console.error("Error adding touchpoint:", error);
    res.status(500).json({ error: "Failed to add touchpoint" });
  }
});

router.post("/campaigns/:id/funnel", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const campaignId = req.params.id;
  const stage = String(req.body?.stage || "").trim();
  const count = Math.max(1, Math.round(Number(req.body?.count || 1)));

  const stageColumnMap: Record<string, string> = {
    impressions: "funnelImpressions",
    scans: "funnelScans",
    signups: "funnelSignups",
    activeUsers: "funnelActiveUsers",
    completions: "funnelCompletions",
  };

  const stageColumn = stageColumnMap[stage];
  if (!stageColumn) {
    res.status(400).json({ error: "stage must be one of impressions/scans/signups/activeUsers/completions" });
    return;
  }

  try {
    await ensureImpactTables();

    const campaignRows = (await prisma.$queryRawUnsafe(
      `SELECT "id" FROM "OutreachCampaign" WHERE "id" = $1 AND "ownerUserId" = $2`,
      campaignId,
      userId
    )) as Array<{ id: string }>;

    if (campaignRows.length === 0) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "OutreachCampaign"
       SET "${stageColumn}" = "${stageColumn}" + $1,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $2`,
      count,
      campaignId
    );

    res.json({ message: "Funnel metric updated", stage, count });
  } catch (error) {
    console.error("Error updating campaign funnel:", error);
    res.status(500).json({ error: "Failed to update funnel metric" });
  }
});

router.get("/follow-up-reminders", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    await ensureImpactTables();

    const surveyRows = (await prisma.$queryRawUnsafe(
      `SELECT "surveyType", "createdAt"
       FROM "UserOutcomeSurvey"
       WHERE "userId" = $1
       ORDER BY "createdAt" ASC`,
      userId
    )) as Array<{ surveyType: string; createdAt: Date }>;

    const baseline = surveyRows.find((row) => row.surveyType === "baseline");
    if (!baseline) {
      res.json({ baselineCompleted: false, due: [] });
      return;
    }

    const completedFollowUps = new Set(
      surveyRows.filter((row) => row.surveyType !== "baseline").map((row) => row.surveyType)
    );

    const now = new Date();
    const dayOffsets: Array<{ type: "day7" | "day14" | "day30"; day: number }> = [
      { type: "day7", day: 7 },
      { type: "day14", day: 14 },
      { type: "day30", day: 30 },
    ];

    const due = dayOffsets
      .map((item) => {
        const dueDate = new Date(baseline.createdAt);
        dueDate.setDate(dueDate.getDate() + item.day);
        return {
          surveyType: item.type,
          dueDate,
          completed: completedFollowUps.has(item.type),
          isDue: now >= dueDate,
        };
      })
      .filter((item) => item.isDue && !item.completed)
      .map((item) => ({
        surveyType: item.surveyType,
        dueDate: item.dueDate,
      }));

    res.json({
      baselineCompleted: true,
      baselineDate: baseline.createdAt,
      due,
    });
  } catch (error) {
    console.error("Error loading follow-up reminders:", error);
    res.status(500).json({ error: "Failed to load follow-up reminders" });
  }
});

router.get("/learning-effectiveness", async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureImpactTables();

    const lessonAssessment = (await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*)::INT AS "attempts",
         COALESCE(AVG("score"), 0)::FLOAT AS "averageScore",
         COALESCE(AVG(CASE WHEN "passed" THEN 1 ELSE 0 END), 0)::FLOAT AS "passRate"
       FROM "LearningAssessmentEvent"`
    )) as Array<{ attempts: number; averageScore: number; passRate: number }>;

    const surveyDeltaRows = (await prisma.$queryRawUnsafe(
      `WITH baseline AS (
         SELECT "userId", "stressScore", "copingConfidenceScore", "helpSeekingConfidenceScore"
         FROM "UserOutcomeSurvey"
         WHERE "surveyType" = 'baseline'
       ),
       followup AS (
         SELECT DISTINCT ON ("userId")
           "userId", "stressScore", "copingConfidenceScore", "helpSeekingConfidenceScore", "createdAt"
         FROM "UserOutcomeSurvey"
         WHERE "surveyType" <> 'baseline'
         ORDER BY "userId", "createdAt" DESC
       ),
       lesson_users AS (
         SELECT DISTINCT "userId" FROM "LearningAssessmentEvent" WHERE "passed" = true
       )
       SELECT
         COUNT(*)::INT AS "pairedUsers",
         COALESCE(AVG(b."stressScore" - f."stressScore"), 0)::FLOAT AS "stressDelta",
         COALESCE(AVG(f."copingConfidenceScore" - b."copingConfidenceScore"), 0)::FLOAT AS "copingDelta",
         COALESCE(AVG(f."helpSeekingConfidenceScore" - b."helpSeekingConfidenceScore"), 0)::FLOAT AS "helpSeekingDelta",
         COALESCE(AVG(CASE WHEN l."userId" IS NULL THEN 0 ELSE 1 END), 0)::FLOAT AS "lessonCompletionShare"
       FROM baseline b
       INNER JOIN followup f ON f."userId" = b."userId"
       LEFT JOIN lesson_users l ON l."userId" = b."userId"`
    )) as Array<{
      pairedUsers: number;
      stressDelta: number;
      copingDelta: number;
      helpSeekingDelta: number;
      lessonCompletionShare: number;
    }>;

    const assessment = lessonAssessment[0] ?? { attempts: 0, averageScore: 0, passRate: 0 };
    const outcomes = surveyDeltaRows[0] ?? {
      pairedUsers: 0,
      stressDelta: 0,
      copingDelta: 0,
      helpSeekingDelta: 0,
      lessonCompletionShare: 0,
    };

    res.json({
      attempts: assessment.attempts,
      averageScore: Math.round(assessment.averageScore * 10) / 10,
      passRatePercent: Math.round(assessment.passRate * 100),
      pairedUsers: outcomes.pairedUsers,
      stressDelta: Math.round(outcomes.stressDelta * 10) / 10,
      copingDelta: Math.round(outcomes.copingDelta * 10) / 10,
      helpSeekingDelta: Math.round(outcomes.helpSeekingDelta * 10) / 10,
      lessonCompletionSharePercent: Math.round(outcomes.lessonCompletionShare * 100),
    });
  } catch (error) {
    console.error("Error loading learning effectiveness metrics:", error);
    res.status(500).json({ error: "Failed to load learning effectiveness metrics" });
  }
});

router.get("/dashboard", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    await ensureImpactTables();

    const entryCount = await prisma.entry.count({ where: { userId } });
    const lessonCountRows = (await prisma
      .$queryRawUnsafe(
        `SELECT COUNT(*)::INT AS "count" FROM "LearningLessonProgress" WHERE "userId" = $1`,
        userId
      )
      .catch(() => [{ count: 0 }])) as Array<{ count: number }>;
    const lessonCount = Number(lessonCountRows[0]?.count || 0);

    const surveyRows = (await prisma.$queryRawUnsafe(
      `SELECT "surveyType", "stressScore", "copingConfidenceScore", "helpSeekingConfidenceScore", "createdAt"
       FROM "UserOutcomeSurvey" WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      userId
    )) as Array<{
      surveyType: string;
      stressScore: number;
      copingConfidenceScore: number;
      helpSeekingConfidenceScore: number;
      createdAt: Date;
    }>;

    const baseline = surveyRows.find((item) => item.surveyType === "baseline") ?? null;
    const latestFollowUp = surveyRows.find((item) => item.surveyType !== "baseline") ?? null;

    const campaigns = (await prisma.$queryRawUnsafe(
      `SELECT
         COALESCE(SUM("targetReach"), 0) AS "targetReach",
         COALESCE(SUM("currentReach"), 0) AS "currentReach",
         COALESCE(SUM("funnelImpressions"), 0) AS "funnelImpressions",
         COALESCE(SUM("funnelScans"), 0) AS "funnelScans",
         COALESCE(SUM("funnelSignups"), 0) AS "funnelSignups",
         COALESCE(SUM("funnelActiveUsers"), 0) AS "funnelActiveUsers",
         COALESCE(SUM("funnelCompletions"), 0) AS "funnelCompletions"
       FROM "OutreachCampaign" WHERE "ownerUserId" = $1`,
      userId
    )) as Array<{
      targetReach: number;
      currentReach: number;
      funnelImpressions: number;
      funnelScans: number;
      funnelSignups: number;
      funnelActiveUsers: number;
      funnelCompletions: number;
    }>;

    const campaignAgg = campaigns[0] ?? {
      targetReach: 0,
      currentReach: 0,
      funnelImpressions: 0,
      funnelScans: 0,
      funnelSignups: 0,
      funnelActiveUsers: 0,
      funnelCompletions: 0,
    };

    const stressDelta = baseline && latestFollowUp ? baseline.stressScore - latestFollowUp.stressScore : null;
    const copingDelta = baseline && latestFollowUp ? latestFollowUp.copingConfidenceScore - baseline.copingConfidenceScore : null;
    const helpSeekingDelta =
      baseline && latestFollowUp ? latestFollowUp.helpSeekingConfidenceScore - baseline.helpSeekingConfidenceScore : null;

    res.json({
      totals: {
        entries: entryCount,
        completedLessons: lessonCount,
        targetReach: Number(campaignAgg.targetReach) || 0,
        currentReach: Number(campaignAgg.currentReach) || 0,
      },
      survey: {
        baseline,
        latestFollowUp,
        stressDelta,
        copingDelta,
        helpSeekingDelta,
      },
      funnel: {
        impressions: Number(campaignAgg.funnelImpressions) || 0,
        scans: Number(campaignAgg.funnelScans) || 0,
        signups: Number(campaignAgg.funnelSignups) || 0,
        activeUsers: Number(campaignAgg.funnelActiveUsers) || 0,
        completions: Number(campaignAgg.funnelCompletions) || 0,
      },
      campaignProgressPercent:
        Number(campaignAgg.targetReach) > 0
          ? Math.min(100, Math.round((Number(campaignAgg.currentReach) / Number(campaignAgg.targetReach)) * 100))
          : 0,
    });
  } catch (error) {
    console.error("Error loading impact dashboard:", error);
    res.status(500).json({ error: "Failed to load impact dashboard" });
  }
});

router.get("/rbac/roles", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "governance.manage")) {
    res.status(403).json({ error: "Missing scope: governance.manage" });
    return;
  }

  try {
    await ensureGovernanceTables();

    const roles = (await prisma.$queryRawUnsafe(
      `SELECT r."id", r."userId", r."role", r."scope", r."assignedByUserId", r."createdAt", r."updatedAt",
              u."email", u."username"
       FROM "AdminRoleAssignment" r
       LEFT JOIN "User" u ON u."id" = r."userId"
       ORDER BY r."createdAt" DESC`
    )) as Array<{
      id: string;
      userId: string;
      role: string;
      scope: string;
      assignedByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
      email: string | null;
      username: string | null;
    }>;

    res.json({ roles });
  } catch (error) {
    console.error("Error listing RBAC roles:", error);
    res.status(500).json({ error: "Failed to list RBAC roles" });
  }
});

router.post("/rbac/roles", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "governance.manage")) {
    res.status(403).json({ error: "Missing scope: governance.manage" });
    return;
  }

  const actorUserId = (req as any).userId as string;
  const userId = String(req.body?.userId || "").trim();
  const role = String(req.body?.role || "").trim().toLowerCase();
  const scope = String(req.body?.scope || "").trim().toLowerCase();

  if (!userId || !role || !scope) {
    res.status(400).json({ error: "userId, role, and scope are required" });
    return;
  }

  if (!(ALLOWED_ADMIN_SCOPES as readonly string[]).includes(scope)) {
    res.status(400).json({ error: `scope must be one of: ${ALLOWED_ADMIN_SCOPES.join(", ")}` });
    return;
  }

  try {
    await ensureGovernanceTables();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdminRoleAssignment"("id", "userId", "role", "scope", "assignedByUserId")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("userId", "role", "scope") DO UPDATE
       SET "updatedAt" = CURRENT_TIMESTAMP,
           "assignedByUserId" = EXCLUDED."assignedByUserId"`,
      randomUUID(),
      userId,
      role,
      scope,
      actorUserId
    );

    res.status(201).json({ message: "Role assignment upserted", userId, role, scope });
  } catch (error) {
    console.error("Error assigning RBAC role:", error);
    res.status(500).json({ error: "Failed to assign RBAC role" });
  }
});

router.get("/ab-tests", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "impact.read")) {
    res.status(403).json({ error: "Missing scope: impact.read" });
    return;
  }

  try {
    await ensureGovernanceTables();

    const experiments = (await prisma.$queryRawUnsafe(
      `SELECT "id", "name", "channel", "status", "variantsJson", "createdByUserId", "createdAt", "updatedAt"
       FROM "AbTestExperiment"
       ORDER BY "createdAt" DESC`
    )) as Array<{
      id: string;
      name: string;
      channel: string;
      status: string;
      variantsJson: string;
      createdByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;

    res.json({
      experiments: experiments.map((experiment) => ({
        ...experiment,
        variants: JSON.parse(experiment.variantsJson),
      })),
    });
  } catch (error) {
    console.error("Error listing A/B tests:", error);
    res.status(500).json({ error: "Failed to list A/B tests" });
  }
});

router.post("/ab-tests", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "impact.write")) {
    res.status(403).json({ error: "Missing scope: impact.write" });
    return;
  }

  const userId = (req as any).userId as string;
  const name = String(req.body?.name || "").trim();
  const channel = String(req.body?.channel || "").trim();
  const status = String(req.body?.status || "active").trim().toLowerCase();
  const variants = normalizeAbVariants(req.body?.variants);

  if (!name || !channel) {
    res.status(400).json({ error: "name and channel are required" });
    return;
  }

  if (status !== "active" && status !== "paused" && status !== "completed") {
    res.status(400).json({ error: "status must be one of active/paused/completed" });
    return;
  }

  try {
    await ensureGovernanceTables();

    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AbTestExperiment"(
        "id", "name", "channel", "status", "variantsJson", "createdByUserId"
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      id,
      name,
      channel,
      status,
      JSON.stringify(variants),
      userId
    );

    res.status(201).json({ id, name, channel, status, variants });
  } catch (error) {
    console.error("Error creating A/B test:", error);
    res.status(500).json({ error: "Failed to create A/B test" });
  }
});

router.post("/ab-tests/:id/assign", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "campaign.manage")) {
    res.status(403).json({ error: "Missing scope: campaign.manage" });
    return;
  }

  const experimentId = String(req.params.id || "").trim();
  const subjectKey = String(req.body?.subjectKey || "").trim();

  if (!subjectKey) {
    res.status(400).json({ error: "subjectKey is required" });
    return;
  }

  try {
    const assignment = await assignAbVariant({ experimentId, subjectKey });
    res.json({
      experimentId,
      variant: assignment.variant,
      assignmentId: assignment.assignmentId,
      isNew: assignment.isNew,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EXPERIMENT_NOT_FOUND") {
      res.status(404).json({ error: "Experiment not found" });
      return;
    }
    if (error instanceof Error && error.message === "EXPERIMENT_NOT_ACTIVE") {
      res.status(409).json({ error: "Experiment is not active" });
      return;
    }

    console.error("Error assigning A/B variant:", error);
    res.status(500).json({ error: "Failed to assign variant" });
  }
});

router.get("/ab-tests/:id/summary", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "impact.read")) {
    res.status(403).json({ error: "Missing scope: impact.read" });
    return;
  }

  const experimentId = req.params.id;

  try {
    await ensureGovernanceTables();

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "variantKey", COUNT(*)::INT AS "assignmentCount", COALESCE(SUM("exposureCount"), 0)::INT AS "exposureCount"
       FROM "AbTestAssignment"
       WHERE "experimentId" = $1
       GROUP BY "variantKey"
       ORDER BY "variantKey" ASC`,
      experimentId
    )) as Array<{ variantKey: string; assignmentCount: number; exposureCount: number }>;

    const totals = rows.reduce(
      (acc, row) => ({ assignments: acc.assignments + row.assignmentCount, exposures: acc.exposures + row.exposureCount }),
      { assignments: 0, exposures: 0 }
    );

    res.json({
      experimentId,
      totals,
      variants: rows,
    });
  } catch (error) {
    console.error("Error loading A/B test summary:", error);
    res.status(500).json({ error: "Failed to load A/B test summary" });
  }
});

router.get("/ai-audit-summary", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "governance.manage")) {
    res.status(403).json({ error: "Missing scope: governance.manage" });
    return;
  }

  try {
    await ensureGovernanceTables();

    const totalsRows = (await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*)::INT AS "totalCalls",
         COALESCE(SUM(CASE WHEN "success" THEN 1 ELSE 0 END), 0)::INT AS "successCalls",
         COALESCE(SUM(CASE WHEN "moderationOutcome" = 'flagged' THEN 1 ELSE 0 END), 0)::INT AS "flaggedCalls",
         COALESCE(SUM("estimatedInputTokens" + "estimatedOutputTokens"), 0)::INT AS "totalEstimatedTokens"
       FROM "AiAuditLog"`
    )) as Array<{
      totalCalls: number;
      successCalls: number;
      flaggedCalls: number;
      totalEstimatedTokens: number;
    }>;

    const byRouteRows = (await prisma.$queryRawUnsafe(
      `SELECT "route", COUNT(*)::INT AS "count",
              COALESCE(SUM(CASE WHEN "success" THEN 1 ELSE 0 END), 0)::INT AS "successCount"
       FROM "AiAuditLog"
       GROUP BY "route"
       ORDER BY "count" DESC`
    )) as Array<{ route: string; count: number; successCount: number }>;

    res.json({
      totals: totalsRows[0] || {
        totalCalls: 0,
        successCalls: 0,
        flaggedCalls: 0,
        totalEstimatedTokens: 0,
      },
      byRoute: byRouteRows,
    });
  } catch (error) {
    console.error("Error loading AI audit summary:", error);
    res.status(500).json({ error: "Failed to load AI audit summary" });
  }
});

router.get("/cost-monitoring", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "governance.manage")) {
    res.status(403).json({ error: "Missing scope: governance.manage" });
    return;
  }

  try {
    await ensureGovernanceTables();

    const totalRows = (await prisma.$queryRawUnsafe(
      `SELECT
         COALESCE(SUM("estimatedCostUsd"), 0)::FLOAT AS "totalCostUsd",
         COALESCE(SUM("estimatedInputTokens"), 0)::INT AS "totalInputTokens",
         COALESCE(SUM("estimatedOutputTokens"), 0)::INT AS "totalOutputTokens"
       FROM "ApiCostLedger"`
    )) as Array<{ totalCostUsd: number; totalInputTokens: number; totalOutputTokens: number }>;

    const monthlyRows = (await prisma.$queryRawUnsafe(
      `SELECT
         DATE_TRUNC('month', "createdAt") AS "month",
         COALESCE(SUM("estimatedCostUsd"), 0)::FLOAT AS "costUsd"
       FROM "ApiCostLedger"
       GROUP BY DATE_TRUNC('month', "createdAt")
       ORDER BY "month" DESC
       LIMIT 6`
    )) as Array<{ month: Date; costUsd: number }>;

    const byCategoryRows = (await prisma.$queryRawUnsafe(
      `SELECT "category", COALESCE(SUM("estimatedCostUsd"), 0)::FLOAT AS "costUsd"
       FROM "ApiCostLedger"
       GROUP BY "category"
       ORDER BY "costUsd" DESC`
    )) as Array<{ category: string; costUsd: number }>;

    const activeUsersRows = (await prisma.$queryRawUnsafe(
      `WITH active_entries AS (
         SELECT DISTINCT "userId" FROM "Entry" WHERE "createdAt" >= NOW() - INTERVAL '30 days'
       ),
       active_messages AS (
         SELECT DISTINCT "userId" FROM "Message" WHERE "createdAt" >= NOW() - INTERVAL '30 days' AND "userId" IS NOT NULL
       ),
       active_union AS (
         SELECT "userId" FROM active_entries
         UNION
         SELECT "userId" FROM active_messages
       )
       SELECT COUNT(*)::INT AS "activeUsers30d" FROM active_union`
    )) as Array<{ activeUsers30d: number }>;

    const totals = totalRows[0] || { totalCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0 };
    const activeUsers30d = activeUsersRows[0]?.activeUsers30d || 0;

    res.json({
      totals: {
        ...totals,
        costPerActiveUser30d: activeUsers30d > 0 ? totals.totalCostUsd / activeUsers30d : 0,
      },
      activeUsers30d,
      monthly: monthlyRows.map((row) => ({ month: row.month, costUsd: row.costUsd })),
      byCategory: byCategoryRows,
    });
  } catch (error) {
    console.error("Error loading cost monitoring:", error);
    res.status(500).json({ error: "Failed to load cost monitoring" });
  }
});

router.get("/evidence-pack", async (req: Request, res: Response): Promise<void> => {
  if (!hasAdminScope(req, "impact.export")) {
    res.status(403).json({ error: "Missing scope: impact.export" });
    return;
  }

  try {
    await ensureImpactTables();
    await ensureGovernanceTables();

    const learningRows = (await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*)::INT AS "attempts",
         COALESCE(AVG("score"), 0)::FLOAT AS "averageScore",
         COALESCE(AVG(CASE WHEN "passed" THEN 1 ELSE 0 END), 0)::FLOAT AS "passRate"
       FROM "LearningAssessmentEvent"`
    )) as Array<{ attempts: number; averageScore: number; passRate: number }>;

    const campaignRows = (await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*)::INT AS "campaignCount",
         COALESCE(SUM("targetReach"), 0)::INT AS "targetReach",
         COALESCE(SUM("currentReach"), 0)::INT AS "currentReach",
         COALESCE(SUM("funnelImpressions"), 0)::INT AS "funnelImpressions",
         COALESCE(SUM("funnelScans"), 0)::INT AS "funnelScans",
         COALESCE(SUM("funnelSignups"), 0)::INT AS "funnelSignups",
         COALESCE(SUM("funnelActiveUsers"), 0)::INT AS "funnelActiveUsers",
         COALESCE(SUM("funnelCompletions"), 0)::INT AS "funnelCompletions"
       FROM "OutreachCampaign"`
    )) as Array<{
      campaignCount: number;
      targetReach: number;
      currentReach: number;
      funnelImpressions: number;
      funnelScans: number;
      funnelSignups: number;
      funnelActiveUsers: number;
      funnelCompletions: number;
    }>;

    const aiRows = (await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*)::INT AS "totalCalls",
         COALESCE(SUM(CASE WHEN "success" THEN 1 ELSE 0 END), 0)::INT AS "successCalls",
         COALESCE(SUM(CASE WHEN "moderationOutcome" = 'flagged' THEN 1 ELSE 0 END), 0)::INT AS "flaggedCalls"
       FROM "AiAuditLog"`
    )) as Array<{ totalCalls: number; successCalls: number; flaggedCalls: number }>;

    const costRows = (await prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM("estimatedCostUsd"), 0)::FLOAT AS "totalCostUsd"
       FROM "ApiCostLedger"`
    )) as Array<{ totalCostUsd: number }>;

    const learning = learningRows[0] || { attempts: 0, averageScore: 0, passRate: 0 };
    const campaigns = campaignRows[0] || {
      campaignCount: 0,
      targetReach: 0,
      currentReach: 0,
      funnelImpressions: 0,
      funnelScans: 0,
      funnelSignups: 0,
      funnelActiveUsers: 0,
      funnelCompletions: 0,
    };
    const ai = aiRows[0] || { totalCalls: 0, successCalls: 0, flaggedCalls: 0 };
    const costs = costRows[0] || { totalCostUsd: 0 };

    const generatedAt = new Date().toISOString();
    const kpiSummary = {
      generatedAt,
      learning: {
        attempts: learning.attempts,
        averageScore: Math.round(learning.averageScore * 10) / 10,
        passRatePercent: Math.round(learning.passRate * 100),
      },
      campaigns,
      ai,
      costs,
    };

    const kpiCsv = toCsv(
      ["metric", "value"],
      [
        ["generatedAt", generatedAt],
        ["learning.attempts", learning.attempts],
        ["learning.averageScore", Math.round(learning.averageScore * 10) / 10],
        ["learning.passRatePercent", Math.round(learning.passRate * 100)],
        ["campaigns.campaignCount", campaigns.campaignCount],
        ["campaigns.targetReach", campaigns.targetReach],
        ["campaigns.currentReach", campaigns.currentReach],
        ["campaigns.funnelImpressions", campaigns.funnelImpressions],
        ["campaigns.funnelScans", campaigns.funnelScans],
        ["campaigns.funnelSignups", campaigns.funnelSignups],
        ["campaigns.funnelActiveUsers", campaigns.funnelActiveUsers],
        ["campaigns.funnelCompletions", campaigns.funnelCompletions],
        ["ai.totalCalls", ai.totalCalls],
        ["ai.successCalls", ai.successCalls],
        ["ai.flaggedCalls", ai.flaggedCalls],
        ["cost.totalCostUsd", costs.totalCostUsd],
      ]
    );

    res.json({
      generatedAt,
      kpiSummary,
      export: {
        kpiCsv,
      },
    });
  } catch (error) {
    console.error("Error building evidence pack:", error);
    res.status(500).json({ error: "Failed to build evidence pack" });
  }
});

export default router;
