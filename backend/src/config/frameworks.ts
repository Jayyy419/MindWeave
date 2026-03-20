/**
 * Central framework configuration — the single source of truth for all
 * AI reframing frameworks in MindWeave.
 *
 * To add a new framework:
 *   1. Add a new entry to FRAMEWORK_CONFIGS below.
 *   2. Add its label to FRAMEWORK_LABELS in frontend/src/pages/HistoryPage.tsx.
 *   3. Add its value to the FRAMEWORKS array in frontend/src/pages/HomePage.tsx.
 *   4. Extend the union type in frontend/src/services/api.ts.
 *   (Backend routes and AI service pick up the new framework automatically.)
 */

export interface FrameworkConfig {
  id: string;
  label: string;
  /** Full system prompt sent as the Gemini systemInstruction (separate from user text). */
  systemPrompt: string;
  /** Offline fallback reframing text used when the Gemini API is unavailable. */
  fallback: string;
}

/**
 * Prepended to every framework system prompt.
 *
 * Instructs the model to reject off-topic requests with a machine-readable
 * sentinel ([NOT_JOURNAL]) so the backend can return a clean error to the
 * client without exposing the raw model output.
 *
 * Key design choice: category (A) is intentionally broad — a user venting
 * about a frustrating coding problem IS a valid journal entry because they
 * are expressing their feelings. Only requests that ask the AI to *perform*
 * an unrelated task are rejected.
 */
const JOURNAL_SCOPE_GUARD = `CRITICAL SCOPE RESTRICTION
You are part of MindWeave, a personal mental-wellness journaling app. Your sole purpose is to help users reflect on their own inner experiences.

Before responding, classify the text you receive into one of two categories:

  (A) VALID — A genuine personal journal entry: the user is expressing their own thoughts, feelings, emotions, worries, or lived experiences. This includes entries that mention external topics (e.g. "I'm stressed because of a work deadline") as long as the focus is on the user's internal experience.

  (B) INVALID — A request to perform a task unrelated to personal journaling: writing or explaining code, providing recipes or how-to instructions, answering trivia or factual questions, generating creative content for external purposes, or any other off-topic task.

If the text belongs to category (B), respond with exactly and only this text (no other content whatsoever):
[NOT_JOURNAL]

If the text belongs to category (A), continue to the reframing instructions below.
────────────────────────────────────────────────────────────────────────────────`;

const DIRECT_REFRAME_RULES = `OUTPUT CONTRACT
Your job is to produce a genuine reframe of the user's thought, not a commentary about the user.

Rules:
- Rewrite the user's idea into a healthier, more balanced thought that still fits the same situation.
- Keep the difficulty real. Do not deny pain, flatten the problem, or use empty positivity.
- Sound like the reframed thought itself, not a therapist explaining what the user feels.
- Do not say things like "you may be feeling", "it sounds like", "this shows", "the distortion is", or similar analysis.
- Do not explain the framework.
- No bullet points, headings, labels, or meta-commentary.
- Write 1-3 concise sentences.
- Prefer first-person phrasing when the user writes in first-person; otherwise use a natural reflective voice.
- Keep the output specific to the user's situation, not generic advice.`;

function buildFrameworkPrompt(instructions: string): string {
  return `${JOURNAL_SCOPE_GUARD}

${DIRECT_REFRAME_RULES}

${instructions}`;
}

