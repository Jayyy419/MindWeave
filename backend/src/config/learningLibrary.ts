export type TherapeuticFrameworkId = "cbt" | "iceberg" | "growth";

export interface LearningLesson {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  difficulty: "beginner" | "intermediate";
  objectives: string[];
}

export interface LearningFramework {
  id: TherapeuticFrameworkId;
  label: string;
  description: string;
  lessons: LearningLesson[];
}

export const LEARNING_LIBRARY: LearningFramework[] = [
  {
    id: "cbt",
    label: "CBT Foundations",
    description:
      "Learn how thoughts, emotions, and behavior interact, then practice building balanced alternatives.",
    lessons: [
      {
        id: "cbt-thought-traps",
        title: "Thought Traps 101",
        summary: "Spot common cognitive distortions and name the trap before it spirals.",
        durationMinutes: 12,
        difficulty: "beginner",
        objectives: [
          "Identify 5 common distortions",
          "Separate facts from interpretations",
          "Rewrite one harsh thought into balanced language",
        ],
      },
      {
        id: "cbt-evidence-check",
        title: "Evidence Check Drill",
        summary: "Practice evidence-for/evidence-against thinking in stressful situations.",
        durationMinutes: 15,
        difficulty: "beginner",
        objectives: [
          "Gather evidence for and against a belief",
          "Rate thought confidence before and after",
          "Build one grounded replacement thought",
        ],
      },
      {
        id: "cbt-action-loop",
        title: "Action Loop",
        summary: "Use tiny actions to break emotional paralysis and test new beliefs.",
        durationMinutes: 14,
        difficulty: "intermediate",
        objectives: [
          "Design one low-risk behavioral experiment",
          "Track outcome and emotional shift",
          "Convert result into a repeatable coping loop",
        ],
      },
    ],
  },
  {
    id: "iceberg",
    label: "Iceberg Model Deep Dive",
    description:
      "Move beneath surface reactions to the needs, fears, and beliefs driving emotional intensity.",
    lessons: [
      {
        id: "iceberg-surface-vs-core",
        title: "Surface vs Core",
        summary: "Separate visible reactions from hidden assumptions and needs.",
        durationMinutes: 10,
        difficulty: "beginner",
        objectives: [
          "Map trigger, reaction, and hidden belief",
          "Name one unmet need with precision",
          "Reframe from shame to understanding",
        ],
      },
      {
        id: "iceberg-belief-ladder",
        title: "Belief Ladder",
        summary: "Trace automatic thoughts down to core beliefs and back up to healthier narratives.",
        durationMinutes: 16,
        difficulty: "intermediate",
        objectives: [
          "Extract one recurring core belief",
          "Test whether it is fully true",
          "Write a compassionate replacement belief",
        ],
      },
      {
        id: "iceberg-needs-language",
        title: "Needs Language Toolkit",
        summary: "Turn vague overwhelm into clear emotional and relational needs statements.",
        durationMinutes: 13,
        difficulty: "beginner",
        objectives: [
          "Differentiate feelings from needs",
          "Build one assertive needs statement",
          "Create one self-support script",
        ],
      },
    ],
  },
  {
    id: "growth",
    label: "Growth Mindset Lab",
    description:
      "Replace fixed identity stories with progress-oriented thinking and repeatable learning habits.",
    lessons: [
      {
        id: "growth-fixed-to-flex",
        title: "Fixed to Flexible",
        summary: "Catch fixed mindset statements and rewrite them into process language.",
        durationMinutes: 11,
        difficulty: "beginner",
        objectives: [
          "Recognize fixed-mindset language patterns",
          "Rewrite statements with 'yet' framing",
          "Set one process metric",
        ],
      },
      {
        id: "growth-feedback-filter",
        title: "Feedback Filter",
        summary: "Use criticism as data without collapsing self-worth.",
        durationMinutes: 14,
        difficulty: "intermediate",
        objectives: [
          "Separate signal from noise in feedback",
          "Extract one growth action",
          "Build a non-defensive reflection routine",
        ],
      },
      {
        id: "growth-recovery-routine",
        title: "Setback Recovery Routine",
        summary: "Create a fast routine to recover after mistakes and resume momentum.",
        durationMinutes: 12,
        difficulty: "beginner",
        objectives: [
          "Name setback without identity collapse",
          "Choose one next small win",
          "Define a 24-hour bounce-back plan",
        ],
      },
    ],
  },
];

export const LEARNING_LESSON_MAP = new Map(
  LEARNING_LIBRARY.flatMap((framework) =>
    framework.lessons.map((lesson) => [
      lesson.id,
      {
        frameworkId: framework.id,
        frameworkLabel: framework.label,
        lesson,
      },
    ])
  )
);
