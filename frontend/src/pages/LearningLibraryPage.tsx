import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  completeLesson,
  getLearningFramework,
  listLearningFrameworks,
  submitLearningAssessment,
  type LearningCourseStep,
  type LearningFrameworkDetail,
  type LearningLesson,
  type LearningFrameworkSummary,
  type TherapeuticFrameworkId,
} from "@/services/api";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";

type CoursePage =
  | {
      id: string;
      type: "reading";
      title: string;
      heading: string;
      body: string[];
    }
  | {
      id: string;
      type: "reflection";
      title: string;
      prompt: string;
      minWords: number;
      answerKey: string;
    }
  | {
      id: string;
      type: "quiz";
      title: string;
      prompt: string;
      options: string[];
      questionId: string;
    }
  | {
      id: string;
      type: "game";
      title: string;
      prompt: string;
      options: string[];
      roundId: string;
      feedback: string;
    }
  | {
      id: string;
      type: "summary";
      title: string;
    };

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildCoursePages(lesson: LearningLesson): CoursePage[] {
  const pages: CoursePage[] = [];

  lesson.course.forEach((step: LearningCourseStep) => {
    if (step.type === "reading") {
      step.pages.forEach((page, pageIndex) => {
        pages.push({
          id: `${step.id}-page-${pageIndex}`,
          type: "reading",
          title: step.title,
          heading: page.heading,
          body: page.body,
        });
      });
      return;
    }

    if (step.type === "reflection") {
      step.prompts.forEach((prompt, promptIndex) => {
        pages.push({
          id: `${step.id}-prompt-${promptIndex}`,
          type: "reflection",
          title: step.title,
          prompt,
          minWords: step.minWords,
          answerKey: `${step.id}-${promptIndex}`,
        });
      });
      return;
    }

    if (step.type === "quiz") {
      step.questions.forEach((question, questionIndex) => {
        pages.push({
          id: `${step.id}-question-${questionIndex}`,
          type: "quiz",
          title: step.title,
          prompt: question.prompt,
          options: question.options,
          questionId: question.id,
        });
      });
      return;
    }

    step.rounds.forEach((round, roundIndex) => {
      pages.push({
        id: `${step.id}-round-${roundIndex}`,
        type: "game",
        title: step.title,
        prompt: round.scenario,
        options: round.options,
        roundId: round.id,
        feedback: round.feedback,
      });
    });
  });

  pages.push({ id: `${lesson.id}-summary`, type: "summary", title: "Course Wrap-Up" });
  return pages;
}

