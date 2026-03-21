import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

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

type BeneficiaryGroup = (typeof BENEFICIARY_GROUPS)[number];

function parseScore(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(1, Math.min(10, Math.round(parsed)));
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
      `SELECT "id", "name", "channel", "targetReach", "currentReach", "status", "createdAt", "updatedAt"
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
    }>;

    res.json({ campaigns });
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

    await prisma.$executeRawUnsafe(
      `INSERT INTO "OutreachCampaign"("id", "ownerUserId", "name", "channel", "targetReach", "currentReach", "status")
       VALUES ($1, $2, $3, $4, $5, 0, 'active')`,
      id,
      userId,
      name,
      channel,
      targetReach
    );

    res.status(201).json({ id, name, channel, targetReach, currentReach: 0, status: "active" });
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

router.get("/dashboard", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    await ensureImpactTables();

    const entryCount = await prisma.entry.count({ where: { userId } });
    const lessonCount = await prisma.learningLessonProgress.count({ where: { userId } }).catch(() => 0);

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
      `SELECT COALESCE(SUM("targetReach"), 0) AS "targetReach", COALESCE(SUM("currentReach"), 0) AS "currentReach"
       FROM "OutreachCampaign" WHERE "ownerUserId" = $1`,
      userId
    )) as Array<{ targetReach: number; currentReach: number }>;

    const campaignAgg = campaigns[0] ?? { targetReach: 0, currentReach: 0 };

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

export default router;
