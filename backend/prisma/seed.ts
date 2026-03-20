import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Predefined think tanks with associated interest tags
const thinkTanks = [
  {
    name: "Aspiring Founders",
    description:
      "A group for aspiring entrepreneurs sharing ideas, challenges, and support on the startup journey.",
    tags: JSON.stringify([
      "entrepreneurship",
      "startup",
      "business",
      "innovation",
      "leadership",
    ]),
  },
  {
    name: "Climate Advocates",
    description:
      "Passionate individuals discussing climate change, sustainability, and environmental action.",
    tags: JSON.stringify([
      "climate change",
      "environment",
      "sustainability",
      "nature",
      "activism",
    ]),
  },
  {
    name: "Creative Writers",
    description:
      "Writers and storytellers exploring creativity, expression, and the craft of writing.",
    tags: JSON.stringify([
      "writing",
      "creativity",
      "storytelling",
      "art",
      "expression",
    ]),
  },
  {
    name: "Mindful Living",
    description:
      "A supportive space for those exploring mindfulness, mental health, and personal well-being.",
    tags: JSON.stringify([
      "mindfulness",
      "mental health",
      "anxiety",
      "self-care",
      "well-being",
      "stress",
    ]),
  },
  {
    name: "Tech Innovators",
    description:
      "Tech enthusiasts discussing emerging technologies, coding, and the future of AI.",
    tags: JSON.stringify([
      "technology",
      "coding",
      "AI",
      "programming",
      "innovation",
      "software",
    ]),
  },
  {
    name: "Social Impact Leaders",
    description:
      "Change-makers focused on social justice, community building, and making a difference.",
    tags: JSON.stringify([
      "social impact",
      "community",
      "justice",
      "volunteering",
      "education",
      "equality",
    ]),
  },
];

const opportunities = [
  {
    slug: "asean-youth-challenge-2026",
    title: "AI Ready ASEAN Youth Challenge 2026",
    organizerName: "AI Ready ASEAN Challenge Organisers",
    summary:
      "A competition pathway for builders, community thinkers, and youth leaders shaping practical AI-supported solutions.",
    description:
      "This opportunity is designed for young people whose reflections show consistent signals of initiative, problem-solving, leadership, and long-term community thinking. Organisers may request a consent-based participant profile package to better understand fit, motivation, and readiness.",
    benefits: JSON.stringify([
      "Competition access and application pathway",
      "Potential mentor and organiser outreach",
      "Stronger project-fit matching inside MindWeave",
    ]),
    resourceHighlights: JSON.stringify([
      "Challenge briefings and participation updates",
      "Curated preparation resources",
      "Mentorship and ecosystem visibility",
    ]),
    requestedScopes: JSON.stringify([
      "profileBasics",
      "interestProfile",
      "reflectionSummary",
      "selectedJournalExcerpts",
    ]),
    matchingTags: JSON.stringify([
      "innovation",
      "leadership",
      "AI",
      "technology",
      "community",
      "entrepreneurship",
      "social impact",
    ]),
    minimumEntries: 3,
    minimumLevel: 1,
  },
  {
    slug: "climate-story-lab",
    title: "Climate Story Lab",
    organizerName: "Regional Sustainability Network",
    summary:
      "A resource and showcase pathway for reflective storytellers and community builders focused on climate action.",
    description:
      "Users whose entries consistently reflect environmental concern, civic voice, and communication potential can be surfaced for climate-focused storytelling resources, workshops, and competition-style briefs.",
    benefits: JSON.stringify([
      "Workshop invites and resource packs",
      "Storytelling and advocacy opportunities",
      "Potential competition participation",
    ]),
    resourceHighlights: JSON.stringify([
      "Climate communication toolkits",
      "Facilitated writing prompts",
      "Mentor feedback opportunities",
    ]),
    requestedScopes: JSON.stringify([
      "profileBasics",
      "interestProfile",
      "reflectionSummary",
    ]),
    matchingTags: JSON.stringify([
      "climate change",
      "environment",
      "sustainability",
      "nature",
      "activism",
      "community",
    ]),
    minimumEntries: 3,
    minimumLevel: 1,
  },
  {
    slug: "wellbeing-ambassador-pathway",
    title: "Youth Wellbeing Ambassador Pathway",
    organizerName: "MindWeave Partner Support Network",
    summary:
      "A pathway to wellbeing resources, peer leadership opportunities, and community-based support programs.",
    description:
      "Users who show sustained reflection, emotional awareness, and healthy peer-support potential may unlock access to ambassador-style opportunities, guided resources, and community leadership pathways.",
    benefits: JSON.stringify([
      "Wellbeing learning resources",
      "Peer ambassador opportunities",
      "Facilitated community programming",
    ]),
    resourceHighlights: JSON.stringify([
      "Support and leadership modules",
      "Referral-style partner opportunities",
      "Community care toolkits",
    ]),
    requestedScopes: JSON.stringify([
      "profileBasics",
      "interestProfile",
      "reflectionSummary",
    ]),
    matchingTags: JSON.stringify([
      "mental health",
      "self-care",
      "well-being",
      "stress",
      "mindfulness",
      "community",
      "education",
    ]),
    minimumEntries: 4,
    minimumLevel: 1,
  },
];

async function main() {
  console.log("Seeding database...");

  for (const tank of thinkTanks) {
    await prisma.thinkTank.upsert({
      where: { name: tank.name },
      update: tank,
      create: tank,
    });
  }

  console.log(`Seeded ${thinkTanks.length} think tanks.`);

  for (const opportunity of opportunities) {
    await prisma.opportunity.upsert({
      where: { slug: opportunity.slug },
      update: opportunity,
      create: opportunity,
    });
  }

  console.log(`Seeded ${opportunities.length} opportunities.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
