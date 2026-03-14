import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEntry, type EntryDetail } from "@/services/api";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

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
        <Link to="/history" className="text-primary underline text-sm mt-2 inline-block">
          Back to history
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/history">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Journal Entry</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {FRAMEWORK_LABELS[entry.framework] || entry.framework}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Original text */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Original Thought
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {entry.originalText}
            </p>
          </div>

          {/* Reframed text */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Reframed Perspective
            </h3>
            <p className="text-sm leading-relaxed text-purple-900 bg-purple-50 rounded-md p-4 whitespace-pre-wrap">
              {entry.reframedText}
            </p>
          </div>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
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
