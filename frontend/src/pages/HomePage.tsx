import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEntry,
  previewReframe,
  type FrameworkId,
  type TherapeuticFrameworkId,
  type CulturalFrameworkId,
  type CulturalToneStrength,
  type EntryChunk,
  type ExplainabilityPayload,
  type SafetySignal,
} from "@/services/api";
import { CalendarDays, Heart, Info, Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  DEMO_MODE,
  MAX_DEMO_REFRAMES,
  getDemoRemaining,
  incrementDemoReframeCount,
  isDemoLimitReached,
} from "@/config/demo";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

const TOUR_STEPS: TourStep[] = [
  {
    target: "framework-selector",
    title: "Choose a Framework",
    description:
      "Start by selecting your therapeutic reframing lens. Each framework offers a different way to reframe your thoughts — tap here to compare CBT, Iceberg, and Growth Mindset.",
  },
  {
    target: "countdown-selector",
    title: "Set Your Countdown",
    description:
      "Pick how long to pause after you stop typing before the AI automatically reframes your writing. Choose 3, 5, or 10 seconds.",
  },
  {
    target: "confirm-options",
    title: "Confirm Your Options",
    description:
      "Once you've chosen a framework and countdown, press this button to lock in your options and start writing. You won't be able to change them mid-entry.",
    placement: "right",
  },
  {
    target: "entry-title",
    title: "Give It a Title",
    description:
      "Name your journal entry — something simple like \"Monday reflections\" or \"Dealing with work stress\" works great.",
  },
  {
    target: "writing-area",
    title: "Write Freely",
    description:
      "This is your journaling space. Write about what happened, how you felt, or what's on your mind. After you pause, the AI will automatically reframe your text using the lens you chose.",
  },
  {
    target: "mood-checkin",
    title: "Check In With Yourself",
    description:
      "Optionally tag how you're feeling and set an intention for this entry. Naming emotions helps reduce their intensity.",
    placement: "left",
  },
  {
    target: "writing-prompts",
    title: "Need Inspiration?",
    description:
      "If you're not sure what to write, tap any of these reflection prompts to add them to your entry as a starting point.",
    placement: "left",
  },
  ...(DEMO_MODE
    ? []
    : [
        {
          target: "save-entry",
          title: "Save Your Entry",
          description:
            "When you're done, hit Save to store your journal entry. You can revisit it later in Memory Lane.",
        },
      ]),
];

type FrameworkCategory = "therapeutic" | "cultural";

type FrameworkDefinition = {
  value: TherapeuticFrameworkId | FrameworkId;
  category: FrameworkCategory;
  country?: string;
  countryExplainer?: string;
  label: string;
  description: string;
  deepExplanation: string;
  bestFor: string;
  caution: string;
};

const DEFAULT_CULTURAL_TONE_STRENGTH: CulturalToneStrength = "medium";

