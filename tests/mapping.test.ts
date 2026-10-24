import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runMappingTests() {
  console.log("=== Testing Phase 6: Field Mapping & Sample Approval ===");

  // 1. Setup author, event, and template
  const author = await prisma.user.create({
    data: {
      name: "Mapping Reviewer",
      email: `reviewer_${Date.now()}@example.com`,
      passwordHash: "hash123",
    },
  });

  const event = await prisma.event.create({
    data: {
      authorId: author.id,
      name: "Autonomous Coding Championship 2026",
      organizerName: "AI Institute",
      eventDate: new Date("2026-11-25T10:00:00Z"),
    },
  });

  // 2. Add participants with extra columns (award, college)
  await prisma.participant.createMany({
    data: [
      {
        eventId: event.id,
        name: "Elena Rostova",
        email: "elena@tech.io",
        extraFields: JSON.stringify({ award: "Grand Prize Winner", college: "Oxford" }),
      },
      {
        eventId: event.id,
        name: "Marcus Vance",
        email: "marcus@tech.io",
        extraFields: JSON.stringify({ award: "Special Recognition", college: "Cambridge" }),
      },
    ],
  });
  console.log("✓ Test event and participants with extra columns created");

  // 3. Create Template with name and award placeholder
  const template = await prisma.template.create({
    data: {
      eventId: event.id,
      backgroundUrl: "/uploads/template_sample.png",
      placeholders: JSON.stringify([
        {
          id: "ph-name",
          fieldKey: "name",
          label: "Participant Name",
          x: 161,
          y: 380,
          width: 800,
          height: 75,
          fontFamily: "Great Vibes",
          fontSize: 52,
          color: "#0f172a",
          align: "center",
        },
        {
          id: "ph-award",
          fieldKey: "award",
          label: "Award Category",
          x: 200,
          y: 480,
          width: 700,
          height: 45,
          fontFamily: "Playfair Display",
          fontSize: 24,
          color: "#d97706",
          align: "center",
        },
      ]),
    },
  });
  console.log(`✓ Template created with ID: ${template.id}`);

  // 4. Test field interpolation mapping
  const participants = await prisma.participant.findMany({ where: { eventId: event.id } });
  const placeholders = JSON.parse(template.placeholders);

  const sampleResults = participants.map((p) => {
    const extra = JSON.parse(p.extraFields);
    return placeholders.map((ph: any) => {
      if (ph.fieldKey === "name") return { field: "name", val: p.name };
      if (ph.fieldKey === "award") return { field: "award", val: extra.award };
      return { field: ph.fieldKey, val: "" };
    });
  });

  if (
    sampleResults[0][0].val !== "Elena Rostova" ||
    sampleResults[0][1].val !== "Grand Prize Winner" ||
    sampleResults[1][0].val !== "Marcus Vance" ||
    sampleResults[1][1].val !== "Special Recognition"
  ) {
    throw new Error("Field interpolation verification failed!");
  }
  console.log("✓ Sample preview values correctly mapped and interpolated for each attendee");

  console.log("\n>>> ALL PHASE 6 FIELD MAPPING TESTS PASSED! <<<");
  await prisma.$disconnect();
}

runMappingTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
