import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateCertificateSvg } from "../src/lib/generator/image-generator";
import { storage } from "../src/lib/storage/local-storage";

const prisma = new PrismaClient();

async function seedDemoData() {
  console.log("Seeding comprehensive demo data for local testing...");

  // 1. Create or update Demo User
  const demoEmail = "demo@certifyflow.com";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  let user = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Alex Rivera",
        email: demoEmail,
        passwordHash,
      },
    });
    console.log(`Created demo user: ${user.email} (Password: demo1234)`);
  } else {
    user = await prisma.user.update({
      where: { email: demoEmail },
      data: { passwordHash },
    });
    console.log(`Updated demo user password: ${user.email} (Password: demo1234)`);
  }

  // 2. Create Demo Event
  const event = await prisma.event.create({
    data: {
      authorId: user.id,
      name: "Global Tech Summit 2026",
      organizerName: "Association for Computing Innovation",
      eventDate: new Date("2026-11-20T10:00:00Z"),
      description: "Flagship global conference on artificial intelligence, systems, and engineering.",
    },
  });
  console.log(`Created event: ${event.name} (ID: ${event.id})`);

  // 3. Create Template with preset
  const template = await prisma.template.create({
    data: {
      eventId: event.id,
      backgroundUrl: "/templates/presets/classic_gold.svg",
      placeholders: JSON.stringify([
        {
          fieldKey: "{{name}}",
          x: 561,
          y: 420,
          width: 600,
          height: 60,
          fontFamily: "Noto Serif",
          fontSize: 38,
          color: "#0f172a",
          align: "center",
        },
        {
          fieldKey: "{{event_name}}",
          x: 561,
          y: 490,
          width: 700,
          height: 40,
          fontFamily: "Roboto",
          fontSize: 20,
          color: "#334155",
          align: "center",
        },
        {
          fieldKey: "{{organizer}}",
          x: 350,
          y: 650,
          width: 300,
          height: 30,
          fontFamily: "Roboto",
          fontSize: 16,
          color: "#475569",
          align: "center",
        },
        {
          fieldKey: "{{date}}",
          x: 770,
          y: 650,
          width: 250,
          height: 30,
          fontFamily: "Roboto",
          fontSize: 16,
          color: "#475569",
          align: "center",
        },
      ]),
    },
  });

  // 4. Create sample participants
  const attendees = [
    { name: "Sophia Chen", email: "sophia.chen@innovate.org", role: "Keynote Speaker" },
    { name: "Marcus Brody", email: "m.brody@oxford.ac.uk", role: "Paper Presenter" },
    { name: "Amina Al-Mansoor", email: "amina.m@techhub.io", role: "Best Poster Award" },
    { name: "David Kim", email: "david.kim@ai-labs.com", role: "Attendee" },
    { name: "Elena Rostova", email: "elena.rostova@polytechnique.edu", role: "Workshop Lead" },
  ];

  for (const attendee of attendees) {
    const p = await prisma.participant.create({
      data: {
        eventId: event.id,
        name: attendee.name,
        email: attendee.email,
        extraFields: JSON.stringify({ Track: attendee.role }),
        validationStatus: "valid",
      },
    });

    const certUid = `CERT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Generate actual SVG file
    const placeholders = JSON.parse(template.placeholders);
    const participantData = {
      name: attendee.name,
      event_name: event.name,
      organizer: event.organizerName,
      date: "November 20, 2026",
    };
    const svgContent = generateCertificateSvg({
      backgroundUrl: template.backgroundUrl,
      placeholders,
      participantData,
      certificateUid: certUid,
    });

    const svgPath = `generated/${event.id}_${p.id}.svg`;
    const pdfPath = `generated/${event.id}_${p.id}.pdf`;
    await storage.saveFile(Buffer.from(svgContent, "utf-8"), svgPath);

    const cert = await prisma.certificate.create({
      data: {
        participantId: p.id,
        templateId: template.id,
        fileUrlPdf: `/${svgPath}`,
        fileUrlPng: `/${svgPath}`,
        certificateUid: certUid,
      },
    });

    // Create delivery
    const isSent = attendee.email !== "david.kim@ai-labs.com";
    await prisma.emailDelivery.create({
      data: {
        certificateId: cert.id,
        participantId: p.id,
        status: isSent ? "sent" : "queued",
        attemptCount: isSent ? 1 : 0,
        sentAt: isSent ? new Date() : null,
      },
    });

    console.log(`Attendee created: ${attendee.name} | UID: ${certUid}`);
  }

  console.log("\n=== SEED SUMMARY ===");
  console.log(`Login Email: demo@certifyflow.com`);
  console.log(`Password:    demo1234`);
  console.log(`Dashboard:   http://localhost:3000/dashboard`);
  console.log(`Event Page:  http://localhost:3000/events/${event.id}`);
  console.log(`Delivery:    http://localhost:3000/events/${event.id}/delivery`);
  console.log("====================\n");
}

seedDemoData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