const FRAMEWORKS = [
  {
    value: "cbt",
    category: "therapeutic",
    label: "CBT (Cognitive Behavioral Therapy)",
    description: "Identifies thinking distortions and helps you build a balanced perspective.",
    deepExplanation:
      "CBT helps you examine the story your mind is telling, especially when stress makes thoughts feel absolute. It focuses on evidence, patterns, and small behavior shifts that can reduce emotional intensity and improve clarity.",
    bestFor:
      "Spiraling thoughts, harsh self-talk, catastrophizing, overgeneralizing, or when you need a practical and structured reset.",
    caution:
      "Can feel too analytical in deeply emotional moments. If you feel numb or disconnected, pair this with self-compassion before problem-solving.",
  },
  {
    value: "iceberg",
    category: "therapeutic",
    label: "Iceberg Model",
    description: "Looks beneath surface reactions to uncover deeper feelings and needs.",
    deepExplanation:
      "The Iceberg Model explores layers under your visible reaction: emotions, perceptions, beliefs, expectations, and core longings. It is useful when your outer response feels bigger than the situation and you want to understand what is truly being touched inside.",
    bestFor:
      "Emotional triggers, recurring conflicts, identity-sensitive moments, and times you feel misunderstood or disproportionately affected.",
    caution:
      "May surface vulnerable emotions. Use this when you have enough mental space to sit with deeper feelings, not when you need immediate action-only advice.",
  },
  {
    value: "growth",
    category: "therapeutic",
    label: "Growth Mindset",
    description: "Transforms fixed, self-limiting conclusions into learning-oriented next steps.",
    deepExplanation:
      "Growth mindset reframing shifts from identity-based judgments (\"I am not good at this\") to process-based progress (\"I am still learning this\"). It keeps effort, strategy, and feedback at the center so setbacks become useful data rather than personal verdicts.",
    bestFor:
      "Academic pressure, skill-building, fear of failure, perfectionism, confidence dips, and situations where progress feels stuck.",
    caution:
      "Can feel dismissive if pain is intense. Validate your feelings first, then move into growth framing so it does not sound like forced positivity.",
  },
  {
    value: "singapore",
    category: "cultural",
    country: "Singapore",
    countryExplainer: "Practical clarity + steady execution",
    label: "Singaporean Grounded Reframe",
    description: "Practical and steady reframing that balances emotion with clear next actions.",
    deepExplanation:
      "This lens mirrors a grounded Singaporean communication style: direct, realistic, and calm under pressure. It validates feelings, then helps you focus on what can be done next without overcomplicating the moment.",
    bestFor:
      "When you feel overloaded and need a practical reset, clearer priorities, and one concrete action to move forward.",
    caution:
      "Avoid using this lens as pure problem-solving if your emotions are raw. Name the feeling first, then move into practical steps.",
  },
  {
    value: "indonesia",
    category: "cultural",
    country: "Indonesia",
    countryExplainer: "Patience, calm pacing, relational harmony",
    label: "Indonesian Calm Reframe",
    description: "A patient, gentle lens that emphasizes steady progress and emotional balance.",
    deepExplanation:
      "Inspired by values of patience and relational harmony, this framework helps you slow down emotional intensity and take grounded steps. It supports growth through consistency rather than urgency.",
    bestFor:
      "Moments of anxiety, overwhelm, or internal pressure where you need a calmer pace and sustainable momentum.",
    caution:
      "If urgent action is required, pair this with a specific deadline so calm reflection does not become avoidance.",
  },
  {
    value: "malaysia",
    category: "cultural",
    country: "Malaysia",
    countryExplainer: "Balanced perspective + moderate pace",
    label: "Malaysian Balanced Reframe",
    description: "Balances emotional validation with moderation and practical pacing.",
    deepExplanation:
      "This lens encourages a balanced view: acknowledging both your emotional burden and practical realities. It helps reduce extremes so you can respond with steadiness and perspective.",
    bestFor:
      "Situations where you feel pulled in multiple directions and need to prioritize without shutting down emotionally.",
    caution:
      "Do not use balance language to suppress valid pain. Let yourself feel first, then choose what to act on.",
  },
  {
    value: "thailand",
    category: "cultural",
    country: "Thailand",
    countryExplainer: "Gentle tone + emotional de-escalation",
    label: "Thai Gentle Reframe",
    description: "Calm and kind reframing that lowers emotional heat before action.",
    deepExplanation:
      "This framework emphasizes composure and compassion, helping you de-escalate internal stress and respond with intention. It is designed to restore clarity without self-judgment.",
    bestFor:
      "Highly emotional conflicts, frustration spikes, or moments when reacting quickly may worsen the situation.",
    caution:
      "Use with a follow-up action plan so calmness still leads to progress, not passivity.",
  },
  {
    value: "philippines",
    category: "cultural",
    country: "Philippines",
    countryExplainer: "Warmth, resilience, and hopeful action",
    label: "Filipino Resilient Reframe",
    description: "Warm and hopeful reframing that builds resilience and relational strength.",
    deepExplanation:
      "This lens combines emotional warmth with practical hope. It helps you recognize pain while still seeing your ability to recover and take meaningful steps with support.",
    bestFor:
      "Setbacks, confidence dips, or difficult periods where you need encouragement plus one actionable next move.",
    caution:
      "Avoid skipping hard feelings in the name of positivity. Hope works best when paired with honest emotional acknowledgement.",
  },
  {
    value: "vietnam",
    category: "cultural",
    country: "Vietnam",
    countryExplainer: "Perseverance + disciplined progress",
    label: "Vietnamese Perseverance Reframe",
    description: "Effort-focused reframing that turns pressure into disciplined forward motion.",
    deepExplanation:
      "This framework emphasizes endurance, practical effort, and steady advancement. It reframes struggle as evidence of courage and commitment, then points you to the next concrete step.",
    bestFor:
      "Long-term pressure, demanding goals, or moments when you feel discouraged by slow progress.",
    caution:
      "If you are close to burnout, include recovery steps. Persistence should not mean self-neglect.",
  },
  {
    value: "brunei",
    category: "cultural",
    country: "Brunei",
    countryExplainer: "Composure, values, and dignified pacing",
    label: "Bruneian Composed Reframe",
    description: "Values-centered reframing that supports calm dignity and wise pacing.",
    deepExplanation:
      "This lens helps you respond with composure and respect for your own limits. It emphasizes doing what matters with focus, rather than carrying every burden at once.",
    bestFor:
      "Moments of uncertainty where you want clarity, self-respect, and measured decisions.",
    caution:
      "Composure is not emotional suppression. Make room for your feelings before narrowing to priorities.",
  },
  {
    value: "cambodia",
    category: "cultural",
    country: "Cambodia",
    countryExplainer: "Gentle rebuilding + stability focus",
    label: "Cambodian Steady Reframe",
    description: "Gentle rebuilding lens focused on stability, dignity, and small wins.",
    deepExplanation:
      "This framework supports gradual emotional and practical recovery. It helps you move from overwhelm to grounded progress through consistent, manageable actions.",
    bestFor:
      "Periods of emotional fatigue, instability, or rebuilding confidence after setbacks.",
    caution:
      "Keep steps realistic. Taking on too much at once can undo the stability you are rebuilding.",
  },
  {
    value: "laos",
    category: "cultural",
    country: "Laos",
    countryExplainer: "Unhurried clarity + grounded steps",
    label: "Lao Grounded Reframe",
    description: "Unhurried reframing that prioritizes emotional steadiness and simplicity.",
    deepExplanation:
      "This lens reduces overwhelm by focusing on calm, clear, low-friction next steps. It helps you regain footing through simplicity and consistent follow-through.",
    bestFor:
      "Mental clutter, decision fatigue, or stressful moments where slowing down improves judgment.",
    caution:
      "Use this lens with intention when time-sensitive decisions are needed; calm pacing should still include commitment.",
  },
  {
    value: "myanmar",
    category: "cultural",
    country: "Myanmar",
    countryExplainer: "Compassion under pressure + agency",
    label: "Myanmar Resilience Reframe",
    description: "Compassionate-under-pressure reframing that preserves agency and strength.",
    deepExplanation:
      "This framework acknowledges heavy emotional strain while reinforcing courage, endurance, and self-compassion. It helps you identify one controllable action that restores agency.",
    bestFor:
      "High-stress uncertainty, moments of helplessness, or situations where regaining control is critical.",
    caution:
      "Do not confuse resilience with carrying everything alone. Ask for support when needed.",
  },
] as const satisfies readonly FrameworkDefinition[];

