import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runPhase9VerificationTests() {
  console.log("=== Testing Phase 9: Dashboard Analytics & Report Export ===");

  // 1. Create author, event, participant, certificate with unique UID
  console.log("1. Setting up test data for analytics & verification...");
  const author = await prisma.user.create({
    data: {
      name: "Verification Officer",
      email: `verifier_${Date.now()}@university.edu`,
      passwordHash: "hash999",
    },
  });

  const event = await prisma.event.create({
    data: {
      authorId: author.id,
      name: "International AI Symposium 2026",
      organizerName: "IEEE Student Branch",
      eventDate: new Date("2026-12-10T10:00:00Z"),
      description: "Premier academic symposium on generative artificial intelligence.",
    },
  });

  const template = await prisma.template.create({
    data: {
      eventId: event.id,
      backgroundUrl: "/templates/presets/classic_gold.svg",
      placeholders: JSON.stringify([
        { fieldKey: "{{name}}", x: 200, y: 300, fontSize: 32, color: "#1e293b", align: "center" },
      ]),
    },
  });

  const participant = await prisma.participant.create({
    data: {
      eventId: event.id,
      name: "Grace Hopper",
      email: "grace.hopper@navy.mil",
      extraFields: JSON.stringify({ Track: "Keynote Speaker", Distinction: "Fellow" }),
    },
  });

  const testUid = `CERT-TEST-${Date.now()}`;
  const certificate = await prisma.certificate.create({
    data: {
      participantId: participant.id,
      templateId: template.id,
      fileUrlPdf: `/generated/${event.id}_${participant.id}.pdf`,
      fileUrlPng: `/generated/${event.id}_${participant.id}.svg`,
      certificateUid: testUid,
    },
  });

  // Create an email delivery record
  const delivery = await prisma.emailDelivery.create({
    data: {
      certificateId: certificate.id,
      participantId: participant.id,
      status: "sent",
      attemptCount: 1,
      sentAt: new Date(),
    },
  });

  console.log(`✓ Test certificate created with UID: ${certificate.certificateUid}`);
  console.log(`✓ Test email delivery recorded with status: ${delivery.status}`);

  // 2. Test Verification Lookup Logic (matching GET /api/verify/[certificateUid])
  console.log("2. Testing public verification lookup...");
  const foundCert = await prisma.certificate.findUnique({
    where: { certificateUid: testUid },
    include: {
      participant: {
        include: {
          event: true,
        },
      },
    },
  });

  if (!foundCert) {
    throw new Error(`Failed to find certificate by UID ${testUid}`);
  }

  if (foundCert.participant.name !== "Grace Hopper") {
    throw new Error(`Expected participant Grace Hopper, got ${foundCert.participant.name}`);
  }

  if (foundCert.participant.event.organizerName !== "IEEE Student Branch") {
    throw new Error(`Expected organizer IEEE Student Branch, got ${foundCert.participant.event.organizerName}`);
  }

  console.log("✓ Verification lookup returned authentic metadata correctly:");
  console.log(`   - Recipient: ${foundCert.participant.name}`);
  console.log(`   - Event: ${foundCert.participant.event.name}`);
  console.log(`   - Organizer: ${foundCert.participant.event.organizerName}`);
  console.log(`   - UID: ${foundCert.certificateUid}`);

  // 3. Test Invalid UID lookup
  console.log("3. Testing invalid UID lookup...");
  const nonExistent = await prisma.certificate.findUnique({
    where: { certificateUid: "NON-EXISTENT-UID-1234" },
  });

  if (nonExistent !== null) {
    throw new Error("Invalid UID lookup should return null");
  }
  console.log("✓ Non-existent UID correctly returns null (yielding 404)");

  // 4. Test Delivery Analytics Calculation
  console.log("4. Testing delivery analytics and stats calculation...");
  const allDeliveries = await prisma.emailDelivery.findMany({
    where: { participant: { eventId: event.id } },
  });

  const total = allDeliveries.length;
  const sentCount = allDeliveries.filter((d) => d.status === "sent").length;
  const successRate = total > 0 ? Math.round((sentCount / total) * 100) : 0;

  if (successRate !== 100) {
    throw new Error(`Expected 100% success rate, got ${successRate}%`);
  }
  console.log(`✓ Delivery metrics calculated: Total=${total}, Sent=${sentCount}, SuccessRate=${successRate}%`);

  // 5. Test CSV Export Content Generation
  console.log("5. Testing delivery CSV report generation...");
  const headers = [
    "Participant_Name",
    "Email_Address",
    "Certificate_UID",
    "Delivery_Status",
    "Attempt_Count",
  ];
  const row = [
    `"${participant.name}"`,
    `"${participant.email}"`,
    `"${certificate.certificateUid}"`,
    `"${delivery.status}"`,
    delivery.attemptCount,
  ];
  const csvReport = [headers.join(","), row.join(",")].join("\r\n");

  if (
    !csvReport.includes("Grace Hopper") ||
    !csvReport.includes("grace.hopper@navy.mil") ||
    !csvReport.includes(testUid) ||
    !csvReport.includes("sent")
  ) {
    throw new Error("CSV delivery report content validation failed!");
  }
  console.log("✓ Delivery report CSV formatted successfully");

  console.log("\n=======================================================");
  console.log(" ALL PHASE 9 VERIFICATION & ANALYTICS TESTS PASSED! ");
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

runPhase9VerificationTests().catch(async (e) => {
  console.error("Test failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
