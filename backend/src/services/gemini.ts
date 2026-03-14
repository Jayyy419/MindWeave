import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY || "";

// Initialize the Gemini client when a key is present.
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Framework-specific system prompts for thought reframing
const FRAMEWORK_PROMPTS: Record<string, string> = {
  cbt: `You are a cognitive behavioral therapist. Reframe the following thought by identifying cognitive distortions and offering a balanced perspective. Keep it concise and empathetic. Return only the reframed text without any additional commentary, labels, or prefixes.`,

  iceberg: `You are a therapist using the Iceberg Model. The iceberg's tip is the surface reaction; below the surface are deeper feelings and needs. Reframe the following by exploring what might be underneath the surface-level thought. Keep it concise and empathetic. Return only the reframed text without any additional commentary, labels, or prefixes.`,

  growth: `You are a coach promoting a growth mindset. Reframe the following by focusing on learning, effort, and potential rather than fixed outcomes. Keep it concise and empathetic. Return only the reframed text without any additional commentary, labels, or prefixes.`,
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "their",
  "there",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "with",
  "you",
  "your",
]);

function buildFallbackReframe(text: string, framework: string): string {
  const normalizedText = text.trim();

  if (framework === "cbt") {
    return `This situation feels difficult right now, but one moment does not define everything. A more balanced view is that this challenge is real, and I can respond to it one step at a time with more clarity and self-compassion.`;
  }

  if (framework === "iceberg") {
    return `What shows on the surface may be frustration, worry, or tension, while underneath there may be needs for reassurance, rest, understanding, or control. Noticing those deeper needs can help me respond to myself with more care.`;
  }

  if (framework === "growth") {
    return `This does not have to be a final verdict on my ability. I can treat it as a learning moment, notice what it is teaching me, and keep improving through effort, reflection, and practice.`;
  }

  return normalizedText;
}

function buildFallbackTags(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function getModel() {
  if (!genAI) {
    throw new Error("Gemini API key is missing");
  }

  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

/**
 * Reframe a user's journal entry text using the specified therapeutic framework.
 * Calls Google Gemini to generate the reframed version.
 */
export async function reframeText(
  text: string,
  framework: string
): Promise<string> {
  const systemPrompt = FRAMEWORK_PROMPTS[framework];
  if (!systemPrompt) {
    throw new Error(`Unknown framework: ${framework}`);
  }

  try {
    const model = getModel();
    const prompt = `${systemPrompt}\n\nOriginal thought:\n"${text}"`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const reframedText = response.text().trim();

    return reframedText || buildFallbackReframe(text, framework);
  } catch (error) {
    console.warn("Gemini reframing failed, using fallback response:", error);
    return buildFallbackReframe(text, framework);
  }
}

/**
 * Extract keyword tags from a journal entry text.
 * Returns an array of 3-5 lowercase keywords/short phrases.
 */
export async function extractTags(text: string): Promise<string[]> {
  try {
    const model = getModel();
    const prompt = `Extract 3-5 keywords or short phrases (1-2 words each) that represent the main topics, emotions, or interests in this text. Return ONLY a comma-separated list with no numbering, bullet points, or extra text.\n\nText:\n"${text}"`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawTags = response.text().trim();

    const tags = rawTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0 && tag.length < 50);

    return tags.length > 0 ? tags : buildFallbackTags(text);
  } catch (error) {
    console.warn("Gemini tag extraction failed, using fallback tags:", error);
    return buildFallbackTags(text);
  }
}
