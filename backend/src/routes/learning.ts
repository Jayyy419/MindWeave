import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { LEARNING_LIBRARY, LEARNING_LESSON_MAP } from "../config/learningLibrary";
import { updateUserGamification } from "../services/gamification";

const router = Router();
const prisma = new PrismaClient();

router.get("/frameworks", async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    const progress = await prisma.learningLessonProgress.findMany({
      where: { userId },
      select: { frameworkId: true, lessonId: true, completedAt: true },
    });

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
    const progress = await prisma.learningLessonProgress.findMany({
      where: { userId, frameworkId },
      select: { lessonId: true, completedAt: true },
    });

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
    const progress = await prisma.learningLessonProgress.upsert({
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
    });

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

export default router;
