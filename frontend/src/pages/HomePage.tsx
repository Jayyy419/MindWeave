import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEntry, type EntryDetail } from "@/services/api";
import { Loader2, Sparkles } from "lucide-react";

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

export function HomePage() {
  const [text, setText] = useState("");
  const [framework, setFramework] = useState<"cbt" | "iceberg" | "growth" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EntryDetail | null>(null);

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
      setText("");
      setFramework("");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          What's on your mind?
        </h1>
        <p className="text-muted-foreground">
          Write your thoughts and let AI help you see them from a new perspective.
        </p>
      </div>

      {/* Journal Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New Journal Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Write your thoughts here... What happened today? What's been bothering you? What are you grateful for?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[150px] resize-y"
              maxLength={5000}
              disabled={loading}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{text.length}/5000 characters</span>
            </div>

            {/* Framework selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Thinking Framework</label>
              <Select
                value={framework}
                onValueChange={(v) => setFramework(v as typeof framework)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a framework for reframing..." />
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
                <p className="text-xs text-muted-foreground">
                  {FRAMEWORKS.find((f) => f.value === framework)?.description}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reframing your thoughts...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Submit & Reframe
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result display */}
      {result && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
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
              <h3 className="text-sm font-medium text-purple-700 mb-1">
                Reframed perspective:
              </h3>
              <p className="text-sm text-purple-900 bg-purple-100 rounded-md p-3">
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