export function LearningLibraryPage() {
  const [frameworks, setFrameworks] = useState<LearningFrameworkSummary[]>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<TherapeuticFrameworkId | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<LearningFrameworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [frameworkLoading, setFrameworkLoading] = useState(false);
  const [completingLessonId, setCompletingLessonId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeCoursePageIndex, setActiveCoursePageIndex] = useState(0);
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [gameAnswers, setGameAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function refreshLearningData(frameworkId: TherapeuticFrameworkId) {
    const [frameworkListResponse, frameworkDetailResponse] = await Promise.all([
      listLearningFrameworks(),
      getLearningFramework(frameworkId),
    ]);
    setFrameworks(frameworkListResponse.frameworks);
    setSelectedFramework(frameworkDetailResponse);
    return frameworkDetailResponse;
  }

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
    setActiveLessonId(null);
    getLearningFramework(selectedFrameworkId)
      .then((framework) => setSelectedFramework(framework))
      .catch((err: Error) => setError(err.message || "Failed to load framework lessons"))
      .finally(() => setFrameworkLoading(false));
  }, [selectedFrameworkId]);

  const totalCompletedAcrossFrameworks = useMemo(
    () => frameworks.reduce((sum, item) => sum + item.completedLessons, 0),
    [frameworks]
  );

  async function handleCompleteLesson(
    lessonId: string,
    assessment?: { score: number; passed: boolean }
  ) {
    if (!selectedFrameworkId) return;

    setCompletingLessonId(lessonId);
    setError("");
    setSuccess("");

    try {
      if (assessment) {
        await submitLearningAssessment(lessonId, {
          source: "course-summary",
          score: assessment.score,
          passed: assessment.passed,
        });
      }

      await completeLesson(lessonId);
      const updatedFramework = await refreshLearningData(selectedFrameworkId);
      const updatedLesson = updatedFramework.lessons.find((lesson) => lesson.id === lessonId);
      if (updatedLesson) {
        setActiveLessonId(updatedLesson.id);
      }
      setSuccess("Lesson completed. Your learning progress now contributes to your level and badges.");
    } catch (err: any) {
      setError(err.message || "Failed to complete lesson");
    } finally {
      setCompletingLessonId(null);
    }
  }

  const activeLesson = useMemo(
    () => selectedFramework?.lessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [selectedFramework, activeLessonId]
  );

  const activeCoursePages = useMemo(() => {
    if (!activeLesson) return [];
    return buildCoursePages(activeLesson);
  }, [activeLesson]);

  const activeCoursePage = activeCoursePages[activeCoursePageIndex] ?? null;

  const lessonEvaluation = useMemo(() => {
    if (!activeLesson) {
      return {
        reflectionsDone: false,
        quizPassed: true,
        gamePassed: true,
        canComplete: false,
        quizScore: 0,
        gameScore: 0,
      };
    }

    let reflectionsDone = true;
    let quizPassed = true;
    let gamePassed = true;
    let totalQuiz = 0;
    let correctQuiz = 0;
    let totalGame = 0;
    let correctGame = 0;

    activeLesson.course.forEach((step) => {
      if (step.type === "reflection") {
        step.prompts.forEach((_, promptIndex) => {
          const answer = reflectionAnswers[`${step.id}-${promptIndex}`] ?? "";
          if (countWords(answer) < step.minWords) {
            reflectionsDone = false;
          }
        });
      }

      if (step.type === "quiz") {
        let stepCorrect = 0;
        step.questions.forEach((question) => {
          totalQuiz += 1;
          if (quizAnswers[question.id] === question.correctIndex) {
            stepCorrect += 1;
            correctQuiz += 1;
          }
        });
        const stepScore = step.questions.length > 0 ? (stepCorrect / step.questions.length) * 100 : 0;
        if (stepScore < step.passingScore) {
          quizPassed = false;
        }
      }

      if (step.type === "game") {
        let stepCorrect = 0;
        step.rounds.forEach((round) => {
          totalGame += 1;
          if (gameAnswers[round.id] === round.correctIndex) {
            stepCorrect += 1;
            correctGame += 1;
          }
        });
        const stepScore = step.rounds.length > 0 ? (stepCorrect / step.rounds.length) * 100 : 0;
        if (stepScore < step.passingScore) {
          gamePassed = false;
        }
      }
    });

    const quizScore = totalQuiz > 0 ? Math.round((correctQuiz / totalQuiz) * 100) : 100;
    const gameScore = totalGame > 0 ? Math.round((correctGame / totalGame) * 100) : 100;

    return {
      reflectionsDone,
      quizPassed,
      gamePassed,
      canComplete: reflectionsDone && quizPassed && gamePassed,
      quizScore,
      gameScore,
    };
  }, [activeLesson, reflectionAnswers, quizAnswers, gameAnswers]);

  const currentPageIsComplete = useMemo(() => {
    if (!activeCoursePage) return false;

    if (activeCoursePage.type === "reading") return true;
    if (activeCoursePage.type === "summary") return true;
    if (activeCoursePage.type === "reflection") {
      return countWords(reflectionAnswers[activeCoursePage.answerKey] ?? "") >= activeCoursePage.minWords;
    }
    if (activeCoursePage.type === "quiz") {
      return typeof quizAnswers[activeCoursePage.questionId] === "number";
    }
    return typeof gameAnswers[activeCoursePage.roundId] === "number";
  }, [activeCoursePage, reflectionAnswers, quizAnswers, gameAnswers]);

  function openLessonCourse(lesson: LearningLesson) {
    setActiveLessonId(lesson.id);
    setActiveCoursePageIndex(0);
    setReflectionAnswers({});
    setQuizAnswers({});
    setGameAnswers({});
    setSuccess("");
    setError("");
  }

  function closeLessonCourse() {
    setActiveLessonId(null);
    setActiveCoursePageIndex(0);
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
                      onClick={() => openLessonCourse(lesson)}
                      className="bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      {lesson.completed ? "Review course" : "Start course"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {activeLesson && activeCoursePage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_30px_80px_-40px_rgba(10,70,50,0.5)]">
            <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Course Lesson</p>
                <h2 className="text-lg font-semibold text-stone-900">{activeLesson.title}</h2>
                <p className="text-xs text-stone-600">
                  Page {activeCoursePageIndex + 1} of {activeCoursePages.length}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLessonCourse}
                className="rounded-lg border border-emerald-200 bg-white p-2 text-stone-700 hover:border-emerald-300"
                aria-label="Close course player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto px-5 py-5">
              <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {activeCoursePage.title}
              </div>

              {activeCoursePage.type === "reading" ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-stone-900">{activeCoursePage.heading}</h3>
                  {activeCoursePage.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-stone-700">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}

              {activeCoursePage.type === "reflection" ? (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-stone-900">Guided Reflection</h3>
                  <p className="text-sm leading-7 text-stone-700">{activeCoursePage.prompt}</p>
                  <textarea
                    value={reflectionAnswers[activeCoursePage.answerKey] ?? ""}
                    onChange={(event) =>
                      setReflectionAnswers((prev) => ({
                        ...prev,
                        [activeCoursePage.answerKey]: event.target.value,
                      }))
                    }
                    className="min-h-[170px] w-full rounded-lg border border-emerald-200 bg-white p-3 text-sm text-stone-800 outline-none ring-emerald-400 focus:ring-2"
                    placeholder="Write your reflection with concrete details from your own experience..."
                  />
                  <p className="text-xs text-stone-600">
                    Word count: {countWords(reflectionAnswers[activeCoursePage.answerKey] ?? "")} / {activeCoursePage.minWords} minimum
                  </p>
                </div>
              ) : null}

              {activeCoursePage.type === "quiz" ? (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-stone-900">Knowledge Check</h3>
                  <p className="text-sm leading-7 text-stone-700">{activeCoursePage.prompt}</p>
                  <div className="space-y-2">
                    {activeCoursePage.options.map((option, optionIndex) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [activeCoursePage.questionId]: optionIndex }))}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                          quizAnswers[activeCoursePage.questionId] === optionIndex
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-stone-200 bg-white text-stone-700 hover:border-emerald-200"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeCoursePage.type === "game" ? (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-stone-900">Decision Sprint</h3>
                  <p className="text-sm leading-7 text-stone-700">{activeCoursePage.prompt}</p>
                  <div className="space-y-2">
                    {activeCoursePage.options.map((option, optionIndex) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setGameAnswers((prev) => ({ ...prev, [activeCoursePage.roundId]: optionIndex }))}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                          gameAnswers[activeCoursePage.roundId] === optionIndex
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-stone-200 bg-white text-stone-700 hover:border-emerald-200"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {typeof gameAnswers[activeCoursePage.roundId] === "number" ? (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{activeCoursePage.feedback}</p>
                  ) : null}
                </div>
              ) : null}

              {activeCoursePage.type === "summary" ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-stone-900">Course Wrap-Up</h3>
                  <p className="text-sm leading-7 text-stone-700">
                    You have reached the final page. Completion is awarded only when reflection prompts are complete and your quiz and game scores pass the lesson threshold.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs uppercase tracking-[0.1em] text-emerald-700">Reflections</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">
                        {lessonEvaluation.reflectionsDone ? "Completed" : "Needs more depth"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs uppercase tracking-[0.1em] text-emerald-700">Quiz Score</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">{lessonEvaluation.quizScore}%</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs uppercase tracking-[0.1em] text-emerald-700">Game Score</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">{lessonEvaluation.gameScore}%</p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="button"
                      onClick={() =>
                        handleCompleteLesson(activeLesson.id, {
                          score: Math.round((lessonEvaluation.quizScore + lessonEvaluation.gameScore) / 2),
                          passed: lessonEvaluation.canComplete,
                        })
                      }
                      disabled={activeLesson.completed || !lessonEvaluation.canComplete || completingLessonId === activeLesson.id}
                      className="bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      {completingLessonId === activeLesson.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                      {activeLesson.completed ? "Lesson already completed" : "Complete this course lesson"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-emerald-100 bg-white px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveCoursePageIndex((index) => Math.max(0, index - 1))}
                disabled={activeCoursePageIndex === 0}
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={() => setActiveCoursePageIndex((index) => Math.min(activeCoursePages.length - 1, index + 1))}
                disabled={activeCoursePageIndex >= activeCoursePages.length - 1 || !currentPageIsComplete}
                className="bg-emerald-700 text-white hover:bg-emerald-800"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
