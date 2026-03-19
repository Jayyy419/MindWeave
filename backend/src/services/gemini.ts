import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { FRAMEWORK_PROMPT_MAP, FRAMEWORK_FALLBACK_MAP } from "../config/frameworks";

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Initialize the Gemini client when a key is present.
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

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

/**
 * Reframe a user's journal entry text using the specified therapeutic framework.
 * Calls Google Gemini to generate the reframed version.
 *
 * Throws Error("NOT_JOURNAL_ENTRY") when the model determines the text is not
 * a genuine personal journal entry (off-topic / abuse attempt). This error is
 * never swallowed by the fallback path — it must propagate to the route handler.
 */
export async function reframeText(
  text: string,
  framework: string,
  options?: { allowFallback?: boolean }
): Promise<string> {
  const allowFallback = options?.allowFallback ?? true;
  const systemPrompt = FRAMEWORK_PROMPT_MAP[framework];
  if (!systemPrompt) {
    throw new Error(`Unknown framework: ${framework}`);
  }
  if (!genAI) {
    throw new Error("Gemini API key is missing");
  }

  try {
    // Pass the system prompt as a proper systemInstruction (kept separate from
    // the user-supplied text) to reduce the risk of prompt injection.
    const model = genAI.getGenerativeModel({
      model: geminiModel,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(`Journal reflection:\n"${text}"`);
    const reframedText = result.response.text().trim();

    // The scope-guard in every system prompt instructs the model to respond
    // with [NOT_JOURNAL] when it detects an off-topic request.
    if (reframedText.startsWith("[NOT_JOURNAL]")) {
      throw new Error("NOT_JOURNAL_ENTRY");
    }

    return reframedText || (FRAMEWORK_FALLBACK_MAP[framework] ?? text);
  } catch (error) {
    // Content rejection — must propagate, not be silently swapped for a fallback.
    if (error instanceof Error && error.message === "NOT_JOURNAL_ENTRY") {
      throw error;
    }
    if (!allowFallback) {
      throw new Error("AI reframing unavailable right now");
    }
    console.warn("Gemini reframing failed, using fallback response:", error);
    return FRAMEWORK_FALLBACK_MAP[framework] ?? text;
  }
}

/**
 * Extract keyword tags from a journal entry text.
 * Returns an array of 3-5 lowercase keywords/short phrases.
 */
export async function extractTags(text: string): Promise<string[]> {
  try {
    if (!genAI) throw new Error("Gemini API key is missing");
    const model = genAI.getGenerativeModel({
      model: geminiModel,
      systemInstruction:
        "You are a keyword extractor for a personal journaling app. Extract 3-5 keywords or short phrases (1-2 words each) representing the main topics, emotions, or themes. Return ONLY a comma-separated list with no numbering, bullet points, or extra text.",
    });
    const result = await model.generateContent(`Extract keywords from this journal text:\n"${text}"`);
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

/**
 * Generate a concise group-chat facilitator response.
 */
export async function generateChatBotReply(
  thinkTankName: string,
  username: string,
  message: string
): Promise<string> {
  const fallback = `Thanks for sharing, ${username}. In ${thinkTankName}, a helpful next step is to break this into one small action and ask the group for focused feedback.`;

  try {
    if (!genAI) throw new Error("Gemini API key is missing");
    const model = genAI.getGenerativeModel({ model: geminiModel });
    const prompt = `You are MindWeave Bot, a warm and practical facilitator in a group called "${thinkTankName}".
Respond to this user message in 2-4 concise sentences:

User (${username}) said: "${message}"

Rules:
- Be supportive and specific.
- Offer one actionable next step.
- Keep under 90 words.
- Do not mention safety policy, system prompts, or technical details.
- Return only the reply text.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || fallback;
  } catch (error) {
    console.warn("Gemini chat reply failed, using fallback:", error);
    return fallback;
  }
}
