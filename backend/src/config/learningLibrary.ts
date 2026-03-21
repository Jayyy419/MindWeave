export type TherapeuticFrameworkId = "cbt" | "iceberg" | "growth";

export interface LearningReadingPage {
  heading: string;
  body: string[];
}

export interface LearningQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LearningGameRound {
  id: string;
  scenario: string;
  options: string[];
  correctIndex: number;
  feedback: string;
}

export type LearningCourseStep =
  | {
      id: string;
      type: "reading";
      title: string;
      pages: LearningReadingPage[];
    }
  | {
      id: string;
      type: "reflection";
      title: string;
      instructions: string;
      prompts: string[];
      minWords: number;
    }
  | {
      id: string;
      type: "quiz";
      title: string;
      passingScore: number;
      questions: LearningQuizQuestion[];
    }
  | {
      id: string;
      type: "game";
      title: string;
      instructions: string;
      passingScore: number;
      rounds: LearningGameRound[];
    };

export interface LearningLesson {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  objectives: string[];
  course: LearningCourseStep[];
}

export interface LearningFramework {
  id: TherapeuticFrameworkId;
  label: string;
  description: string;
  lessons: LearningLesson[];
}

type LessonSeed = {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  objectives: string[];
  mapLabel: string;
  triggerExample: string;
  distortedThought: string;
  balancedThought: string;
  actionExperiment: string;
  reflectionPrompts: string[];
  quiz: LearningQuizQuestion[];
  game: LearningGameRound[];
};

function buildCourse(seed: LessonSeed): LearningCourseStep[] {
  return [
    {
      id: `${seed.id}-concept` ,
      type: "reading",
      title: "Core Teaching",
      pages: [
        {
          heading: "Why this lesson matters",
          body: [
            `This lesson trains ${seed.mapLabel} so you can respond instead of react when stress rises.`,
            "You are not trying to force positive thinking. You are training accurate thinking, emotional literacy, and behavior experiments.",
          ],
        },
        {
          heading: "How the pattern usually appears",
          body: [
            `Trigger example: ${seed.triggerExample}`,
            `Automatic pattern: ${seed.distortedThought}`,
            "The first thought feels true because it is fast, emotional, and familiar. Skill-building starts by slowing it down and testing it.",
          ],
        },
        {
          heading: "The three-part map",
          body: [
            `1) Notice pattern  2) Name pattern  3) Shift pattern through behavior and language using ${seed.mapLabel}.`,
            "Use short loops. Big breakthroughs usually come from repeated small corrections, not one perfect insight.",
          ],
        },
        {
          heading: "Worked reframing example",
          body: [
            `Old thought: ${seed.distortedThought}`,
            `Balanced response: ${seed.balancedThought}`,
            "Balanced responses are specific, testable, and compassionate. They reduce overwhelm and improve decision quality.",
          ],
        },
        {
          heading: "Behavioral experiment",
          body: [
            `Try this this week: ${seed.actionExperiment}`,
            "Run the experiment, record what happened, and update your belief with evidence. Confidence grows from proof, not pressure.",
          ],
        },
      ],
    },
    {
      id: `${seed.id}-reflection`,
      type: "reflection",
      title: "Guided Practice Journal",
      instructions:
        "Write short, concrete answers. Focus on one real situation from this week. Use details you can verify, not broad labels.",
      prompts: seed.reflectionPrompts,
      minWords: 45,
    },
    {
      id: `${seed.id}-quiz`,
      type: "quiz",
      title: "Knowledge Check",
      passingScore: 70,
      questions: seed.quiz,
    },
    {
      id: `${seed.id}-game`,
      type: "game",
      title: "Decision Sprint",
      instructions:
        "Treat each round like a real-life micro decision. Choose the response that best applies this lesson's skill under pressure.",
      passingScore: 67,
      rounds: seed.game,
    },
  ];
}

function makeLesson(seed: LessonSeed): LearningLesson {
  return {
    id: seed.id,
    title: seed.title,
    summary: seed.summary,
    durationMinutes: seed.durationMinutes,
    difficulty: seed.difficulty,
    objectives: seed.objectives,
    course: buildCourse(seed),
  };
}

