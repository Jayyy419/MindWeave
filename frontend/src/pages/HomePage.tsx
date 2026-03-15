import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEntry, type EntryDetail } from "@/services/api";
import { CalendarDays, Feather, Heart, Loader2, Sparkles } from "lucide-react";

const FRAMEWORKS = [
  {
    value: "cbt",
    label: "CBT (Cognitive Behavioral Therapy)",
    description: "Identifies cognitive distortions and offers balanced perspectives",
  },
  {
    value: "iceberg",
    label: "Iceberg Model",
    description: "Explores deeper feelings and needs beneath surface reactions",
  },
  {
    value: "growth",
    label: "Growth Mindset",
    description: "Focuses on learning, effort, and potential",
  },
] as const;

const MOODS = [
  { value: "calm", label: "Calm" },
  { value: "hopeful", label: "Hopeful" },
  { value: "stressed", label: "Stressed" },
  { value: "tired", label: "Tired" },
  { value: "excited", label: "Excited" },
];

const REFLECTION_PROMPTS = [
  "What moment stayed with me most today?",
  "What am I feeling underneath the surface?",
  "What did I handle better than before?",
  "What do I need from myself right now?",
];

const DRAFT_KEY = "mindweave-journal-draft";

type FrameworkValue = "cbt" | "iceberg" | "growth" | "";

export function HomePage() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [framework, setFramework] = useState<FrameworkValue>("");
  const [mood, setMood] = useState("");
  const [intention, setIntention] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EntryDetail | null>(null);

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

  useEffect(() => {
    const rawDraft = localStorage.getItem(DRAFT_KEY);
    if (!rawDraft) return;

    try {
      const parsed = JSON.parse(rawDraft) as {
        title?: string;
        text?: string;
        framework?: FrameworkValue;
        mood?: string;
        intention?: string;
      };

      setTitle(parsed.title ?? "");
      setText(parsed.text ?? "");
      setFramework(parsed.framework ?? "");
      setMood(parsed.mood ?? "");
      setIntention(parsed.intention ?? "");
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const draft = { title, text, framework, mood, intention };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSavedAt(new Date());
    }, 450);

    return () => clearTimeout(timeout);
  }, [title, text, framework, mood, intention]);

  function addPrompt(prompt: string) {
    const line = `\n${prompt}\n`;
    if (text.includes(prompt)) return;
    setText((currentText) => `${currentText.trimEnd()}${line}`.trimStart());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!text.trim()) {
      setError("Please write something in your journal entry.");
      return;
    }
    if (!framework) {
      setError("Please select a thinking framework.");
      return;
    }

    setLoading(true);
    try {
      const entry = await createEntry({ text: text.trim(), framework });
      setResult(entry);
      setTitle("");
      setText("");
      setFramework("");
      setMood("");
      setIntention("");
      localStorage.removeItem(DRAFT_KEY);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-amber-200/70 bg-[linear-gradient(140deg,#fff8ea_0%,#fffdf6_45%,#f6f7ee_100%)] p-6 shadow-[0_24px_60px_-32px_rgba(94,72,36,0.35)] sm:p-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700/80">
              Personal Reflection
            </p>
            <h1 className="mt-2 text-4xl leading-tight text-stone-800" style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif" }}>
              Dear Journal,
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-4 py-2 text-sm text-stone-700">
            <CalendarDays className="h-4 w-4 text-amber-700" />
            {today}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-amber-200/80 bg-white/75 p-4 backdrop-blur-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  <Feather className="mr-1 h-3.5 w-3.5" />
                  Quiet Writing Space
                </Badge>
                {lastSavedAt && (
                  <span className="text-xs text-stone-500">
                    Draft saved at {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title (optional)"
                className="mb-3 w-full border-0 bg-transparent px-0 text-2xl text-stone-800 placeholder:text-stone-400 focus:outline-none"
                style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif" }}
                maxLength={100}
                disabled={loading}
              />

              <div className="relative rounded-xl border border-amber-100 bg-[repeating-linear-gradient(to_bottom,#fffef9_0px,#fffef9_30px,#ece7dc_31px)] p-4">
                <div className="pointer-events-none absolute inset-y-0 left-8 w-px bg-rose-200/80" />
                <textarea
                  placeholder="Pause. Breathe. Write freely about what happened, what you felt, and what you need."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[320px] w-full resize-y border-0 bg-transparent pl-8 pr-2 text-[17px] leading-[31px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
                  style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}
                  maxLength={5000}
                  disabled={loading}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                <span>{text.length}/5000 characters</span>
                <span>{title ? `${title.length}/100 title` : "No title yet"}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-white/75 p-4">
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Choose your reframing lens
              </label>
              <Select
                value={framework}
                onValueChange={(v) => setFramework(v as FrameworkValue)}
                disabled={loading}
              >
                <SelectTrigger className="border-amber-200 bg-white">
                  <SelectValue placeholder="Pick a framework..." />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((fw) => (
                    <SelectItem key={fw.value} value={fw.value}>
                      {fw.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {framework && (
                <p className="mt-2 text-xs text-stone-500">
                  {FRAMEWORKS.find((f) => f.value === framework)?.description}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="h-11 w-full bg-emerald-700 text-emerald-50 hover:bg-emerald-800"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reframing your reflection...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Reflect and Reframe
                </>
              )}
            </Button>
          </form>

          <aside className="space-y-4">
            <Card className="border-amber-200/70 bg-white/80 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-stone-800">How are you feeling?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((moodOption) => (
                    <button
                      type="button"
                      key={moodOption.value}
                      onClick={() => setMood(moodOption.value)}
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
                    placeholder="ex: process my stress"
                    className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-emerald-700/30"
                    maxLength={80}
                    disabled={loading}
                  />
                </div>

                {(mood || intention) && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
                    <Heart className="mr-1 inline h-3.5 w-3.5" />
                    Today: {mood || "unspecified mood"}
                    {intention ? `, intention is ${intention}.` : "."}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-200/70 bg-white/80 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-stone-800">Writing prompts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {REFLECTION_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => addPrompt(prompt)}
                    className="w-full rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-left text-xs text-stone-700 transition-colors hover:bg-amber-100"
                  >
                    {prompt}
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      {/* Result display */}
      {result && (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-700" />
              Reframed Perspective
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Original text */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Your original thought:
              </h3>
              <p className="text-sm">{result.originalText}</p>
            </div>

            {/* Reframed text */}
            <div>
              <h3 className="text-sm font-medium text-emerald-700 mb-1">
                Reframed perspective:
              </h3>
              <p className="text-sm text-emerald-900 bg-emerald-100 rounded-md p-3">
                {result.reframedText}
              </p>
            </div>

            {/* Tags */}
            {result.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Topics identified:
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Framework badge */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Badge variant="outline">
                {FRAMEWORKS.find((f) => f.value === result.framework)?.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(result.createdAt).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
