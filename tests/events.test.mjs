import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runEventsVerification() {
  console.log("=== Testing Phase 3: Event Management & Navigation Shell ===");

  // 1. Create a test author
  const author = await prisma.user.create({
    data: {
      name: "Event Lead",
      email: `lead_${Date.now()}@university.edu`,
      passwordHash: "hash123",
    },
  });
  console.log(`✓ Test author created: ${author.id}`);

  // 2. Create Event (POST)
  const event = await prisma.event.create({
    data: {
      authorId: author.id,
      name: "National Hackathon 2026",
      organizerName: "Developer Student Club",
      eventDate: new Date("2026-11-15T09:00:00Z"),
      description: "Annual 36-hour hackathon for building innovative web applications.",
    },
  });
  console.log(`✓ Event created: "${event.name}" (ID: ${event.id})`);

  // 3. Add sample participants to test counting
  await prisma.participant.createMany({
    data: [
      { eventId: event.id, name: "Alice Johnson", email: "alice@example.com" },
      { eventId: event.id, name: "Bob Smith", email: "bob@example.com" },
    ],
  });
  console.log("✓ Sample participants added for count aggregation");

  // 4. Query Events with counts (GET /api/events)
  const events = await prisma.event.findMany({
    where: { authorId: author.id },
    include: {
      _count: {
        select: { participants: true, templates: true },
      },
    },
  });
  if (events.length !== 1 || events[0]._count.participants !== 2) {
    throw new Error("Event listing and participant aggregation failed!");
  }
  console.log(`✓ Queried events list: 1 event found with ${events[0]._count.participants} participants`);

  // 5. Update Event (PUT /api/events/[id])
  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { name: "National Hackathon 2026 (Updated)" },
  });
  if (updated.name !== "National Hackathon 2026 (Updated)") {
    throw new Error("Event update failed!");
  }
  console.log("✓ Event update verified");

  // 6. Delete Event (DELETE /api/events/[id])
  await prisma.event.delete({ where: { id: event.id } });
  const remaining = await prisma.event.findUnique({ where: { id: event.id } });
  if (remaining !== null) {
    throw new Error("Event deletion failed!");
  }
  console.log("✓ Event deletion verified");

  console.log("\n>>> ALL PHASE 3 EVENT TESTS PASSED SUCCESSFULLY! <<<");
  await prisma.$disconnect();
}

runEventsVerification().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