export const LEARNING_LIBRARY: LearningFramework[] = [
  {
    id: "cbt",
    label: "CBT Foundations",
    description:
      "Learn how thoughts, emotions, and behavior interact, then practice building balanced alternatives through full lesson courses.",
    lessons: [
      makeLesson({
        id: "cbt-thought-traps",
        title: "Thought Traps Intensive",
        summary: "Deep dive into distortions and build your first personal trap map.",
        durationMinutes: 42,
        difficulty: "beginner",
        objectives: [
          "Name common distortions in real moments",
          "Separate observable facts from stories",
          "Build a first-pass balanced thought",
        ],
        mapLabel: "the thought trap map",
        triggerExample: "A classmate does not reply for hours after your message.",
        distortedThought: "They are ignoring me because I am annoying.",
        balancedThought: "I do not have enough data yet. There are multiple explanations.",
        actionExperiment: "Delay conclusions for 24 hours and list three neutral explanations before reacting.",
        reflectionPrompts: [
          "Describe a recent moment where your mind jumped to a negative conclusion. What was the actual evidence?",
          "Write a balanced version of that thought and explain how your body/emotions shift after reading it.",
        ],
        quiz: [
          {
            id: "cbt-thought-traps-q1",
            prompt: "Which option is most likely a cognitive distortion?",
            options: [
              "I felt anxious before presenting.",
              "Everyone thinks I am a failure because I made one mistake.",
              "I need more time to finish this draft.",
              "I can ask for feedback tomorrow.",
            ],
            correctIndex: 1,
            explanation: "Overgeneralizing from one event to everyone and forever is a classic distortion pattern.",
          },
          {
            id: "cbt-thought-traps-q2",
            prompt: "Best first step when a harsh thought appears?",
            options: [
              "Believe it immediately",
              "Suppress it and distract yourself",
              "Label the distortion and check evidence",
              "Tell yourself you must stay positive",
            ],
            correctIndex: 2,
            explanation: "Naming the pattern creates distance and allows evidence-based reframing.",
          },
          {
            id: "cbt-thought-traps-q3",
            prompt: "A balanced thought should be:",
            options: [
              "Extremely optimistic",
              "Evidence-based and specific",
              "Self-critical to keep standards high",
              "Short but absolute",
            ],
            correctIndex: 1,
            explanation: "Balanced thoughts are realistic and testable, not blindly positive.",
          },
        ],
        game: [
          {
            id: "cbt-thought-traps-g1",
            scenario: "You get one low quiz grade after several good ones.",
            options: [
              "I am clearly not smart.",
              "One grade is data, not identity. I can analyze what happened.",
              "I should quit this course.",
            ],
            correctIndex: 1,
            feedback: "Correct. You treated the event as information and avoided identity collapse.",
          },
          {
            id: "cbt-thought-traps-g2",
            scenario: "A friend cancels plans last minute.",
            options: [
              "They hate me.",
              "Plans changed. I can check in without assuming intent.",
              "I should send an angry message now.",
            ],
            correctIndex: 1,
            feedback: "Strong move. You stayed grounded and preserved the relationship.",
          },
          {
            id: "cbt-thought-traps-g3",
            scenario: "You made a typo during a presentation.",
            options: [
              "The whole presentation is ruined.",
              "One typo does not erase the core message.",
              "I should never present again.",
            ],
            correctIndex: 1,
            feedback: "Exactly. This reframing lowers panic and keeps performance stable.",
          },
        ],
      }),
      makeLesson({
        id: "cbt-evidence-lab",
        title: "Evidence Lab",
        summary: "Run rigorous evidence-for and evidence-against drills like a researcher.",
        durationMinutes: 48,
        difficulty: "intermediate",
        objectives: [
          "Collect disconfirming evidence deliberately",
          "Rate confidence before and after analysis",
          "Update beliefs based on data",
        ],
        mapLabel: "the evidence table",
        triggerExample: "You think your project update was terrible.",
        distortedThought: "I sounded incompetent and everyone noticed.",
        balancedThought: "Some parts were strong, some need work. Feedback can guide improvement.",
        actionExperiment: "Ask two people for one strength and one improvement area from your update.",
        reflectionPrompts: [
          "Pick one belief you feel 90% sure about. What evidence supports it and what evidence challenges it?",
          "After reviewing both sides, what confidence percentage feels most accurate now and why?",
        ],
        quiz: [
          {
            id: "cbt-evidence-lab-q1",
            prompt: "Why include evidence-against when checking a thought?",
            options: [
              "To force positivity",
              "To reduce confirmation bias",
              "To avoid emotions",
              "To finish faster",
            ],
            correctIndex: 1,
            explanation: "Considering counter-evidence protects against one-sided conclusions.",
          },
          {
            id: "cbt-evidence-lab-q2",
            prompt: "Best belief update after mixed feedback?",
            options: [
              "I failed completely",
              "I am perfect",
              "I performed unevenly and can target specific fixes",
              "Feedback is useless",
            ],
            correctIndex: 2,
            explanation: "Nuanced updates are more accurate and actionable than absolute labels.",
          },
          {
            id: "cbt-evidence-lab-q3",
            prompt: "Confidence ratings are useful because they:",
            options: [
              "Convert emotion into measurable change",
              "Eliminate uncertainty forever",
              "Replace behavior practice",
              "Guarantee motivation",
            ],
            correctIndex: 0,
            explanation: "Ratings help you track cognitive shifts across repeated practice.",
          },
        ],
        game: [
          {
            id: "cbt-evidence-lab-g1",
            scenario: "You assume your teammate disliked your idea.",
            options: [
              "Treat assumption as fact",
              "Ask clarifying questions and gather concrete examples",
              "Withdraw from group work",
            ],
            correctIndex: 1,
            feedback: "Great evidence move. You replaced mind-reading with data collection.",
          },
          {
            id: "cbt-evidence-lab-g2",
            scenario: "You missed one deadline this month.",
            options: [
              "I always fail deadlines",
              "Review full month performance before concluding",
              "Stop planning",
            ],
            correctIndex: 1,
            feedback: "Correct. Baseline data prevents overgeneralization.",
          },
          {
            id: "cbt-evidence-lab-g3",
            scenario: "Your idea got revised by your supervisor.",
            options: [
              "Revision means I am incapable",
              "Revision is standard; extract the specific learning signal",
              "Ignore feedback completely",
            ],
            correctIndex: 1,
            feedback: "Exactly. Feedback can be integrated without identity damage.",
          },
        ],
      }),
      makeLesson({
        id: "cbt-behavior-experiments",
        title: "Behavior Experiment Studio",
        summary: "Design and run behavior experiments to test fearful predictions.",
        durationMinutes: 52,
        difficulty: "advanced",
        objectives: [
          "Translate beliefs into testable predictions",
          "Run low-risk experiments",
          "Use outcomes to update thought patterns",
        ],
        mapLabel: "prediction-testing",
        triggerExample: "You avoid speaking in meetings because you predict embarrassment.",
        distortedThought: "If I speak once, everyone will think I am clueless.",
        balancedThought: "Some discomfort is likely, but catastrophic judgment is unlikely.",
        actionExperiment: "Contribute one short question in the next meeting and record the outcome.",
        reflectionPrompts: [
          "Write one fear prediction in measurable terms. How will you know if it happened?",
          "After your experiment, what happened versus what you predicted? What belief update follows?",
        ],
        quiz: [
          {
            id: "cbt-behavior-experiments-q1",
            prompt: "A good behavior experiment should be:",
            options: [
              "Vague and emotionally intense",
              "Specific, low-risk, and measurable",
              "Avoidant",
              "Purely theoretical",
            ],
            correctIndex: 1,
            explanation: "Low-risk, concrete experiments are repeatable and produce usable evidence.",
          },
          {
            id: "cbt-behavior-experiments-q2",
            prompt: "If an experiment is uncomfortable, the best interpretation is:",
            options: [
              "It failed",
              "Discomfort means growth work is happening",
              "You should stop permanently",
              "Your belief is always true",
            ],
            correctIndex: 1,
            explanation: "Discomfort is expected in exposure-based learning and does not equal failure.",
          },
          {
            id: "cbt-behavior-experiments-q3",
            prompt: "What closes the learning loop?",
            options: [
              "Running the experiment only",
              "Running it and writing a belief update",
              "Talking about it without trying",
              "Waiting for confidence first",
            ],
            correctIndex: 1,
            explanation: "Reflection plus belief updating consolidates behavior-change learning.",
          },
        ],
        game: [
          {
            id: "cbt-behavior-experiments-g1",
            scenario: "Prediction: 'If I ask a question, people will mock me.'",
            options: [
              "Do nothing",
              "Ask one concise question and observe reactions objectively",
              "Apologize repeatedly before speaking",
            ],
            correctIndex: 1,
            feedback: "Correct. You tested the prediction directly with manageable exposure.",
          },
          {
            id: "cbt-behavior-experiments-g2",
            scenario: "Outcome was neutral, not perfect.",
            options: [
              "This proves total failure",
              "Neutral outcome still disconfirms catastrophe",
              "I should avoid all future attempts",
            ],
            correctIndex: 1,
            feedback: "Yes. Neutral outcomes often carry the strongest corrective evidence.",
          },
          {
            id: "cbt-behavior-experiments-g3",
            scenario: "You want lasting change.",
            options: [
              "One experiment is enough forever",
              "Schedule repeat experiments with slightly increasing challenge",
              "Wait for anxiety to disappear completely",
            ],
            correctIndex: 1,
            feedback: "Exactly. Gradual repetition builds durable confidence.",
          },
        ],
      }),
      makeLesson({
        id: "cbt-core-belief-rewrite",
        title: "Core Belief Rewrite",
        summary: "Identify inherited core beliefs and draft replacement belief statements.",
        durationMinutes: 50,
        difficulty: "advanced",
        objectives: ["Spot recurring core beliefs", "Test belief origin and usefulness", "Write adaptive belief scripts"],
        mapLabel: "core belief mapping",
        triggerExample: "You interpret small criticism as proof of worthlessness.",
        distortedThought: "If I am not excellent, I am nothing.",
        balancedThought: "My worth is not binary. Growth includes mistakes and refinement.",
        actionExperiment: "Deliberately attempt a challenging task where imperfect output is expected and still submit.",
        reflectionPrompts: [
          "Which core belief repeatedly appears across different situations?",
          "Write a replacement belief that is both compassionate and accountable.",
        ],
        quiz: [
          {
            id: "cbt-core-belief-rewrite-q1",
            prompt: "Core beliefs are best described as:",
            options: ["Temporary moods", "Deep assumptions about self/world", "Random thoughts", "External facts"],
            correctIndex: 1,
            explanation: "Core beliefs are deeper assumptions that shape recurring automatic thoughts.",
          },
          {
            id: "cbt-core-belief-rewrite-q2",
            prompt: "A useful replacement belief should be:",
            options: ["Absolute and rigid", "Grounded, flexible, and values-aligned", "Only optimistic", "Emotionally numb"],
            correctIndex: 1,
            explanation: "Adaptive beliefs remain realistic while supporting healthier action.",
          },
          {
            id: "cbt-core-belief-rewrite-q3",
            prompt: "Belief change is consolidated through:",
            options: ["Insight alone", "Repeated evidence-consistent behavior", "Avoidance", "Self-criticism"],
            correctIndex: 1,
            explanation: "Behavior repeatedly aligned with new beliefs stabilizes cognitive change.",
          },
        ],
        game: [
          {
            id: "cbt-core-belief-rewrite-g1",
            scenario: "You hear: 'This section needs revision.'",
            options: ["I am useless", "Revision is part of quality work", "I should quit"],
            correctIndex: 1,
            feedback: "Good. You interpreted critique as process feedback, not identity verdict.",
          },
          {
            id: "cbt-core-belief-rewrite-g2",
            scenario: "You compare yourself with a top performer.",
            options: ["I can never improve", "I can borrow one strategy and practice it", "Comparison proves failure"],
            correctIndex: 1,
            feedback: "Strong choice. Growth happens through targeted strategy adoption.",
          },
          {
            id: "cbt-core-belief-rewrite-g3",
            scenario: "You made a visible mistake.",
            options: ["Hide and avoid", "Acknowledge, correct, and continue", "Attack yourself internally"],
            correctIndex: 1,
            feedback: "Exactly. Repair behavior reinforces adaptive self-beliefs.",
          },
        ],
      }),
      makeLesson({
        id: "cbt-rumination-reset",
        title: "Rumination Reset",
        summary: "Break repetitive overthinking loops using structured interruption plans.",
        durationMinutes: 44,
        difficulty: "intermediate",
        objectives: ["Detect rumination cues early", "Interrupt loops rapidly", "Redirect to problem-solving actions"],
        mapLabel: "rumination interruption",
        triggerExample: "You replay an awkward conversation repeatedly before sleep.",
        distortedThought: "If I replay this enough, I will finally feel safe.",
        balancedThought: "Repetition without action increases stress; a short plan works better.",
        actionExperiment: "Set a 10-minute worry window, then execute one concrete next action.",
        reflectionPrompts: [
          "What signals tell you rumination has started in your body and behavior?",
          "Design a 3-step interruption sequence you can use tonight.",
        ],
        quiz: [
          {
            id: "cbt-rumination-reset-q1",
            prompt: "Rumination differs from reflection because rumination:",
            options: ["Leads to clear action", "Repeats without resolution", "Always lasts 5 minutes", "Feels neutral"],
            correctIndex: 1,
            explanation: "Rumination is circular and unresolved, while reflection is purposeful.",
          },
          {
            id: "cbt-rumination-reset-q2",
            prompt: "A useful interruption tool is:",
            options: ["Self-judgment", "Time-boxed worry + action handoff", "Longer replay", "Avoiding all emotion"],
            correctIndex: 1,
            explanation: "Time limits and action shifts reduce loop intensity.",
          },
          {
            id: "cbt-rumination-reset-q3",
            prompt: "After interrupting rumination, do this next:",
            options: ["Start a new loop", "Choose one practical action", "Wait passively", "Blame yourself"],
            correctIndex: 1,
            explanation: "Problem-solving action locks in the cognitive shift.",
          },
        ],
        game: [
          {
            id: "cbt-rumination-reset-g1",
            scenario: "At midnight, your mind replays a mistake.",
            options: ["Replay until exhausted", "Run your 10-minute worry timer, then stop", "Open social media and spiral"],
            correctIndex: 1,
            feedback: "Correct. You used containment rather than endless mental rehearsal.",
          },
          {
            id: "cbt-rumination-reset-g2",
            scenario: "Loop says: 'Figure everything out now.'",
            options: ["Accept urgency as truth", "Capture one next step for tomorrow", "Catastrophize more"],
            correctIndex: 1,
            feedback: "Great. Delayed structured action prevents cognitive overload.",
          },
          {
            id: "cbt-rumination-reset-g3",
            scenario: "You interrupted one loop successfully.",
            options: ["Ignore the win", "Record what worked to reuse it", "Assume it was luck"],
            correctIndex: 1,
            feedback: "Exactly. Logging successful strategies increases future reliability.",
          },
        ],
      }),
      makeLesson({
        id: "cbt-maintenance",
        title: "CBT Maintenance Blueprint",
        summary: "Build long-term relapse prevention rituals and weekly review systems.",
        durationMinutes: 40,
        difficulty: "intermediate",
        objectives: ["Prevent relapse with routine", "Spot early warning signs", "Create weekly cognitive maintenance"],
        mapLabel: "maintenance planning",
        triggerExample: "Stress increases and old thought patterns return silently.",
        distortedThought: "I am back at zero, so progress was fake.",
        balancedThought: "Skill relapse is normal. Fast repair means progress is still real.",
        actionExperiment: "Create a weekly 15-minute review to identify one warning sign and one corrective action.",
        reflectionPrompts: [
          "List your top three early warning signs that your coping system is slipping.",
          "Design a weekly maintenance routine with exact day/time and one accountability cue.",
        ],
        quiz: [
          {
            id: "cbt-maintenance-q1",
            prompt: "Relapse prevention works best when it is:",
            options: ["Only used in crisis", "Scheduled proactively", "Based on motivation alone", "Kept abstract"],
            correctIndex: 1,
            explanation: "Preventive routines are more reliable than emergency-only responses.",
          },
          {
            id: "cbt-maintenance-q2",
            prompt: "A setback usually means:",
            options: ["Total failure", "Need for skill refresh", "No point continuing", "Identity weakness"],
            correctIndex: 1,
            explanation: "Setbacks are signals to reapply skills, not evidence of permanent failure.",
          },
          {
            id: "cbt-maintenance-q3",
            prompt: "Best weekly maintenance anchor:",
            options: ["Random timing", "Fixed review slot with one measurable action", "No tracking", "Only mood-based decisions"],
            correctIndex: 1,
            explanation: "Consistency and measurable follow-through sustain cognitive gains.",
          },
        ],
        game: [
          {
            id: "cbt-maintenance-g1",
            scenario: "You notice increased avoidance this week.",
            options: ["Ignore it", "Treat it as early warning and schedule one corrective action", "Judge yourself harshly"],
            correctIndex: 1,
            feedback: "Correct. Early intervention keeps setbacks small and manageable.",
          },
          {
            id: "cbt-maintenance-g2",
            scenario: "Old negative thought returns strongly.",
            options: ["Assume you lost all progress", "Use your evidence worksheet immediately", "Stop practicing"],
            correctIndex: 1,
            feedback: "Great. Skill reactivation is the core of maintenance.",
          },
          {
            id: "cbt-maintenance-g3",
            scenario: "You had a good week.",
            options: ["Skip all routines", "Briefly review what protected progress", "Assume change is permanent"],
            correctIndex: 1,
            feedback: "Exactly. Reinforcing what worked prevents drift.",
          },
        ],
      }),
    ],
  },
  {
    id: "iceberg",
    label: "Iceberg Model Deep Dive",
    description:
      "Move beneath surface reactions to the needs, fears, and beliefs driving emotional intensity through structured deep courses.",
    lessons: [
      makeLesson({
        id: "iceberg-surface-core-map",
        title: "Surface-to-Core Mapping",
        summary: "Map behavior, emotion, assumptions, and needs layer by layer.",
        durationMinutes: 46,
        difficulty: "beginner",
        objectives: ["Map all iceberg layers", "Differentiate reaction vs need", "Build calm language for core needs"],
        mapLabel: "the iceberg layer map",
        triggerExample: "A teammate interrupts you and you snap instantly.",
        distortedThought: "They disrespected me on purpose.",
        balancedThought: "I felt dismissed. I can express impact and ask for space to finish.",
        actionExperiment: "In the next tense moment, name your feeling and one need before responding.",
        reflectionPrompts: [
          "Describe a recent overreaction and map each iceberg layer beneath it.",
          "What was the underlying need that did not get named in time?",
        ],
        quiz: [
          {
            id: "iceberg-surface-core-map-q1",
            prompt: "In the iceberg model, visible behavior is:",
            options: ["The whole story", "Only the top layer", "Always intentional", "Unchangeable"],
            correctIndex: 1,
            explanation: "Visible reactions are surface expressions of deeper internal layers.",
          },
          {
            id: "iceberg-surface-core-map-q2",
            prompt: "Best first move in conflict according to iceberg work:",
            options: ["Accuse quickly", "Identify your feeling and need", "Stay silent forever", "Predict motives"],
            correctIndex: 1,
            explanation: "Naming feelings and needs reduces projection and improves clarity.",
          },
          {
            id: "iceberg-surface-core-map-q3",
            prompt: "An unmet need often appears as:",
            options: ["Random data", "Strong repeated emotional spikes", "Proof of weakness", "Permanent defect"],
            correctIndex: 1,
            explanation: "Repeated high-intensity reactions often indicate an unspoken need.",
          },
        ],
        game: [
          {
            id: "iceberg-surface-core-map-g1",
            scenario: "You feel angry after being excluded from planning.",
            options: ["Attack instantly", "Name need for inclusion and request a planning handoff", "Withdraw silently"],
            correctIndex: 1,
            feedback: "Good. You translated emotion into a clear request.",
          },
          {
            id: "iceberg-surface-core-map-g2",
            scenario: "You feel shame after correction.",
            options: ["Hide and ruminate", "Identify need for competence support and ask one question", "Blame others"],
            correctIndex: 1,
            feedback: "Correct. Needs-based communication lowers shame loops.",
          },
          {
            id: "iceberg-surface-core-map-g3",
            scenario: "You feel panic when plans change.",
            options: ["Demand control", "Acknowledge need for predictability and request revised timeline", "Quit the task"],
            correctIndex: 1,
            feedback: "Exactly. Naming the need creates collaborative problem-solving.",
          },
        ],
      }),
      makeLesson({
        id: "iceberg-emotion-granularity",
        title: "Emotion Granularity Lab",
        summary: "Move from vague 'bad' feelings to precise emotional language and regulation.",
        durationMinutes: 43,
        difficulty: "intermediate",
        objectives: ["Use precise emotion vocabulary", "Link emotions to triggers", "Reduce reactivity through naming"],
        mapLabel: "emotion precision mapping",
        triggerExample: "You keep saying 'I am stressed' without knowing what kind of stress.",
        distortedThought: "I feel bad and cannot do anything about it.",
        balancedThought: "I feel disappointed and anxious; each needs a different response.",
        actionExperiment: "Track 3 emotional spikes this week and label each with high precision.",
        reflectionPrompts: [
          "Pick one recent 'stressed' moment and relabel it with two specific emotions.",
          "How did naming precisely change your next action choice?",
        ],
        quiz: [
          {
            id: "iceberg-emotion-granularity-q1",
            prompt: "Why does emotion precision help regulation?",
            options: ["It removes emotion", "It improves intervention fit", "It avoids responsibility", "It increases avoidance"],
            correctIndex: 1,
            explanation: "Specific labels guide specific regulation strategies.",
          },
          {
            id: "iceberg-emotion-granularity-q2",
            prompt: "'I feel off' is less useful because it is:",
            options: ["Too precise", "Too vague for targeted action", "Always wrong", "Too optimistic"],
            correctIndex: 1,
            explanation: "Vague labels reduce clarity and make interventions harder.",
          },
          {
            id: "iceberg-emotion-granularity-q3",
            prompt: "A granular label could be:",
            options: ["Fine", "Bad", "Anxious plus embarrassed", "Whatever"],
            correctIndex: 2,
            explanation: "Specific combined labels improve emotional literacy and planning.",
          },
        ],
        game: [
          {
            id: "iceberg-emotion-granularity-g1",
            scenario: "You received delayed feedback from a mentor.",
            options: ["I feel normal", "I feel anxious and uncertain", "I feel nothing"],
            correctIndex: 1,
            feedback: "Great labeling. Specificity opens better coping choices.",
          },
          {
            id: "iceberg-emotion-granularity-g2",
            scenario: "A friend forgot your birthday.",
            options: ["I feel bad", "I feel hurt and disappointed", "I feel doomed"],
            correctIndex: 1,
            feedback: "Correct. This language supports constructive communication.",
          },
          {
            id: "iceberg-emotion-granularity-g3",
            scenario: "Your plan changed unexpectedly.",
            options: ["I am angry only", "I feel frustrated and unprepared", "I am broken"],
            correctIndex: 1,
            feedback: "Exactly. Mixed labels often reflect the real state better.",
          },
        ],
      }),
      makeLesson({
        id: "iceberg-needs-language",
        title: "Needs Language Mastery",
        summary: "Translate emotional intensity into assertive, non-accusatory needs requests.",
        durationMinutes: 45,
        difficulty: "intermediate",
        objectives: ["Differentiate feeling vs need", "Draft assertive needs statements", "Practice low-conflict requests"],
        mapLabel: "needs-based communication",
        triggerExample: "You feel ignored in group work and become sarcastic.",
        distortedThought: "Nobody cares, so I should stop trying.",
        balancedThought: "I need clearer inclusion and can ask for it directly.",
        actionExperiment: "Use one needs statement in your next collaboration conversation.",
        reflectionPrompts: [
          "Write one sentence that starts with 'I feel... because I need...' for a real conflict.",
          "How could you ask for that need without blame language?",
        ],
        quiz: [
          {
            id: "iceberg-needs-language-q1",
            prompt: "Which is a needs statement?",
            options: ["You never listen", "I need clearer feedback before revisions", "You are selfish", "Nothing helps"],
            correctIndex: 1,
            explanation: "Needs statements focus on what support is required, not blame.",
          },
          {
            id: "iceberg-needs-language-q2",
            prompt: "Needs language usually increases:",
            options: ["Defensiveness", "Clarity and collaboration", "Avoidance", "Mind reading"],
            correctIndex: 1,
            explanation: "Specific requests make next steps actionable for both sides.",
          },
          {
            id: "iceberg-needs-language-q3",
            prompt: "Best structure for difficult conversation:",
            options: ["Accuse, then demand", "Feeling -> need -> concrete request", "Silence only", "General complaint"],
            correctIndex: 1,
            explanation: "This sequence keeps communication grounded and practical.",
          },
        ],
        game: [
          {
            id: "iceberg-needs-language-g1",
            scenario: "Group chat decisions happen without you.",
            options: ["Send blame texts", "Ask to be tagged when decisions start", "Leave group abruptly"],
            correctIndex: 1,
            feedback: "Correct. You made a specific process request.",
          },
          {
            id: "iceberg-needs-language-g2",
            scenario: "Feedback feels harsh.",
            options: ["Fight back", "Request examples and one actionable priority", "Ignore everything"],
            correctIndex: 1,
            feedback: "Great response. You converted stress into structured information.",
          },
          {
            id: "iceberg-needs-language-g3",
            scenario: "You are overloaded.",
            options: ["Say yes to everything", "Request scope clarity and priority order", "Disappear"],
            correctIndex: 1,
            feedback: "Exactly. Needs clarity protects quality and wellbeing.",
          },
        ],
      }),
      makeLesson({
        id: "iceberg-belief-ladder",
        title: "Belief Ladder Advanced",
        summary: "Trace reaction chains down to core beliefs and rebuild upward with evidence.",
        durationMinutes: 51,
        difficulty: "advanced",
        objectives: ["Map belief ladders", "Challenge core assumptions", "Build replacement ladders"],
        mapLabel: "belief laddering",
        triggerExample: "Minor criticism triggers disproportionate fear and withdrawal.",
        distortedThought: "Criticism means I am fundamentally inadequate.",
        balancedThought: "Criticism can guide growth and does not define identity.",
        actionExperiment: "After feedback, write one learning action before interpreting identity meaning.",
        reflectionPrompts: [
          "Write a full ladder: event -> thought -> meaning -> core belief.",
          "Design a replacement ladder with one behavior at each level.",
        ],
        quiz: [
          {
            id: "iceberg-belief-ladder-q1",
            prompt: "A belief ladder helps by:",
            options: ["Skipping emotions", "Showing hidden meaning links", "Avoiding action", "Reducing memory"],
            correctIndex: 1,
            explanation: "Ladders expose the chain from event to core assumption.",
          },
          {
            id: "iceberg-belief-ladder-q2",
            prompt: "After identifying a core belief, the next best step is:",
            options: ["Accept it as fate", "Test it against current evidence", "Suppress it", "Punish yourself"],
            correctIndex: 1,
            explanation: "Evidence-testing weakens rigid legacy beliefs.",
          },
          {
            id: "iceberg-belief-ladder-q3",
            prompt: "Replacement ladders should include:",
            options: ["Only affirmations", "Cognition plus behavior steps", "No experiments", "All-or-nothing goals"],
            correctIndex: 1,
            explanation: "Belief change is strongest when cognitive and behavioral work are paired.",
          },
        ],
        game: [
          {
            id: "iceberg-belief-ladder-g1",
            scenario: "Supervisor edits your draft heavily.",
            options: ["I am permanently bad", "This draft needs revision; I can improve with specifics", "I should avoid writing"],
            correctIndex: 1,
            feedback: "Strong ladder shift from identity judgment to process learning.",
          },
          {
            id: "iceberg-belief-ladder-g2",
            scenario: "Your idea was not chosen.",
            options: ["I never belong", "One decision is not a global verdict", "I should disconnect"],
            correctIndex: 1,
            feedback: "Correct. You prevented overgeneralization and kept agency.",
          },
          {
            id: "iceberg-belief-ladder-g3",
            scenario: "You feel exposed in group review.",
            options: ["Hide completely", "Request one clear improvement target and apply it", "Attack reviewers"],
            correctIndex: 1,
            feedback: "Exactly. Action-targeting breaks fear-maintenance cycles.",
          },
        ],
      }),
      makeLesson({
        id: "iceberg-repair-conversations",
        title: "Repair Conversations",
        summary: "Use iceberg insight to repair conflict without self-erasure or escalation.",
        durationMinutes: 47,
        difficulty: "advanced",
        objectives: ["De-escalate conflict", "State impact clearly", "Co-create repair agreements"],
        mapLabel: "repair dialogue planning",
        triggerExample: "A conflict leaves both sides defensive and misunderstood.",
        distortedThought: "If I bring this up calmly, I will be ignored.",
        balancedThought: "Clear impact language plus requests can reopen dialogue.",
        actionExperiment: "Initiate one repair conversation using feeling-impact-request structure.",
        reflectionPrompts: [
          "Draft your repair script for one unresolved interaction.",
          "What boundary and what invitation to collaboration will you include?",
        ],
        quiz: [
          {
            id: "iceberg-repair-conversations-q1",
            prompt: "Repair language should prioritize:",
            options: ["Winning", "Impact clarity and forward agreement", "Blame", "Silence"],
            correctIndex: 1,
            explanation: "Repair is built on clarity, accountability, and practical next steps.",
          },
          {
            id: "iceberg-repair-conversations-q2",
            prompt: "A healthy repair includes:",
            options: ["Mind reading", "Concrete behavior agreement", "Past scorekeeping", "Total avoidance"],
            correctIndex: 1,
            explanation: "Specific agreements prevent repeat conflict loops.",
          },
          {
            id: "iceberg-repair-conversations-q3",
            prompt: "Boundaries in repair are:",
            options: ["Aggression", "Clear limits that protect respect", "Punishment", "Weakness"],
            correctIndex: 1,
            explanation: "Boundaries define respectful process and reduce reactivity.",
          },
        ],
        game: [
          {
            id: "iceberg-repair-conversations-g1",
            scenario: "Conversation starts tense.",
            options: ["Match intensity", "Name goal: understand and repair", "Bring unrelated issues"],
            correctIndex: 1,
            feedback: "Correct. Shared goal framing lowers defensiveness.",
          },
          {
            id: "iceberg-repair-conversations-g2",
            scenario: "Other person interrupts.",
            options: ["Shout back", "Request turn-taking respectfully", "End with insult"],
            correctIndex: 1,
            feedback: "Good boundary. You protected process without escalation.",
          },
          {
            id: "iceberg-repair-conversations-g3",
            scenario: "Repair talk ends.",
            options: ["Assume it is solved forever", "Confirm one concrete next behavior each", "Reopen blame"],
            correctIndex: 1,
            feedback: "Exactly. Closing with clear commitments improves follow-through.",
          },
        ],
      }),
      makeLesson({
        id: "iceberg-values-action",
        title: "Values-Aligned Action",
        summary: "Connect deep needs and values to repeatable daily behavior choices.",
        durationMinutes: 44,
        difficulty: "intermediate",
        objectives: ["Translate values into behaviors", "Reduce value-drift", "Set weekly value actions"],
        mapLabel: "values-to-actions bridge",
        triggerExample: "You know your values but keep acting against them under stress.",
        distortedThought: "Values are ideals, not practical under pressure.",
        balancedThought: "Small repeated value actions are practical and cumulative.",
        actionExperiment: "Choose one value and schedule one 15-minute behavior aligned with it today.",
        reflectionPrompts: [
          "Which value did you neglect this week and what was the emotional cost?",
          "Define one small behavior you will repeat three times this week to realign.",
        ],
        quiz: [
          {
            id: "iceberg-values-action-q1",
            prompt: "Values become useful when they are:",
            options: ["Abstract only", "Converted into specific behaviors", "Kept private and unmeasured", "Used for comparison"],
            correctIndex: 1,
            explanation: "Behavioral translation turns values into daily guidance.",
          },
          {
            id: "iceberg-values-action-q2",
            prompt: "Value drift usually happens when:",
            options: ["Stress is low", "Choices are made automatically under pressure", "Plans are clear", "Supports exist"],
            correctIndex: 1,
            explanation: "Pressure often reactivates default habits unless values are operationalized.",
          },
          {
            id: "iceberg-values-action-q3",
            prompt: "Best weekly value plan:",
            options: ["One big goal only", "Three small scheduled actions", "No schedule", "Mood-based action"],
            correctIndex: 1,
            explanation: "Small scheduled repetition improves adherence and identity coherence.",
          },
        ],
        game: [
          {
            id: "iceberg-values-action-g1",
            scenario: "Value: learning. Busy day arrives.",
            options: ["Skip completely", "Do a 15-minute focused review block", "Complain and delay"],
            correctIndex: 1,
            feedback: "Correct. Micro-actions keep values alive under pressure.",
          },
          {
            id: "iceberg-values-action-g2",
            scenario: "Value: relationships. Conflict appears.",
            options: ["Withdraw for days", "Send one repair check-in message", "Escalate publicly"],
            correctIndex: 1,
            feedback: "Great. Small relational actions prevent long disconnection.",
          },
          {
            id: "iceberg-values-action-g3",
            scenario: "You miss one planned value action.",
            options: ["Quit plan", "Reset next available slot immediately", "Self-attack"],
            correctIndex: 1,
            feedback: "Exactly. Fast reset beats perfectionism.",
          },
        ],
      }),
    ],
  },
  {
    id: "growth",
    label: "Growth Mindset Lab",
    description:
      "Replace fixed identity stories with progress-oriented thinking and repeatable learning habits using immersive course lessons.",
    lessons: [
      makeLesson({
        id: "growth-fixed-to-flex",
        title: "Fixed-to-Flexible Foundations",
        summary: "Spot fixed language and convert it into strategic process language.",
        durationMinutes: 41,
        difficulty: "beginner",
        objectives: ["Catch fixed statements", "Use yet-framing accurately", "Set process goals"],
        mapLabel: "fixed-to-growth reframing",
        triggerExample: "You say 'I am bad at this' after one difficult attempt.",
        distortedThought: "My current skill level defines my ceiling.",
        balancedThought: "Current skill level defines my starting point, not my limit.",
        actionExperiment: "Convert three fixed statements into process plans with timelines.",
        reflectionPrompts: [
          "Write three fixed-mindset sentences you used this month and rewrite each into growth language.",
          "For one rewrite, specify your practice plan for the next seven days.",
        ],
        quiz: [
          {
            id: "growth-fixed-to-flex-q1",
            prompt: "Which statement reflects growth mindset most clearly?",
            options: ["I am not a math person.", "I am not there yet, and I can improve with practice.", "If it is hard, I should avoid it.", "Talent is everything."],
            correctIndex: 1,
            explanation: "Growth framing emphasizes learnability and strategic effort.",
          },
          {
            id: "growth-fixed-to-flex-q2",
            prompt: "Process goals focus on:",
            options: ["Identity labels", "Specific controllable actions", "Luck", "Comparison rank"],
            correctIndex: 1,
            explanation: "Process goals increase agency by focusing on controllable behaviors.",
          },
          {
            id: "growth-fixed-to-flex-q3",
            prompt: "Best response to initial struggle:",
            options: ["Conclude inability", "Increase deliberate practice quality", "Drop the task immediately", "Hide errors"],
            correctIndex: 1,
            explanation: "Growth work improves strategy and practice quality under challenge.",
          },
        ],
        game: [
          {
            id: "growth-fixed-to-flex-g1",
            scenario: "First attempt fails.",
            options: ["I am not built for this", "I need a better method and another attempt", "I should stop permanently"],
            correctIndex: 1,
            feedback: "Correct. You shifted from identity to strategy.",
          },
          {
            id: "growth-fixed-to-flex-g2",
            scenario: "Peer improves faster than you.",
            options: ["I am doomed", "Compare strategies, not worth", "Give up silently"],
            correctIndex: 1,
            feedback: "Great move. Strategic comparison supports growth without self-attack.",
          },
          {
            id: "growth-fixed-to-flex-g3",
            scenario: "Progress is slow.",
            options: ["Slow means impossible", "Track small gains weekly", "Ignore all data"],
            correctIndex: 1,
            feedback: "Exactly. Small-gain tracking sustains motivation and direction.",
          },
        ],
      }),
      makeLesson({
        id: "growth-feedback-filter",
        title: "Feedback Filter Intensive",
        summary: "Separate useful feedback signal from noise and turn critique into plans.",
        durationMinutes: 46,
        difficulty: "intermediate",
        objectives: ["Filter feedback signal", "Extract actionable steps", "Respond non-defensively"],
        mapLabel: "feedback triage",
        triggerExample: "You receive blunt comments and feel personally attacked.",
        distortedThought: "Criticism proves I am not capable.",
        balancedThought: "Criticism can contain useful data, regardless of delivery style.",
        actionExperiment: "For the next piece of feedback, extract one signal and implement it within 48 hours.",
        reflectionPrompts: [
          "Recall one hard feedback moment and divide it into signal, noise, and emotion.",
          "What one action would show growth without overcorrecting?",
        ],
        quiz: [
          {
            id: "growth-feedback-filter-q1",
            prompt: "Feedback signal means:",
            options: ["Tone only", "Actionable information that can improve performance", "Any criticism", "Personal judgment"],
            correctIndex: 1,
            explanation: "Signal is usable information tied to behavior or output quality.",
          },
          {
            id: "growth-feedback-filter-q2",
            prompt: "A non-defensive response usually starts with:",
            options: ["Immediate rebuttal", "Clarifying question", "Withdrawal", "Self-attack"],
            correctIndex: 1,
            explanation: "Clarifying questions move the interaction toward specific improvements.",
          },
          {
            id: "growth-feedback-filter-q3",
            prompt: "Best follow-up to feedback:",
            options: ["No change", "One concrete implementation experiment", "Perfection promise", "Ignore timeline"],
            correctIndex: 1,
            explanation: "Implementation converts abstract advice into measurable growth.",
          },
        ],
        game: [
          {
            id: "growth-feedback-filter-g1",
            scenario: "Comment: 'Your argument is unclear.'",
            options: ["Take it as insult", "Ask which section felt unclear and why", "Abandon task"],
            correctIndex: 1,
            feedback: "Correct. You transformed vague critique into actionable guidance.",
          },
          {
            id: "growth-feedback-filter-g2",
            scenario: "Tone is harsh but point may be valid.",
            options: ["Reject everything", "Separate delivery from content", "Escalate conflict"],
            correctIndex: 1,
            feedback: "Great filtering. You protected growth while managing emotional impact.",
          },
          {
            id: "growth-feedback-filter-g3",
            scenario: "You implemented the feedback once.",
            options: ["Stop tracking", "Review whether quality improved", "Assume automatic mastery"],
            correctIndex: 1,
            feedback: "Exactly. Measurement closes the growth loop.",
          },
        ],
      }),
      makeLesson({
        id: "growth-deliberate-practice",
        title: "Deliberate Practice Design",
        summary: "Build high-quality practice loops instead of repetition without feedback.",
        durationMinutes: 49,
        difficulty: "advanced",
        objectives: ["Design deliberate practice loops", "Use feedback cycles", "Avoid mindless repetition"],
        mapLabel: "deliberate practice architecture",
        triggerExample: "You spend hours practicing but skill growth stalls.",
        distortedThought: "More time alone guarantees progress.",
        balancedThought: "Quality structure and feedback determine progress more than raw time.",
        actionExperiment: "Design a 30-minute deliberate practice block with immediate feedback.",
        reflectionPrompts: [
          "Where is your current practice loop weak: clarity, feedback, or review?",
          "Write your next deliberate practice block with exact success criteria.",
        ],
        quiz: [
          {
            id: "growth-deliberate-practice-q1",
            prompt: "Deliberate practice requires:",
            options: ["Random repetition", "Specific targets and immediate feedback", "Motivation only", "No reflection"],
            correctIndex: 1,
            explanation: "Targeted challenge plus feedback drives faster skill adaptation.",
          },
          {
            id: "growth-deliberate-practice-q2",
            prompt: "Practice quality is tracked best by:",
            options: ["Hours only", "Outcome and error-pattern review", "Mood only", "Comparison alone"],
            correctIndex: 1,
            explanation: "Error-pattern reviews reveal the highest leverage improvement points.",
          },
          {
            id: "growth-deliberate-practice-q3",
            prompt: "After each practice block, you should:",
            options: ["Repeat blindly", "Adjust next block based on findings", "Stop measuring", "Avoid challenge"],
            correctIndex: 1,
            explanation: "Adaptive iteration is the engine of deliberate practice.",
          },
        ],
        game: [
          {
            id: "growth-deliberate-practice-g1",
            scenario: "You practiced for 2 hours with little improvement.",
            options: ["Do another 2 hours same way", "Narrow to one subskill and get feedback", "Conclude no talent"],
            correctIndex: 1,
            feedback: "Correct. Precision practice beats broad repetition.",
          },
          {
            id: "growth-deliberate-practice-g2",
            scenario: "You keep repeating the same mistake.",
            options: ["Ignore it", "Pause and isolate the error trigger", "Hide performance"],
            correctIndex: 1,
            feedback: "Great. Error isolation speeds correction cycles.",
          },
          {
            id: "growth-deliberate-practice-g3",
            scenario: "Practice session ended.",
            options: ["No notes", "Write one adjustment for next session", "Only self-criticism"],
            correctIndex: 1,
            feedback: "Exactly. Adjustment notes compound over time.",
          },
        ],
      }),
      makeLesson({
        id: "growth-setback-recovery",
        title: "Setback Recovery System",
        summary: "Recover from mistakes fast using identity-safe postmortems and restart rituals.",
        durationMinutes: 44,
        difficulty: "intermediate",
        objectives: ["Run non-shaming postmortems", "Restart quickly", "Protect long-term consistency"],
        mapLabel: "setback recovery",
        triggerExample: "A failed attempt derails your routine for several days.",
        distortedThought: "This failure proves I cannot improve.",
        balancedThought: "Failure is data; recovery speed matters more than perfection.",
        actionExperiment: "Use a 24-hour reset ritual after your next setback and log results.",
        reflectionPrompts: [
          "Describe one setback where identity collapse made recovery slower.",
          "Write your personal 24-hour reset sequence (first hour, first day, next action).",
        ],
        quiz: [
          {
            id: "growth-setback-recovery-q1",
            prompt: "A productive postmortem asks:",
            options: ["Who is to blame?", "What happened, why, and what changes next?", "How to hide mistakes?", "Whether to quit"],
            correctIndex: 1,
            explanation: "Process-focused postmortems preserve learning and momentum.",
          },
          {
            id: "growth-setback-recovery-q2",
            prompt: "Best recovery metric:",
            options: ["No setbacks ever", "Time-to-restart after setbacks", "Comparison rank", "Emotion suppression"],
            correctIndex: 1,
            explanation: "Fast restart predicts long-term consistency more than perfect streaks.",
          },
          {
            id: "growth-setback-recovery-q3",
            prompt: "Identity-safe language sounds like:",
            options: ["I am a failure", "This strategy failed; I can revise it", "I never learn", "I should hide"],
            correctIndex: 1,
            explanation: "Separating identity from strategy keeps learning capacity open.",
          },
        ],
        game: [
          {
            id: "growth-setback-recovery-g1",
            scenario: "You miss a key target this week.",
            options: ["Abandon all goals", "Review cause and schedule immediate restart", "Self-criticize all day"],
            correctIndex: 1,
            feedback: "Correct. Restart behavior turns failure into adaptation.",
          },
          {
            id: "growth-setback-recovery-g2",
            scenario: "You feel embarrassed after a public mistake.",
            options: ["Avoid everyone", "Acknowledge, repair, and take one next step", "Pretend nothing happened"],
            correctIndex: 1,
            feedback: "Great. Repair plus action restores confidence faster.",
          },
          {
            id: "growth-setback-recovery-g3",
            scenario: "Setback pattern repeats.",
            options: ["Assume fate", "Revise system trigger and environment", "Try harder without changes"],
            correctIndex: 1,
            feedback: "Exactly. System revision prevents recurring friction.",
          },
        ],
      }),
      makeLesson({
        id: "growth-identity-stories",
        title: "Identity Story Rebuild",
        summary: "Rewrite fixed identity narratives into evidence-based growth narratives.",
        durationMinutes: 46,
        difficulty: "advanced",
        objectives: ["Detect identity scripts", "Write adaptive narratives", "Anchor narratives in action"],
        mapLabel: "identity narrative editing",
        triggerExample: "You repeat old labels from past failures.",
        distortedThought: "I am the kind of person who always falls short.",
        balancedThought: "I am building capability through deliberate practice and correction.",
        actionExperiment: "Write and read your updated identity script before one high-stress task this week.",
        reflectionPrompts: [
          "What old identity sentence has been running your decisions?",
          "Write a new identity sentence supported by current evidence and one weekly action.",
        ],
        quiz: [
          {
            id: "growth-identity-stories-q1",
            prompt: "Identity narratives influence growth because they:",
            options: ["Do nothing", "Shape effort, risk-taking, and persistence", "Guarantee talent", "Eliminate feedback"],
            correctIndex: 1,
            explanation: "Narratives influence what actions feel possible or pointless.",
          },
          {
            id: "growth-identity-stories-q2",
            prompt: "A healthy growth narrative should be:",
            options: ["Fantasy only", "Evidence-linked and action-oriented", "Static", "Comparison-based"],
            correctIndex: 1,
            explanation: "Grounded narratives are believable and behaviorally useful.",
          },
          {
            id: "growth-identity-stories-q3",
            prompt: "Narrative change is stabilized by:",
            options: ["Repeating words only", "Repeated aligned behavior", "Mood swings", "Avoiding challenge"],
            correctIndex: 1,
            explanation: "Actions confirm and strengthen identity updates.",
          },
        ],
        game: [
          {
            id: "growth-identity-stories-g1",
            scenario: "Before a challenge, old script appears.",
            options: ["Accept script as truth", "Read updated script and execute one prep action", "Delay indefinitely"],
            correctIndex: 1,
            feedback: "Correct. Identity priming plus action improves follow-through.",
          },
          {
            id: "growth-identity-stories-g2",
            scenario: "You receive mixed results.",
            options: ["Use old label", "Update narrative with both strengths and next edges", "Ignore data"],
            correctIndex: 1,
            feedback: "Great. Balanced narrative prevents overreaction.",
          },
          {
            id: "growth-identity-stories-g3",
            scenario: "Progress feels invisible.",
            options: ["Give up", "Review evidence log of improvements", "Compare unfairly"],
            correctIndex: 1,
            feedback: "Exactly. Evidence logs protect narrative accuracy.",
          },
        ],
      }),
      makeLesson({
        id: "growth-long-game",
        title: "Long-Game Learning Systems",
        summary: "Build sustainable learning systems for months, not motivation bursts.",
        durationMinutes: 45,
        difficulty: "intermediate",
        objectives: ["Design long-game systems", "Use habit triggers", "Track progress without burnout"],
        mapLabel: "long-game planning",
        triggerExample: "You start strong but lose momentum after two weeks.",
        distortedThought: "If motivation drops, progress is over.",
        balancedThought: "Systems carry progress when motivation fluctuates.",
        actionExperiment: "Create one weekly learning system with fixed trigger, action, and review.",
        reflectionPrompts: [
          "Where does your current learning system break under stress?",
          "Define your trigger-action-review loop for the next four weeks.",
        ],
        quiz: [
          {
            id: "growth-long-game-q1",
            prompt: "Long-game progress depends most on:",
            options: ["Constant motivation", "Reliable systems and reviews", "Luck", "Intensity spikes"],
            correctIndex: 1,
            explanation: "Consistency systems outperform motivation-only approaches over time.",
          },
          {
            id: "growth-long-game-q2",
            prompt: "A strong habit loop includes:",
            options: ["Trigger-action-review", "Action only", "Trigger only", "Review only"],
            correctIndex: 0,
            explanation: "All three parts are needed for reliability and adaptation.",
          },
          {
            id: "growth-long-game-q3",
            prompt: "When momentum drops, best next step is:",
            options: ["Quit", "Shrink the step and keep cadence", "Wait passively", "Judge yourself"],
            correctIndex: 1,
            explanation: "Smaller steps preserve identity and consistency under low energy.",
          },
        ],
        game: [
          {
            id: "growth-long-game-g1",
            scenario: "You miss two scheduled practice sessions.",
            options: ["Abandon system", "Reduce session size and restart next slot", "Delay a week"],
            correctIndex: 1,
            feedback: "Correct. Rapid restart protects long-term trajectory.",
          },
          {
            id: "growth-long-game-g2",
            scenario: "Your calendar gets chaotic.",
            options: ["Rely on memory", "Anchor practice to a fixed daily trigger", "Wait for free time"],
            correctIndex: 1,
            feedback: "Great. Trigger anchoring improves system reliability.",
          },
          {
            id: "growth-long-game-g3",
            scenario: "You feel burned out by perfection goals.",
            options: ["Increase pressure", "Switch to minimum viable daily action", "Stop all tracking"],
            correctIndex: 1,
            feedback: "Exactly. Minimum viable actions preserve sustainability.",
          },
        ],
      }),
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
