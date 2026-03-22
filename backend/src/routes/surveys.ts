import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

function normalizeQuestions(raw: string): Array<{
  id: string;
  text: string;
  type: string;
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
}> {
  const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
  if (!Array.isArray(parsed)) return [];

  return parsed.map((question) => {
    const responseType = String(question.responseType || question.type || "scale");
    const scaleObject =
      typeof question.scale === "object" && question.scale !== null
        ? (question.scale as Record<string, unknown>)
        : null;
    const min = Number(question.min || scaleObject?.min || 1);
    const max = Number(question.max || scaleObject?.max || 10);

    return {
      id: String(question.id || ""),
      text: String(question.text || ""),
      type: responseType,
      scale:
        responseType === "scale"
          ? {
              min,
              max,
              minLabel: typeof question.minLabel === "string" ? question.minLabel : undefined,
              maxLabel: typeof question.maxLabel === "string" ? question.maxLabel : undefined,
            }
          : undefined,
    };
  });
}

// Base survey questions for wellbeing assessment
const BASELINE_WELLBEING_SURVEY = {
  title: "Baseline Wellbeing Assessment",
  description: "Initial assessment of your current stress levels and wellbeing",
  type: "wellbeing",
  questions: [
    {
      id: "q1",
      text: "On a scale of 1-10, how stressed do you feel today?",
      responseType: "scale",
      min: 1,
      max: 10,
      required: true,
    },
    {
      id: "q2",
      text: "How confident are you in dealing with stressful situations?",
      responseType: "scale",
      min: 1,
      max: 10,
      required: true,
    },
    {
      id: "q3",
      text: "How confident are you in seeking help when you need it?",
      responseType: "scale",
      min: 1,
      max: 10,
      required: true,
    },
    {
      id: "q4",
      text: "How well are you coping with challenges in your life?",
      responseType: "scale",
      min: 1,
      max: 10,
      required: true,
    },
    {
      id: "q5",
      text: "How would you rate your overall mental wellbeing?",
      responseType: "scale",
      min: 1,
      max: 10,
      required: true,
    },
  ],
};

// Ensure baseline survey exists (run on startup)
export async function ensureBaselineSurvey(): Promise<void> {
  try {
    const existing = await prisma.survey.findFirst({
      where: { type: "wellbeing", title: BASELINE_WELLBEING_SURVEY.title },
    });

    if (!existing) {
      await prisma.survey.create({
        data: {
          title: BASELINE_WELLBEING_SURVEY.title,
          description: BASELINE_WELLBEING_SURVEY.description,
          type: BASELINE_WELLBEING_SURVEY.type,
          questions: JSON.stringify(BASELINE_WELLBEING_SURVEY.questions),
          isActive: true,
        },
      });
      console.log("Created baseline wellbeing survey");
    }
  } catch (error) {
    console.error("Failed to ensure baseline survey:", error);
  }
}

// GET /api/surveys - List all active surveys
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const surveys = await prisma.survey.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        questions: true,
        isActive: true,
      },
    });

    res.json(
      surveys.map((survey) => ({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        type: survey.type,
        isActive: survey.isActive,
        questions: normalizeQuestions(survey.questions),
      }))
    );
  } catch (error) {
    console.error("List surveys error:", error);
    res.status(500).json({ error: "Failed to list surveys" });
  }
});

// GET /api/surveys/:id - Get survey with questions
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const survey = await prisma.survey.findUnique({
      where: { id },
    });

    if (!survey) {
      res.status(404).json({ error: "Survey not found" });
      return;
    }

    res.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      type: survey.type,
      questions: normalizeQuestions(survey.questions),
    });
  } catch (error) {
    console.error("Get survey error:", error);
    res.status(500).json({ error: "Failed to fetch survey" });
  }
});

// POST /api/surveys/:id/responses - Submit survey response
router.post("/:id/responses", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { responses } = req.body;

    if (!responses || typeof responses !== "object") {
      res.status(400).json({ error: "responses object is required" });
      return;
    }

    // Verify survey exists
    const survey = await prisma.survey.findUnique({
      where: { id },
    });

    if (!survey) {
      res.status(404).json({ error: "Survey not found" });
      return;
    }

    // Create or update response
    const surveyResponse = await prisma.surveyResponse.upsert({
      where: {
        userId_surveyId: {
          userId,
          surveyId: id,
        },
      },
      create: {
        userId,
        surveyId: id,
        responses: JSON.stringify(responses),
      },
      update: {
        responses: JSON.stringify(responses),
        updatedAt: new Date(),
      },
    });

    res.status(201).json({
      id: surveyResponse.id,
      surveyId: surveyResponse.surveyId,
      userId: surveyResponse.userId,
      responses: JSON.parse(surveyResponse.responses),
      submittedAt: surveyResponse.submittedAt,
      updatedAt: surveyResponse.updatedAt,
    });
  } catch (error) {
    console.error("Submit response error:", error);
    res.status(500).json({ error: "Failed to submit survey response" });
  }
});

// GET /api/surveys/:id/responses - Get user's response to survey
router.get("/:id/responses", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const response = await prisma.surveyResponse.findUnique({
      where: {
        userId_surveyId: {
          userId,
          surveyId: id,
        },
      },
    });

    if (!response) {
      res.status(404).json({ error: "No response found" });
      return;
    }

    res.json({
      id: response.id,
      surveyId: response.surveyId,
      userId: response.userId,
      responses: JSON.parse(response.responses),
      submittedAt: response.submittedAt,
      updatedAt: response.updatedAt,
    });
  } catch (error) {
    console.error("Get response error:", error);
    res.status(500).json({ error: "Failed to fetch response" });
  }
});

// Admin: GET /api/surveys/:id/responses/aggregate - Get aggregated responses (admin only)
router.get("/:id/responses/aggregate", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isAdmin = (req as any).isAdmin;

    if (!isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId: id },
      select: {
        id: true,
        userId: true,
        responses: true,
        submittedAt: true,
      },
    });

    // Parse and aggregate responses
    const parsed = responses.map((r) => ({
      userId: r.userId,
      responses: JSON.parse(r.responses),
      submittedAt: r.submittedAt,
    }));

    res.json({
      surveyId: id,
      totalResponses: responses.length,
      responses: parsed,
    });
  } catch (error) {
    console.error("Get aggregate responses error:", error);
    res.status(500).json({ error: "Failed to fetch aggregated responses" });
  }
});

export default router;
