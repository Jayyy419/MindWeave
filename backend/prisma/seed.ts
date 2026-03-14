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
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
