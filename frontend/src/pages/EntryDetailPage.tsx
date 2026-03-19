import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEntry, type EntryDetail } from "@/services/api";
import { ArrowLeft, CalendarDays, Loader2, Sparkles } from "lucide-react";

const FRAMEWORK_LABELS: Record<string, string> = {
  cbt: "CBT (Cognitive Behavioral Therapy)",
  iceberg: "Iceberg Model",
  growth: "Growth Mindset",
};

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getEntry(id)
      .then(setEntry)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || "Entry not found"}</p>
        <Link to="/memory-lane" className="text-primary underline text-sm mt-2 inline-block">
          Back to Memory Lane
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/memory-lane">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Memory Lane
        </Button>
      </Link>

      <Card className="border-amber-200/80 bg-[linear-gradient(145deg,#fff9ee_0%,#fffef7_45%,#f8f8ef_100%)] shadow-[0_20px_55px_-32px_rgba(74,53,21,0.4)]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xl text-stone-800">Journal Entry</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-300 bg-white/70 text-stone-700">
                {FRAMEWORK_LABELS[entry.framework] || entry.framework}
              </Badge>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-3 py-1 text-xs text-stone-600">
            <CalendarDays className="h-3.5 w-3.5 text-amber-700" />
            {new Date(entry.createdAt).toLocaleString()}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative rounded-xl border border-amber-100 bg-[repeating-linear-gradient(to_bottom,#fffef9_0px,#fffef9_30px,#ece7dc_31px)] p-4">
            <div className="pointer-events-none absolute inset-y-0 left-8 w-px bg-rose-200/80" />
            <h3 className="mb-2 pl-8 text-sm font-medium text-stone-500">
              Original Thought
            </h3>
            <p className="whitespace-pre-wrap pl-8 pr-2 text-[16px] leading-[31px] text-stone-800" style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>
              {entry.originalText}
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/75 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-indigo-700">
              <Sparkles className="h-4 w-4" />
              Reframed Perspective
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-indigo-900">
              {entry.reframedText}
            </p>
          </div>

          {entry.tags.length > 0 && (
            <div className="rounded-xl border border-amber-200/70 bg-white/70 p-4">
              <h3 className="mb-2 text-sm font-medium text-stone-500">
                Topics
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