const LIVE_REFRAME_DELAY_OPTIONS = [3, 5, 10] as const;
type LiveReframeDelay = (typeof LIVE_REFRAME_DELAY_OPTIONS)[number] | "";
const DEFAULT_LIVE_REFRAME_DELAY: LiveReframeDelay = "";

const MOODS = [
  { value: "calm", label: "Calm" },
  { value: "hopeful", label: "Hopeful" },
  { value: "stressed", label: "Stressed" },
  { value: "tired", label: "Tired" },
  { value: "excited", label: "Excited" },
  { value: "other", label: "Other" },
];

const REFLECTION_PROMPTS = [
  "What moment stayed with me most today?",
  "What am I feeling underneath the surface?",
  "What did I handle better than before?",
  "What do I need from myself right now?",
];

const DRAFT_KEY = "mindweave-journal-draft";
const ENTRY_SUBTITLES_KEY = "mindweave-entry-subtitles";
const MAX_ENTRY_WORDS = 100;
const THERAPEUTIC_FRAMEWORK_VALUES: TherapeuticFrameworkId[] = ["cbt", "iceberg", "growth"];

type FrameworkValue = FrameworkId | "";
type PersistedFrameworkValue = TherapeuticFrameworkId;

export function HomePage() {
  const [title, setTitle] = useState("");
  const [chunks, setChunks] = useState<EntryChunk[]>([]);
  const [text, setText] = useState("");
  const [framework, setFramework] = useState<FrameworkValue>("");
  const [isFrameworkModalOpen, setIsFrameworkModalOpen] = useState(false);
  const [liveReframeDelay, setLiveReframeDelay] =
    useState<LiveReframeDelay>(DEFAULT_LIVE_REFRAME_DELAY);
  const [preferredCulturalFramework, setPreferredCulturalFramework] = useState<CulturalFrameworkId | "">("");
  const [preferredCulturalToneStrength, setPreferredCulturalToneStrength] =
    useState<CulturalToneStrength>(DEFAULT_CULTURAL_TONE_STRENGTH);
  const [isConfigLocked, setIsConfigLocked] = useState(false);
  const [mood, setMood] = useState("");
  const [intention, setIntention] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [liveCountdown, setLiveCountdown] = useState<number | null>(null);
  const [lastExplainability, setLastExplainability] = useState<ExplainabilityPayload | null>(null);
  const [lastSafetySignal, setLastSafetySignal] = useState<SafetySignal | null>(null);
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editingUserText, setEditingUserText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [showMoodInfo, setShowMoodInfo] = useState(false);
  const liveRequestId = useRef(0);
  const liveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [demoReframingRemaining, setDemoReframingRemaining] = useState(() =>
    DEMO_MODE ? getDemoRemaining() : 0
  );

  const selectedFramework = useMemo(
    () => FRAMEWORKS.find((item) => item.value === framework),
    [framework]
  );

  const therapeuticFrameworks = useMemo(
    () => FRAMEWORKS.filter((item) => item.category === "therapeutic"),
    []
  );
  const committedUserText = useMemo(
    () => chunks.map((chunk) => chunk.userText).join("\n\n"),
    [chunks]
  );

  const fullJournalUserText = useMemo(() => {
    if (committedUserText && text.trim()) {
      return `${committedUserText}\n\n${text.trimEnd()}`;
    }
    if (committedUserText) {
      return committedUserText;
    }
    return text.trimEnd();
  }, [committedUserText, text]);

  const remainingChars = 5000 - fullJournalUserText.length;
  const countWords = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };
  const takeFirstWords = (value: string, maxWords: number) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return value;
    if (maxWords <= 0) return "";
    return words.slice(0, maxWords).join(" ");
  };

  const committedWordCount = useMemo(() => countWords(committedUserText), [committedUserText]);
  const totalWordCount = useMemo(() => countWords(fullJournalUserText), [fullJournalUserText]);
  const remainingWords = Math.max(0, MAX_ENTRY_WORDS - totalWordCount);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  const selectedMoodLabel = useMemo(
    () => MOODS.find((option) => option.value === mood)?.label.toLowerCase() ?? "",
    [mood]
  );
  const normalizedIntention = useMemo(
    () => intention.trim().replace(/^to\s+/i, "").trim(),
    [intention]
  );
  const checkInSummary = useMemo(() => {
    if (selectedMoodLabel && normalizedIntention) {
      return `I'm feeling ${selectedMoodLabel} today and want to ${normalizedIntention}.`;
    }
    if (selectedMoodLabel) {
      return `I'm feeling ${selectedMoodLabel} today.`;
    }
    if (normalizedIntention) {
      return `Today I want to ${normalizedIntention}.`;
    }
    return "";
  }, [selectedMoodLabel, normalizedIntention]);

  useEffect(() => {
    const rawDraft = localStorage.getItem(DRAFT_KEY);
    if (!rawDraft) return;

    try {
      const parsed = JSON.parse(rawDraft) as {
        title?: string;
        chunks?: EntryChunk[];
        text?: string;
        framework?: FrameworkValue;
        liveReframeDelay?: number;
        isConfigLocked?: boolean;
        mood?: string;
        intention?: string;
      };

      setTitle(parsed.title ?? "");
      setChunks(parsed.chunks ?? []);
      setText(parsed.text ?? "");
      setFramework(
        parsed.framework && THERAPEUTIC_FRAMEWORK_VALUES.includes(parsed.framework as TherapeuticFrameworkId)
          ? (parsed.framework as TherapeuticFrameworkId)
          : ""
      );
      if (
        parsed.liveReframeDelay &&
        LIVE_REFRAME_DELAY_OPTIONS.includes(parsed.liveReframeDelay as (typeof LIVE_REFRAME_DELAY_OPTIONS)[number])
      ) {
        setLiveReframeDelay(parsed.liveReframeDelay as LiveReframeDelay);
      }
      const hasDraftContent = Boolean(parsed.text?.trim()) || (parsed.chunks?.length ?? 0) > 0;
      setIsConfigLocked(parsed.isConfigLocked ?? hasDraftContent);
      setMood(parsed.mood ?? "");
      setIntention(parsed.intention ?? "");
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const rawSettings = localStorage.getItem("mindweave-settings");
    if (!rawSettings) return;

    try {
      const parsed = JSON.parse(rawSettings) as {
        defaultFramework?: TherapeuticFrameworkId | "";
        defaultLiveReframeDelay?: 3 | 5 | 10 | "";
        preferredCulturalFramework?: CulturalFrameworkId | "";
        preferredCulturalToneStrength?: CulturalToneStrength;
      };

      if (
        parsed.defaultFramework &&
        THERAPEUTIC_FRAMEWORK_VALUES.includes(parsed.defaultFramework) &&
        !framework
      ) {
        setFramework(parsed.defaultFramework);
      }

      if (parsed.defaultLiveReframeDelay && !liveReframeDelay) {
        setLiveReframeDelay(parsed.defaultLiveReframeDelay);
      }

      if (parsed.preferredCulturalFramework) {
        setPreferredCulturalFramework(parsed.preferredCulturalFramework);
      }

      if (parsed.preferredCulturalToneStrength) {
        setPreferredCulturalToneStrength(parsed.preferredCulturalToneStrength);
      }
    } catch {
      // Ignore malformed settings.
    }
  }, [framework, liveReframeDelay]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const draft = {
        title,
        chunks,
        text,
        framework,
        liveReframeDelay,
        isConfigLocked,
        mood,
        intention,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSavedAt(new Date());
    }, 450);

    return () => clearTimeout(timeout);
  }, [
    title,
    chunks,
    text,
    framework,
    liveReframeDelay,
    isConfigLocked,
    mood,
    intention,
  ]);

  useEffect(() => {
    if (editingChunkId) {
      setLiveCountdown(null);
      setLiveLoading(false);
      return;
    }

    const trimmedText = text.trim();

    if (!isConfigLocked || !framework || !liveReframeDelay || trimmedText.length < 5) {
      setLiveCountdown(null);
      setLiveLoading(false);
      setLiveError("");
      return;
    }

    if (DEMO_MODE && isDemoLimitReached()) {
      setLiveCountdown(null);
      setLiveLoading(false);
      return;
    }

    const requestId = ++liveRequestId.current;
    const draftSnapshot = trimmedText;

    setLiveCountdown(liveReframeDelay);

    const countdownInterval = setInterval(() => {
      setLiveCountdown((value) => {
        if (value === null || value <= 1) return 1;
        return value - 1;
      });
    }, 1000);
    liveCountdownIntervalRef.current = countdownInterval;

    const timeout = setTimeout(() => {
      void commitLiveReframe(draftSnapshot, requestId);
    }, liveReframeDelay * 1000);
    liveTimeoutRef.current = timeout;

    return () => {
      clearLiveReframeTimers();
    };
  }, [
    text,
    framework,
    editingChunkId,
    liveReframeDelay,
    isConfigLocked,
    preferredCulturalFramework,
    preferredCulturalToneStrength,
  ]);

  function addPrompt(prompt: string) {
    if (remainingWords <= 0) {
      setError(`Entry cannot exceed ${MAX_ENTRY_WORDS} words.`);
      return;
    }
    const line = `\n${prompt}\n`;
    if (fullJournalUserText.includes(prompt)) return;
    setText((currentText) => {
      const next = `${currentText.trimEnd()}${line}`.trimStart();
      const maxWordsForDraft = Math.max(0, MAX_ENTRY_WORDS - committedWordCount);
      const limited = takeFirstWords(next, maxWordsForDraft);
      if (limited !== next) {
        setError(`Entry cannot exceed ${MAX_ENTRY_WORDS} words.`);
      }
      return limited;
    });
    setLiveError("");
  }

  function removeChunk(id: string) {
    setChunks((previous) => previous.filter((chunk) => chunk.id !== id));
    setLiveError("");
    if (editingChunkId === id) {
      setEditingChunkId(null);
      setEditingUserText("");
      setEditError("");
    }
  }

  function beginEditChunk(chunk: EntryChunk) {
    setEditingChunkId(chunk.id);
    setEditingUserText(chunk.userText);
    setEditError("");
  }

  function cancelEditChunk() {
    setEditingChunkId(null);
    setEditingUserText("");
    setEditError("");
  }

  function chooseFramework(nextFramework: TherapeuticFrameworkId) {
    if (isConfigLocked) return;
    setFramework(nextFramework);
    setIsFrameworkModalOpen(false);
    setLiveError("");
  }

  function clearLiveReframeTimers() {
    if (liveTimeoutRef.current) {
      clearTimeout(liveTimeoutRef.current);
      liveTimeoutRef.current = null;
    }
    if (liveCountdownIntervalRef.current) {
      clearInterval(liveCountdownIntervalRef.current);
      liveCountdownIntervalRef.current = null;
    }
  }

  async function commitLiveReframe(draftSnapshot: string, requestId: number) {
    clearLiveReframeTimers();
    setLiveCountdown(null);

    if (DEMO_MODE && isDemoLimitReached()) {
      setLiveError(`Demo limit reached (${MAX_DEMO_REFRAMES} reframes). Create a free account for unlimited access!`);
      return;
    }

    setLiveLoading(true);
    setLiveError("");

    try {
      const preview = await previewReframe({
        text: draftSnapshot,
        framework: framework as PersistedFrameworkValue,
        culturalFramework: preferredCulturalFramework || undefined,
        culturalToneStrength: preferredCulturalFramework ? preferredCulturalToneStrength : undefined,
      });

      if (requestId !== liveRequestId.current) return;
      if (text.trim() !== draftSnapshot) return;

      setLastExplainability(preview.explainability ?? null);
      setLastSafetySignal(preview.safety ?? null);

      if (DEMO_MODE) {
        incrementDemoReframeCount();
        setDemoReframingRemaining(getDemoRemaining());
      }

      setChunks((previous) => [
        ...previous,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          userText: draftSnapshot,
          aiText: preview.reframedText,
        },
      ]);
      setText("");
    } catch (err: any) {
      if (requestId !== liveRequestId.current) return;
      setLiveError(err.message || "Could not generate live reframing preview");
    } finally {
      if (requestId !== liveRequestId.current) return;
      setLiveLoading(false);
    }
  }

  async function triggerImmediateReframe() {
    if (DEMO_MODE && isDemoLimitReached()) {
      setLiveError(`Demo limit reached (${MAX_DEMO_REFRAMES} reframes). Create a free account for unlimited access!`);
      return;
    }

    if (!framework) {
      setLiveError("Choose a framework before reframing.");
      return;
    }

    const draftSnapshot = text.trim();
    if (draftSnapshot.length < 5) {
      setLiveError("Write at least 5 characters before reframing.");
      return;
    }

    const requestId = ++liveRequestId.current;
    await commitLiveReframe(draftSnapshot, requestId);
  }

  function buildEntryChunksForSave(): EntryChunk[] {
    const committedChunks = chunks.map((chunk) => ({
      id: chunk.id,
      userText: chunk.userText,
      aiText: chunk.aiText,
    }));

    const pendingDraft = text.trim();
    if (!pendingDraft) {
      return committedChunks;
    }

    return [
      ...committedChunks,
      {
        id: `draft-${Date.now()}`,
        userText: pendingDraft,
        aiText: "",
      },
    ];
  }

  function confirmConfiguration() {
    if (!framework || !liveReframeDelay) {
      setError("Please select a framework and countdown, then confirm your options.");
      return;
    }
    setError("");
    setSaveNotice("");
    setIsConfigLocked(true);
  }

  async function saveChunkEdit(chunkId: string) {
    if (DEMO_MODE && isDemoLimitReached()) {
      setEditError(`Demo limit reached (${MAX_DEMO_REFRAMES} reframes). Create a free account for unlimited access!`);
      return;
    }

    if (!framework) {
      setEditError("Choose a framework before reframing edited text.");
      return;
    }

    const trimmed = editingUserText.trim();
    if (trimmed.length < 5) {
      setEditError("Please write at least 5 characters before reframing.");
      return;
    }

    const projectedCommittedText = chunks
      .map((chunk) => (chunk.id === chunkId ? trimmed : chunk.userText))
      .join("\n\n");
    const projectedWords = countWords(projectedCommittedText) + countWords(text);
    if (projectedWords > MAX_ENTRY_WORDS) {
      setEditError(`Entry cannot exceed ${MAX_ENTRY_WORDS} words.`);
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      const preview = await previewReframe({
        text: trimmed,
        framework: framework as PersistedFrameworkValue,
        culturalFramework: preferredCulturalFramework || undefined,
        culturalToneStrength: preferredCulturalFramework ? preferredCulturalToneStrength : undefined,
      });

      setLastExplainability(preview.explainability ?? null);
      setLastSafetySignal(preview.safety ?? null);

      if (DEMO_MODE) {
        incrementDemoReframeCount();
        setDemoReframingRemaining(getDemoRemaining());
      }

      setChunks((previous) =>
        previous.map((chunk) =>
          chunk.id === chunkId
            ? {
                ...chunk,
                userText: trimmed,
                aiText: preview.reframedText,
              }
            : chunk
        )
      );
      cancelEditChunk();
    } catch (err: any) {
      setEditError(err.message || "Could not reframe edited text");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaveNotice("");

    if (!isConfigLocked) {
      setError("Please confirm your options before writing.");
      return;
    }
    if (!framework || !liveReframeDelay) {
      setError("Framework and countdown must be confirmed before saving.");
      return;
    }
    if (!fullJournalUserText.trim()) {
      setError("Please write something in your journal entry.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter an entry title before saving.");
      return;
    }
    if (totalWordCount > MAX_ENTRY_WORDS) {
      setError(`Entry cannot exceed ${MAX_ENTRY_WORDS} words.`);
      return;
    }
    if (!framework) {
      setError("Please select a thinking framework.");
      return;
    }

    setLoading(true);
    try {
      const createdEntry = await createEntry({
        title: title.trim(),
        text: fullJournalUserText.trim(),
        framework,
        culturalFramework: preferredCulturalFramework || undefined,
        culturalToneStrength: preferredCulturalFramework ? preferredCulturalToneStrength : undefined,
        chunks: buildEntryChunksForSave(),
      });
      setLastExplainability(createdEntry.explainability ?? null);
      setLastSafetySignal(createdEntry.safety ?? null);
      if (checkInSummary) {
        const raw = localStorage.getItem(ENTRY_SUBTITLES_KEY);
        const existing = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        existing[createdEntry.id] = checkInSummary;
        localStorage.setItem(ENTRY_SUBTITLES_KEY, JSON.stringify(existing));
      }
      setTitle("");
      setChunks([]);
      setText("");
      setFramework("");
      setLiveReframeDelay(DEFAULT_LIVE_REFRAME_DELAY);
      setIsConfigLocked(false);
      setMood("");
      setIntention("");
      setLiveError("");
      setLiveCountdown(null);
      setSaveNotice("Entry saved. You can view it in Memory Lane.");
      localStorage.removeItem(DRAFT_KEY);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen min-h-[calc(100vh-7rem)] bg-[repeating-linear-gradient(to_bottom,#fffef9_0px,#fffef9_34px,#ece7dc_35px)] px-3 py-6 sm:px-5 lg:px-6">
      <GuidedTour steps={TOUR_STEPS} />
      <div className="mx-auto max-w-[92rem] space-y-6">

      {/* Demo mode banner */}
      {DEMO_MODE && (
        <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-3 text-sm shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                DEMO
              </span>
              <span className="text-stone-700">
                You're in demo mode — no account needed!
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-stone-600">
                <strong>{demoReframingRemaining}</strong> / {MAX_DEMO_REFRAMES} reframes remaining
              </span>
              {demoReframingRemaining === 0 && (
                <Link
                  to="/"
                  className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700"
                >
                  Create a free account
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      <section className="rounded-3xl border border-amber-200/70 bg-[linear-gradient(140deg,#fff8ea_0%,#fffdf6_45%,#f6f7ee_100%)] p-6 shadow-[0_24px_60px_-32px_rgba(94,72,36,0.35)] sm:p-8">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div>
            <h1 className="text-4xl leading-tight text-stone-800" style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif" }}>
              Dear Journal,
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-4 py-2 text-sm text-stone-700">
            <CalendarDays className="h-4 w-4 text-amber-700" />
            {today}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-amber-200/80 bg-white/75 p-4">
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Choose your therapeutic reframing lens
              </label>
              <button
                type="button"
                onClick={() => setIsFrameworkModalOpen(true)}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-left transition-colors hover:border-amber-300"
                disabled={loading || isConfigLocked}
                data-tour="framework-selector"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-amber-700/80">Framework selector</p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {selectedFramework ? selectedFramework.label : "Open framework guide and choose"}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {selectedFramework
                    ? selectedFramework.description
                    : "Tap to compare CBT, Iceberg, and Growth in detail before selecting."}
                </p>
              </button>
              {framework && (
                <p className="mt-2 text-xs text-stone-500">
                  {selectedFramework?.description}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-white/75 p-4" data-tour="countdown-selector">
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Live reframe countdown
              </label>
              <Select
                value={String(liveReframeDelay)}
                onValueChange={(value) => setLiveReframeDelay(Number(value) as LiveReframeDelay)}
                disabled={loading || isConfigLocked}
              >
                <SelectTrigger className="border-amber-200 bg-white">
                  <SelectValue placeholder="Choose delay" />
                </SelectTrigger>
                <SelectContent>
                  {LIVE_REFRAME_DELAY_OPTIONS.map((seconds) => (
                    <SelectItem key={seconds} value={String(seconds)}>
                      {seconds} seconds
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-stone-500">
                Choose how long to pause after typing before auto-reframing starts. Press Enter to fast-forward reframing instantly. Use Shift+Enter for a new line.
              </p>
              <p className="mt-2 text-xs text-indigo-700/90">
                Cultural tone and regional framework are configured in Settings and applied automatically.
                <Link to="/settings" className="ml-1 font-semibold hover:text-indigo-800">
                  Change in Settings
                </Link>
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4">
              <p className="text-xs text-amber-900">
                Please select your therapeutic framework and reframing countdown before you begin writing. Cultural overlay settings are applied automatically from Settings.
              </p>
              <Button
                type="button"
                onClick={confirmConfiguration}
                className="mt-3 h-10 w-full bg-amber-700 text-amber-50 hover:bg-amber-800"
                disabled={loading || isConfigLocked || !framework || !liveReframeDelay}
                data-tour="confirm-options"
              >
                {isConfigLocked ? "Options locked for this entry" : "Confirm options"}
              </Button>
            </div>

            {lastExplainability ? (
              <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-sky-900">
                  <Info className="h-4 w-4" /> AI Explainability
                </p>
                <p className="mt-2 text-xs text-sky-900/90">
                  Framework: <span className="font-semibold">{lastExplainability.framework}</span>
                </p>
                <ul className="mt-2 space-y-1 text-xs text-sky-900/90">
                  {lastExplainability.steps.map((step, index) => (
                    <li key={`${step}-${index}`}>• {step}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {lastSafetySignal?.level === "high" ? (
              <div className="rounded-2xl border border-red-200/80 bg-red-50/80 p-4">
                <p className="text-sm font-semibold text-red-900">Safety escalation</p>
                <p className="mt-1 text-xs text-red-900/90">{lastSafetySignal.message}</p>
                <p className="mt-2 text-xs text-red-900/90">
                  Country support: <span className="font-semibold capitalize">{lastSafetySignal.supportCountry}</span>
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-900/90">
                  {lastSafetySignal.supportResources.map((resource) => (
                    <li key={`${resource.label}-${resource.contact}`}>
                      • {resource.label}: {resource.contact}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-amber-200/80 bg-white/65 p-4 backdrop-blur-sm">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title"
                className="mb-3 w-full border-0 bg-transparent px-0 text-2xl text-stone-800 placeholder:text-stone-400 focus:outline-none"
                style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif" }}
                maxLength={100}
                disabled={loading}
                data-tour="entry-title"
              />

              <div className="relative rounded-xl border border-amber-100 bg-[repeating-linear-gradient(to_bottom,#fffef9_0px,#fffef9_30px,#ece7dc_31px)] p-4" data-tour="writing-area">
                <div className="pointer-events-none absolute inset-y-0 left-8 w-px bg-rose-200/80" />
                <div className="flex min-h-[320px] flex-col space-y-3 pl-8 pr-2 text-[17px] leading-[31px]" style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>
                  {chunks.map((chunk) => (
                    <div key={chunk.id} className="rounded-md border border-amber-100/80 bg-white/50 p-2">

                      {editingChunkId === chunk.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingUserText}
                            onChange={(e) => setEditingUserText(e.target.value)}
                            className="min-h-[90px] w-full resize-y rounded-md border border-amber-200 bg-white px-2 py-1 text-[16px] leading-7 text-stone-800 focus:outline-none"
                            disabled={editLoading}
                          />
                          {editError && <p className="text-sm text-destructive">{editError}</p>}
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => saveChunkEdit(chunk.id)}
                              className="h-8 bg-indigo-700 hover:bg-indigo-800"
                              disabled={editLoading}
                            >
                              {editLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                              Reframe edited block
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="h-8" onClick={cancelEditChunk} disabled={editLoading}>
                              <X className="mr-1 h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <p className="whitespace-pre-wrap text-stone-800">{chunk.userText}</p>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => beginEditChunk(chunk)}
                                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeChunk(chunk.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-900">
                            {chunk.aiText}
                          </p>
                        </>
                      )}
                    </div>
                  ))}

                  <textarea
                    placeholder={
                      isConfigLocked
                        ? "Pause. Breathe. Write freely about what happened, what you felt, and what you need."
                        : "Choose framework + countdown, then press Confirm to begin typing."
                    }
                    value={text}
                    onChange={(e) => {
                      const nextRaw = e.target.value.slice(0, Math.max(0, remainingChars + text.length));
                      const maxWordsForDraft = Math.max(0, MAX_ENTRY_WORDS - committedWordCount);
                      const nextWords = nextRaw.trim().split(/\s+/).filter(Boolean);
                      const next =
                        nextWords.length <= maxWordsForDraft
                          ? nextRaw
                          : nextWords.slice(0, maxWordsForDraft).join(" ");
                      setText(next);
                      setLiveError("");
                      if (nextWords.length > maxWordsForDraft) {
                        setError(`Entry cannot exceed ${MAX_ENTRY_WORDS} words.`);
                      } else {
                        setError("");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || event.shiftKey) return;
                      event.preventDefault();
                      if (!isConfigLocked || loading || liveLoading) return;
                      void triggerImmediateReframe();
                    }}
                    className="min-h-[140px] w-full flex-1 resize-none border-0 bg-transparent p-0 text-[17px] leading-[31px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
                    style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}
                    disabled={loading || !isConfigLocked}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                <span>{totalWordCount}/{MAX_ENTRY_WORDS} words</span>
                <span>
                  {lastSavedAt
                    ? `Draft saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Draft not saved yet"}
                </span>
              </div>

              <div className="mt-3 min-h-[24px] text-sm">
                {!isConfigLocked && <p className="text-stone-600">Confirm the left sidebar options to start writing.</p>}
                {isConfigLocked && framework && text.trim().length >= 5 && liveCountdown && !liveLoading && (
                  <p className="text-stone-600">Live reframe starts in {liveCountdown}s...</p>
                )}
                {isConfigLocked && framework && text.trim().length >= 5 && liveLoading && (
                  <p className="inline-flex items-center text-emerald-800">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reframing your latest writing...
                  </p>
                )}
                {liveError && <p className="text-destructive">{liveError}</p>}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saveNotice && <p className="text-sm text-emerald-800">{saveNotice}</p>}

            {DEMO_MODE ? (
              <p className="text-center text-sm text-stone-500 italic">
                Saving entries is not available in demo mode. Create a free account for the full experience!
              </p>
            ) : (
            <Button
              type="submit"
              className="h-11 w-full bg-emerald-700 text-emerald-50 hover:bg-emerald-800"
              disabled={loading || !isConfigLocked}
              data-tour="save-entry"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving entry...
                </>
              ) : (
                "Save entry"
              )}
            </Button>
            )}
          </form>

          <aside className="space-y-4">
            <Card className="border-amber-200/70 bg-white/80 shadow-none" data-tour="mood-checkin">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base text-stone-800">How are you feeling?</CardTitle>
                  <button
                    type="button"
                    onClick={() => setShowMoodInfo(true)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    aria-label="What is this section for?"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((moodOption) => (
                    <button
                      type="button"
                      key={moodOption.value}
                      onClick={() => setMood(mood === moodOption.value ? "" : moodOption.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        mood === moodOption.value
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-amber-200 bg-white text-stone-600 hover:border-amber-300"
                      }`}
                    >
                      {moodOption.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">
                    Intention for this entry
                  </label>
                  <input
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="E.g. reflect on today's challenges and find clarity"
                    className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-emerald-700/30"
                    maxLength={80}
                    disabled={loading}
                  />
                </div>

                {checkInSummary && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
                    <Heart className="mr-1 inline h-3.5 w-3.5" />
                    {checkInSummary}
                  </div>
                )}
              </CardContent>
            </Card>

            {showMoodInfo && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                onClick={() => setShowMoodInfo(false)}
                role="presentation"
              >
                <div
                  className="w-full max-w-md rounded-2xl border border-amber-200 bg-[linear-gradient(160deg,#fff9ec_0%,#fffef7_45%,#f8f8ef_100%)] p-6 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-stone-800">About This Section</h3>
                    <button
                      type="button"
                      onClick={() => setShowMoodInfo(false)}
                      className="inline-flex items-center rounded-md border border-amber-200 bg-white px-2 py-1 text-sm text-stone-600 hover:bg-amber-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3 text-sm text-stone-700">
                    <p>
                      <strong>Mood check-in</strong> helps you name how you feel before writing. Research shows that labelling emotions reduces their intensity and improves self-awareness — a practice called <em>affect labelling</em>.
                    </p>
                    <p>
                      <strong>Setting an intention</strong> gives your writing a gentle direction. It is not a strict rule — just a soft focus so the AI reframing can better understand what matters to you right now.
                    </p>
                    <p className="text-xs text-stone-500">
                      Both fields are optional and can be changed at any time before saving.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Card className="border-amber-200/70 bg-white/80 shadow-none" data-tour="writing-prompts">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-stone-800">Writing prompts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {REFLECTION_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => addPrompt(prompt)}
                    className="w-full rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-left text-xs text-stone-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!isConfigLocked}
                  >
                    {prompt}
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      {isFrameworkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          onClick={() => setIsFrameworkModalOpen(false)}
          role="presentation"
        >
          <div
            className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-amber-200 bg-[linear-gradient(160deg,#fff9ec_0%,#fffef7_45%,#f8f8ef_100%)] p-5 shadow-[0_30px_60px_-28px_rgba(33,27,16,0.45)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="framework-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700/80">Framework guide</p>
                <h2 id="framework-modal-title" className="mt-1 text-2xl text-stone-800">
                  Choose the reframing lens for this entry
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Choose a therapeutic framework. Cultural context is configured separately in Settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFrameworkModalOpen(false)}
                className="inline-flex items-center rounded-md border border-amber-200 bg-white px-2 py-1 text-sm text-stone-600 hover:bg-amber-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-amber-800">
                  Therapeutic frameworks
                </h3>
                <p className="mb-3 text-xs text-stone-600">
                  Evidence-aligned thinking lenses for structure, emotional depth, and growth.
                </p>
                <div className="grid gap-4 lg:grid-cols-3">
                  {therapeuticFrameworks.map((fw) => {
                    const selected = framework === fw.value;
                    return (
                      <article
                        key={fw.value}
                        className={`rounded-2xl border p-4 ${
                          selected
                            ? "border-emerald-400 bg-emerald-50/70 shadow-[0_14px_35px_-24px_rgba(22,163,74,0.55)]"
                            : "border-amber-200/80 bg-white/80"
                        }`}
                      >
                        <h3 className="text-lg font-semibold text-stone-800">{fw.label}</h3>
                        <p className="mt-2 text-sm text-stone-600">{fw.description}</p>

                        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/55 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">How it works</p>
                          <p className="mt-1 text-sm text-stone-700">{fw.deepExplanation}</p>
                        </div>

                        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">Best for</p>
                          <p className="mt-1 text-sm text-stone-700">{fw.bestFor}</p>
                        </div>

                        <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-800">Use carefully when</p>
                          <p className="mt-1 text-sm text-stone-700">{fw.caution}</p>
                        </div>

                        <Button
                          type="button"
                          onClick={() => chooseFramework(fw.value as TherapeuticFrameworkId)}
                          className="mt-4 h-10 w-full bg-emerald-700 text-emerald-50 hover:bg-emerald-800"
                        >
                          {selected ? "Selected" : "Use this framework"}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
