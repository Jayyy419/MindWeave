import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { LEARNING_LIBRARY, LEARNING_LESSON_MAP } from "../config/learningLibrary";
import { updateUserGamification } from "../services/gamification";

const router = Router();
const prisma = new PrismaClient();

let ensureLearningProgressTablePromise: Promise<void> | null = null;
let ensureLearningAssessmentTablePromise: Promise<void> | null = null;

function isMissingLearningProgressTableError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021" &&
    error.meta?.modelName === "LearningLessonProgress"
  );
}

async function ensureLearningProgressTable(): Promise<void> {
  if (!ensureLearningProgressTablePromise) {
    ensureLearningProgressTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LearningLessonProgress" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "frameworkId" TEXT NOT NULL,
          "lessonId" TEXT NOT NULL,
          "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "LearningLessonProgress_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "LearningLessonProgress_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "LearningLessonProgress_userId_lessonId_key"
        ON "LearningLessonProgress"("userId", "lessonId")
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "LearningLessonProgress_userId_frameworkId_idx"
        ON "LearningLessonProgress"("userId", "frameworkId")
      `);
    })().catch((error) => {
      ensureLearningProgressTablePromise = null;
      throw error;
    });
  }

  await ensureLearningProgressTablePromise;
}

async function ensureLearningAssessmentTable(): Promise<void> {
  if (!ensureLearningAssessmentTablePromise) {
    ensureLearningAssessmentTablePromise = (async () => {
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
        CREATE INDEX IF NOT EXISTS "LearningAssessmentEvent_userId_createdAt_idx"
        ON "LearningAssessmentEvent"("userId", "createdAt")
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "LearningAssessmentEvent_lessonId_createdAt_idx"
        ON "LearningAssessmentEvent"("lessonId", "createdAt")
      `);
    })().catch((error) => {
      ensureLearningAssessmentTablePromise = null;
      throw error;
    });
  }

  await ensureLearningAssessmentTablePromise;
}

async function withLearningProgressTable<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingLearningProgressTableError(error)) {
      throw error;
    }

    await ensureLearningProgressTable();
    return operation();
  }
}

router.get("/frameworks", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    const progress = await withLearningProgressTable(() =>
      prisma.learningLessonProgress.findMany({
        where: { userId },
        select: { frameworkId: true, lessonId: true, completedAt: true },
      })
    );

    const completedLessonIds = new Set(progress.map((item) => item.lessonId));

    const frameworks = LEARNING_LIBRARY.map((framework) => {
      const completedCount = framework.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
      const totalLessons = framework.lessons.length;

      return {
        id: framework.id,
        label: framework.label,
        description: framework.description,
        totalLessons,
        completedLessons: completedCount,
        progressPercent: Math.round((completedCount / totalLessons) * 100),
      };
    });

    res.json({ frameworks });
  } catch (error) {
    console.error("Error listing learning frameworks:", error);
    res.status(500).json({ error: "Failed to load learning library" });
  }
});

router.get("/frameworks/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const frameworkId = String(req.params.id);

  const framework = LEARNING_LIBRARY.find((item) => item.id === frameworkId);
  if (!framework) {
    res.status(404).json({ error: "Learning framework not found" });
    return;
  }

  try {
    const progress = await withLearningProgressTable(() =>
      prisma.learningLessonProgress.findMany({
        where: { userId, frameworkId },
        select: { lessonId: true, completedAt: true },
      })
    );

    const completedMap = new Map(progress.map((item) => [item.lessonId, item.completedAt]));

    const lessons = framework.lessons.map((lesson) => ({
      ...lesson,
      completedAt: completedMap.get(lesson.id) ?? null,
      completed: completedMap.has(lesson.id),
    }));

    res.json({
      id: framework.id,
      label: framework.label,
      description: framework.description,
      totalLessons: framework.lessons.length,
      completedLessons: progress.length,
      lessons,
    });
  } catch (error) {
    console.error("Error loading framework lessons:", error);
    res.status(500).json({ error: "Failed to load framework lessons" });
  }
});

router.post("/lessons/:id/complete", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const lessonId = String(req.params.id);

  const lessonMeta = LEARNING_LESSON_MAP.get(lessonId);
  if (!lessonMeta) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  try {
    const progress = await withLearningProgressTable(() =>
      prisma.learningLessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        update: {
          completedAt: new Date(),
        },
        create: {
          userId,
          lessonId,
          frameworkId: lessonMeta.frameworkId,
        },
      })
    );

    await updateUserGamification(userId, []);

    res.status(201).json({
      lessonId: progress.lessonId,
      frameworkId: progress.frameworkId,
      completedAt: progress.completedAt,
      message: "Lesson marked as completed",
    });
  } catch (error) {
    console.error("Error completing lesson:", error);
    res.status(500).json({ error: "Failed to complete lesson" });
  }
});

router.post("/lessons/:id/assessment", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;
  const lessonId = String(req.params.id);

  const lessonMeta = LEARNING_LESSON_MAP.get(lessonId);
  if (!lessonMeta) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  const source = String(req.body?.source || "course").trim().slice(0, 32) || "course";
  const rawScore = Number(req.body?.score);
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : NaN;
  const passed = Boolean(req.body?.passed);

  if (!Number.isFinite(score)) {
    res.status(400).json({ error: "score must be a number between 0 and 100" });
    return;
  }

  try {
    await ensureLearningAssessmentTable();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "LearningAssessmentEvent"("id", "userId", "frameworkId", "lessonId", "source", "score", "passed")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      randomUUID(),
      userId,
      lessonMeta.frameworkId,
      lessonId,
      source,
      score,
      passed
    );

    res.status(201).json({ message: "Assessment event recorded", lessonId, score, passed });
  } catch (error) {
    console.error("Error recording learning assessment:", error);
    res.status(500).json({ error: "Failed to record assessment event" });
  }
});

export default router;