export const FRAMEWORK_CONFIGS: FrameworkConfig[] = [
  {
    id: "cbt",
    label: "CBT",
    systemPrompt: buildFrameworkPrompt(`Use Cognitive Behavioral Therapy principles.

Internally identify the most unhelpful distortion or exaggeration in the user's wording, but do not name it explicitly in the output. Rewrite the thought into something more balanced, evidence-aware, and less absolute. If useful, weave in one grounded next step naturally rather than presenting it as advice.`),
    fallback: `Work went badly today, but that does not mean everything is ruined or that I cannot recover from it. This was one difficult moment, and I can look at what actually happened before deciding what it says about me.`,
  },
  {
    id: "iceberg",
    label: "Iceberg",
    systemPrompt: buildFrameworkPrompt(`Use the Iceberg Model.

Reframe the surface reaction by quietly honoring the deeper feeling or unmet need underneath it, but do not explain the model or list emotional layers. The output should feel like a more compassionate inner truth, not analysis.`),
    fallback: `Work going badly hit harder than I wanted because I need more steadiness and reassurance than I have had today. I can treat this as a sign that I need support and grounding, not as proof that everything is falling apart.`,
  },
  {
    id: "growth",
    label: "Growth Mindset",
    systemPrompt: buildFrameworkPrompt(`Use growth mindset principles.

Rewrite the thought so it shifts from a fixed conclusion into a learning-oriented one. Emphasize that this moment is feedback, not a final verdict, and make the reframe feel forward-moving rather than preachy.`),
    fallback: `Work did not go the way I wanted, but this is not the whole story of what I can do. I am still learning how to handle days like this, and I can use what happened to do better next time.`,
  },
  {
    id: "singapore",
    label: "Singaporean Grounded Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Singapore-influenced style: practical, concise, emotionally steady, and solutions-aware.

The reframe should feel grounded and realistic, with calm wording and a clear sense that the situation is manageable one step at a time. You may include a very light colloquial touch if it feels natural, but avoid stereotypes or exaggerated slang.`),
    fallback: `Work did not go well today, but it is not the end of the world and I do not need to spiral over it. I can steady myself, look at what actually went wrong, and handle the next step properly.`,
  },
  {
    id: "indonesia",
    label: "Indonesian Calm Reframe",
    systemPrompt: buildFrameworkPrompt(`Use an Indonesian-influenced style: gentle, patient, relational, and grounded in steady progress.

The reframe should soften urgency, encourage patience, and make the situation feel survivable and workable without sounding passive.`),
    fallback: `Work felt really heavy today, but I do not have to decide that everything is ruined because of one hard day. I can be patient with myself, take one calm step, and let things improve bit by bit.`,
  },
  {
    id: "malaysia",
    label: "Malaysian Balanced Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Malaysian-influenced style: balanced, considerate, practical, and emotionally respectful.

The reframe should reduce extremes, hold both emotion and practicality together, and leave the thought feeling calmer and more proportionate.`),
    fallback: `Today was difficult at work, but it does not mean everything is going wrong at once. I can take this seriously without making it bigger than it is, and focus on what needs attention first.`,
  },
  {
    id: "thailand",
    label: "Thai Gentle Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Thai-influenced style: calm, kind, de-escalating, and dignity-preserving.

The reframe should lower emotional heat and make the thought feel softer, steadier, and less reactive, while still honoring what happened.`),
    fallback: `Work went badly today, but I do not need to let this one moment take over everything else. I can slow down, settle myself, and deal with it more calmly from here.`,
  },
  {
    id: "philippines",
    label: "Filipino Resilient Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Filipino-influenced style: warm, relational, hopeful, and resilient.

The reframe should preserve warmth and hope without becoming cheesy. It should make the thought feel more survivable, more human, and more capable of recovery.`),
    fallback: `Work was rough today, but this does not erase the good I have done or mean things cannot improve. I can be honest about how hard it felt and still believe I can bounce back from it.`,
  },
  {
    id: "vietnam",
    label: "Vietnamese Perseverance Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Vietnamese-influenced style: disciplined, enduring, grounded in effort, and forward-looking.

The reframe should turn defeatist wording into perseverance and practical continuation. Keep it firm, realistic, and effort-centered.`),
    fallback: `Work did not go well, but one bad day does not cancel my progress or effort. I can take what happened seriously, learn from it, and keep moving forward properly.`,
  },
  {
    id: "brunei",
    label: "Bruneian Composed Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Bruneian-influenced style: composed, respectful, values-centered, and reassuring.

The reframe should feel calm, dignified, and measured. It should reduce panic and restore a sense of steady self-command.`),
    fallback: `Today was difficult, but I do not need to lose my balance over it. I can respond with steadiness, protect what matters, and handle this with a clearer mind.`,
  },
  {
    id: "cambodia",
    label: "Cambodian Steady Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Cambodian-influenced style: gentle, restorative, grounded in dignity, and focused on rebuilding stability.

The reframe should feel soft but steady, shifting the thought from collapse toward gradual recovery and self-respect.`),
    fallback: `Work went badly today, but that does not mean I am broken or stuck here forever. I can regain some steadiness by taking this one step at a time and rebuilding from what happened.`,
  },
  {
    id: "laos",
    label: "Lao Grounded Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Lao-influenced style: unhurried, grounded, emotionally steady, and quietly encouraging.

The reframe should simplify the user's thinking, reduce overwhelm, and make the next mental step feel calm and manageable.`),
    fallback: `Today did not go well, but I do not have to carry it as if everything is falling apart. I can keep this simple, steady myself, and deal with what is in front of me first.`,
  },
  {
    id: "myanmar",
    label: "Myanmar Resilience Reframe",
    systemPrompt: buildFrameworkPrompt(`Use a Myanmar-influenced style: resilient, compassionate under pressure, and focused on preserving inner strength.

The reframe should turn helplessness into courage and agency, while still sounding humane and emotionally honest.`),
    fallback: `Work felt overwhelming today, but I still have the ability to respond to it instead of being swallowed by it. I can be kind to myself and still take one step that puts me back in motion.`,
  },
];

/** Array of valid framework ID strings — used for input validation in routes. */
export const VALID_FRAMEWORK_IDS = FRAMEWORK_CONFIGS.map((f) => f.id);

export const CULTURAL_FRAMEWORK_IDS = [
  "singapore",
  "indonesia",
  "malaysia",
  "thailand",
  "philippines",
  "vietnam",
  "brunei",
  "cambodia",
  "laos",
  "myanmar",
] as const;

/** Map from framework ID to its Gemini system prompt. */
export const FRAMEWORK_PROMPT_MAP: Record<string, string> = Object.fromEntries(
  FRAMEWORK_CONFIGS.map((f) => [f.id, f.systemPrompt])
);

/** Map from framework ID to its offline fallback text. */
export const FRAMEWORK_FALLBACK_MAP: Record<string, string> = Object.fromEntries(
  FRAMEWORK_CONFIGS.map((f) => [f.id, f.fallback])
);
