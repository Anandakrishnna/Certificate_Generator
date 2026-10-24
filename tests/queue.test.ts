import { PrismaClient } from "@prisma/client";
import { processSingleDelivery, processEventDeliveries } from "../src/lib/queue/delivery-worker";
import { interpolateEmail, DEFAULT_EMAIL_TEMPLATE } from "../src/lib/email/templates";

const prisma = new PrismaClient();

async function runQueueTests() {
  console.log("=== Testing Phase 8: Email Delivery Engine, Queue & Retries ===");

  // 1. Test token interpolation
  console.log("1. Testing email token interpolation...");
  const rawBody = "Hello {{name}}, your certificate for {{event_name}} is ready. ID: {{certificate_uid}}";
  const interpolated = interpolateEmail(rawBody, {
    name: "Ada Lovelace",
    event_name: "Quantum Computing Summit",
    certificate_uid: "CERT-9988",
  });

  if (
    !interpolated.includes("Ada Lovelace") ||
    !interpolated.includes("Quantum Computing Summit") ||
    !interpolated.includes("CERT-9988")
  ) {
    throw new Error("Email token interpolation failed!");
  }
  console.log("✓ Email token interpolation verified");

  // 2. Setup author, event, participant, certificate, and delivery in DB
  console.log("2. Setting up delivery test entities...");
  const author = await prisma.user.create({
    data: {
      name: "Queue Admin",
      email: `queue_${Date.now()}@example.com`,
      passwordHash: "hash123",
    },
  });

  const event = await prisma.event.create({
    data: {
      authorId: author.id,
      name: "Autonomous Agent Hackathon",
      organizerName: "DeepMind Club",
      eventDate: new Date(),
    },
  });

  const validParticipant = await prisma.participant.create({
    data: {
      eventId: event.id,
      name: "Turing Winner",
      email: "winner@university.edu",
    },
  });

  const failParticipant = await prisma.participant.create({
    data: {
      eventId: event.id,
      name: "Failing Attendee",
      email: "bounce_testfail@example.com", // Triggers simulated SMTP bounce
    },
  });

  const template = await prisma.template.create({
    data: {
      eventId: event.id,
      backgroundUrl: "",
      placeholders: JSON.stringify([{ id: "ph-name", fieldKey: "name", label: "Name", x: 100, y: 100, width: 200, height: 40, fontFamily: "Roboto", fontSize: 24, color: "#000", align: "center" }]),
    },
  });

  const certValid = await prisma.certificate.create({
    data: {
      participantId: validParticipant.id,
      templateId: template.id,
      fileUrlPdf: "/generated/sample.pdf",
      fileUrlPng: "/generated/sample.svg",
      certificateUid: "CERT-SUCCESS-1",
    },
  });

  const certFail = await prisma.certificate.create({
    data: {
      participantId: failParticipant.id,
      templateId: template.id,
      fileUrlPdf: "/generated/sample.pdf",
      fileUrlPng: "/generated/sample.svg",
      certificateUid: "CERT-FAIL-1",
    },
  });

  const deliverySuccess = await prisma.emailDelivery.create({
    data: {
      certificateId: certValid.id,
      participantId: validParticipant.id,
      status: "queued",
    },
  });

  const deliveryFail = await prisma.emailDelivery.create({
    data: {
      certificateId: certFail.id,
      participantId: failParticipant.id,
      status: "queued",
    },
  });

  // 3. Test successful email delivery
  console.log("3. Processing valid delivery through delivery queue...");
  const resValid = await processSingleDelivery(deliverySuccess.id);
  if (!resValid.success) throw new Error("Expected valid delivery to succeed!");

  const updatedSuccess = await prisma.emailDelivery.findUnique({ where: { id: deliverySuccess.id } });
  if (updatedSuccess?.status !== "sent" || !updatedSuccess?.sentAt) {
    throw new Error("Delivery DB record status was not updated to 'sent'!");
  }
  console.log(`✓ Successful delivery processed and verified: status=${updatedSuccess.status}`);

  // 4. Test failure handling and retries
  console.log("4. Testing failure simulation and retry backoff tracking...");
  const resFail1 = await processSingleDelivery(deliveryFail.id);
  if (resFail1.success) throw new Error("Expected testfail email to trigger failure!");

  const updatedFail1 = await prisma.emailDelivery.findUnique({ where: { id: deliveryFail.id } });
  if (updatedFail1?.status !== "retrying" || updatedFail1?.attemptCount !== 1) {
    throw new Error(`Expected status='retrying' with attemptCount=1, got status=${updatedFail1?.status}`);
  }
  console.log(`✓ Attempt 1 caught simulated bounce: status=${updatedFail1.status}, attempts=${updatedFail1.attemptCount}`);

  // Second attempt
  await processSingleDelivery(deliveryFail.id);
  // Third attempt -> permanent failure
  await processSingleDelivery(deliveryFail.id);

  const updatedFailFinal = await prisma.emailDelivery.findUnique({ where: { id: deliveryFail.id } });
  if (updatedFailFinal?.status !== "failed" || updatedFailFinal?.attemptCount !== 3) {
    throw new Error(`Expected status='failed' after 3 attempts, got status=${updatedFailFinal?.status}`);
  }
  console.log(`✓ Max retries exhausted after 3 attempts: permanently marked status=${updatedFailFinal.status}`);

  console.log("\n>>> ALL PHASE 8 QUEUE & DELIVERY TESTS PASSED! <<<");
  await prisma.$disconnect();
}

runQueueTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
