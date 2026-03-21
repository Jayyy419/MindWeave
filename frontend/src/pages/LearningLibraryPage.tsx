import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  completeLesson,
  getLearningFramework,
  listLearningFrameworks,
  type LearningFrameworkDetail,
  type LearningFrameworkSummary,
  type TherapeuticFrameworkId,
} from "@/services/api";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

export function LearningLibraryPage() {
  const [frameworks, setFrameworks] = useState<LearningFrameworkSummary[]>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<TherapeuticFrameworkId | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<LearningFrameworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [frameworkLoading, setFrameworkLoading] = useState(false);
  const [completingLessonId, setCompletingLessonId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    listLearningFrameworks()
      .then((response) => {
        setFrameworks(response.frameworks);
        if (response.frameworks.length > 0) {
          setSelectedFrameworkId(response.frameworks[0].id);
        }
      })
      .catch((err: Error) => setError(err.message || "Failed to load learning library"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedFrameworkId) return;

    setFrameworkLoading(true);
    getLearningFramework(selectedFrameworkId)
      .then((framework) => setSelectedFramework(framework))
      .catch((err: Error) => setError(err.message || "Failed to load framework lessons"))
      .finally(() => setFrameworkLoading(false));
  }, [selectedFrameworkId]);

  const totalCompletedAcrossFrameworks = useMemo(
    () => frameworks.reduce((sum, item) => sum + item.completedLessons, 0),
    [frameworks]
  );

  async function handleCompleteLesson(lessonId: string) {
    if (!selectedFrameworkId) return;

    setCompletingLessonId(lessonId);
    setError("");
    setSuccess("");

    try {
      await completeLesson(lessonId);
      const [frameworkListResponse, frameworkDetailResponse] = await Promise.all([
        listLearningFrameworks(),
        getLearningFramework(selectedFrameworkId),
      ]);
      setFrameworks(frameworkListResponse.frameworks);
      setSelectedFramework(frameworkDetailResponse);
      setSuccess("Lesson completed. Your learning progress now contributes to your level and badges.");
    } catch (err: any) {
      setError(err.message || "Failed to complete lesson");
    } finally {
      setCompletingLessonId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-emerald-200/80 bg-[linear-gradient(145deg,#f3fff6_0%,#fcfffb_45%,#eefdf7_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(16,94,64,0.35)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-700" />
              <h1 className="text-2xl font-bold text-stone-800">Learning Library</h1>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Dive into structured lessons for therapeutic frameworks like CBT, Iceberg, and Growth. Complete lessons to deepen reflection skills and unlock progression through badges and levels.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-stone-700">
            <p>
              Lessons completed: <span className="font-semibold text-stone-900">{totalCompletedAcrossFrameworks}</span>
            </p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="border-emerald-200/80 bg-white/80 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-stone-800">Framework Tracks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {frameworks.map((framework) => (
              <button
                key={framework.id}
                type="button"
                onClick={() => setSelectedFrameworkId(framework.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selectedFrameworkId === framework.id
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-emerald-100 bg-white hover:border-emerald-200"
                }`}
              >
                <p className="font-medium text-stone-900">{framework.label}</p>
                <p className="mt-1 text-xs leading-5 text-stone-600">{framework.description}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-stone-600">
                  <span>
                    {framework.completedLessons}/{framework.totalLessons} lessons
                  </span>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {framework.progressPercent}%
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 bg-white/80 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-stone-800">
              {selectedFramework ? selectedFramework.label : "Select a framework track"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {frameworkLoading ? (
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading lessons...
              </div>
            ) : !selectedFramework ? (
              <p className="text-sm text-stone-600">Choose a framework to view its lessons.</p>
            ) : (
              selectedFramework.lessons.map((lesson) => (
                <div key={lesson.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{lesson.title}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-700">{lesson.summary}</p>
                    </div>
                    {lesson.completed ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-stone-200 bg-white text-stone-600">
                        Pending
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
                    <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700">
                      {lesson.durationMinutes} min
                    </Badge>
                    <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700 capitalize">
                      {lesson.difficulty}
                    </Badge>
                  </div>

                  <div className="mt-3 rounded-lg border border-emerald-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Learning objectives</p>
                    <ul className="mt-2 space-y-1 text-sm text-stone-700">
                      {lesson.objectives.map((objective) => (
                        <li key={objective}>- {objective}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCompleteLesson(lesson.id)}
                      disabled={lesson.completed || completingLessonId === lesson.id}
                      className="bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      {completingLessonId === lesson.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                      {lesson.completed ? "Completed" : "Mark lesson as completed"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
