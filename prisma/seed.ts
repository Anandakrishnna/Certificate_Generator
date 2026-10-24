import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  const email = "demo@certifyflow.com";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash("password123", 10);
    const user = await prisma.user.create({
      data: {
        name: "Demo Organizer",
        email,
        passwordHash,
      },
    });

    const event = await prisma.event.create({
      data: {
        authorId: user.id,
        name: "National AI & Web Innovation Summit 2026",
        organizerName: "IEEE Computer Society Chapter",
        eventDate: new Date("2026-11-20T10:00:00Z"),
        description: "Flagship 3-day conference and hackathon on generative AI and agentic software development.",
      },
    });

    await prisma.participant.createMany({
      data: [
        {
          eventId: event.id,
          name: "Sophia Martinez",
          email: "sophia.martinez@example.com",
          extraFields: JSON.stringify({ role: "Winner - 1st Place", college: "Stanford University" }),
          validationStatus: "valid",
        },
        {
          eventId: event.id,
          name: "Liam O'Connor",
          email: "liam.oconnor@example.com",
          extraFields: JSON.stringify({ role: "Runner-Up", college: "UC Berkeley" }),
          validationStatus: "valid",
        },
        {
          eventId: event.id,
          name: "Aarav Sharma",
          email: "aarav.sharma@example.com",
          extraFields: JSON.stringify({ role: "Keynote Speaker", college: "MIT" }),
          validationStatus: "valid",
        },
      ],
    });

    console.log("✓ Demo account and sample event seeded successfully!");
  } else {
    console.log("Demo account already exists.");
  }

  await prisma.$disconnect();
}

seed().catch(console.error);
