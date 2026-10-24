import { PrismaClient } from "@prisma/client";
import { generateCertificatePdf } from "../src/lib/generator/pdf-generator";
import { generateCertificateSvg } from "../src/lib/generator/image-generator";
import { storage } from "../src/lib/storage/local-storage";

const prisma = new PrismaClient();

async function runGeneratorTests() {
  console.log("=== Testing Phase 7: Bulk Certificate Generation Engine ===");

  // 1. Setup author, event, and participant
  const author = await prisma.user.create({
    data: {
      name: "Generator Admin",
      email: `gen_admin_${Date.now()}@example.com`,
      passwordHash: "hash123",
    },
  });

  const event = await prisma.event.create({
    data: {
      authorId: author.id,
      name: "National Science & Tech Conclave 2026",
      organizerName: "Council of Science & Technology",
      eventDate: new Date("2026-12-05T10:00:00Z"),
    },
  });

  const participant = await prisma.participant.create({
    data: {
      eventId: event.id,
      name: "Alexander Hamilton",
      email: "alexander@treasury.gov",
      extraFields: JSON.stringify({ role: "Keynote Delegate" }),
    },
  });

  const template = await prisma.template.create({
    data: {
      eventId: event.id,
      backgroundUrl: "",
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
          isBold: false,
        },
      ]),
    },
  });

  console.log("✓ Test event, participant, and template created in DB");

  // 2. Test PDF Generation
  console.log("2. Generating PDF buffer with pdf-lib...");
  const certificateUid = `CERT-TEST-${Date.now().toString().slice(-4)}`;
  const pdfBuffer = await generateCertificatePdf({
    backgroundUrl: "",
    placeholders: JSON.parse(template.placeholders),
    participantData: {
      name: participant.name,
      email: participant.email,
    },
    certificateUid,
  });

  const isPdfHeaderValid = pdfBuffer.slice(0, 5).toString("utf-8") === "%PDF-";
  if (!isPdfHeaderValid || pdfBuffer.length < 100) {
    throw new Error("Generated PDF buffer is invalid or corrupted!");
  }
  console.log(`✓ PDF generated successfully (${pdfBuffer.length} bytes, starts with %PDF-)`);

  // 3. Test SVG Generation
  console.log("3. Generating SVG vector representation...");
  const svgContent = generateCertificateSvg({
    backgroundUrl: "",
    placeholders: JSON.parse(template.placeholders),
    participantData: {
      name: participant.name,
      email: participant.email,
    },
    certificateUid,
  });

  if (!svgContent.includes("<svg") || !svgContent.includes("Alexander Hamilton") || !svgContent.includes(certificateUid)) {
    throw new Error("SVG generation failed or does not include participant name and UID!");
  }
  console.log("✓ SVG generated successfully with recipient name and UID embedded");

  // 4. Test Local Storage Save
  console.log("4. Saving PDF and SVG to local storage...");
  const pdfUrl = await storage.saveFile(pdfBuffer, `generated/test_${certificateUid}.pdf`);
  const svgUrl = await storage.saveFile(Buffer.from(svgContent, "utf-8"), `generated/test_${certificateUid}.svg`);
  console.log(`✓ Saved files: PDF at ${pdfUrl}, SVG at ${svgUrl}`);

  // 5. Test Database Certificate Record Creation
  console.log("5. Creating Certificate record in SQLite DB...");
  const certRecord = await prisma.certificate.create({
    data: {
      participantId: participant.id,
      templateId: template.id,
      fileUrlPdf: pdfUrl,
      fileUrlPng: svgUrl,
      certificateUid,
    },
  });

  if (!certRecord.id || certRecord.certificateUid !== certificateUid) {
    throw new Error("Certificate DB record creation failed!");
  }
  console.log(`✓ Certificate DB record created with ID: ${certRecord.id}`);

  console.log("\n>>> ALL PHASE 7 GENERATOR TESTS PASSED! <<<");
  await prisma.$disconnect();
}

runGeneratorTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
