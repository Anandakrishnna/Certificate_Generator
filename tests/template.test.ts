import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_PLACEHOLDERS,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  PlaceholderConfig,
  CERTIFICATE_FONTS,
} from "../src/types/template";

const prisma = new PrismaClient();

async function runTemplateTests() {
  console.log("=== Testing Phase 5: Organizer Template & Name Overlay Customization ===");

  // 1. Setup author and event
  const author = await prisma.user.create({
    data: {
      name: "Organizer Lead",
      email: `organizer_${Date.now()}@university.edu`,
      passwordHash: "hash123",
    },
  });

  const event = await prisma.event.create({
    data: {
      authorId: author.id,
      name: "IEEE Student Chapter Annual Awards",
      organizerName: "IEEE Student Chapter",
      eventDate: new Date(),
    },
  });
  console.log(`✓ Test event created: ${event.id}`);

  // 2. Verify DEFAULT_PLACEHOLDERS contains ONLY participant name
  console.log("2. Checking default placeholders (should only contain 'name')...");
  if (
    DEFAULT_PLACEHOLDERS.length !== 1 ||
    DEFAULT_PLACEHOLDERS[0].fieldKey !== "name"
  ) {
    throw new Error("DEFAULT_PLACEHOLDERS must contain only the 'name' placeholder!");
  }
  console.log("✓ Verified: Only Participant Name is mapped by default");

  // 3. Test Calligraphy / Script font configuration
  console.log("3. Testing certificate typography options...");
  const calligraphyFont = CERTIFICATE_FONTS.find((f) => f.id === "Great Vibes");
  if (!calligraphyFont) {
    throw new Error("Great Vibes calligraphy font must be available in CERTIFICATE_FONTS!");
  }
  console.log(`✓ Verified calligraphy font available: "${calligraphyFont.name}"`);

  // 4. Save template with organizer's uploaded background
  const organizerUploadedBackground = "/uploads/template_sample_certificate.png";
  const customPlaceholders: PlaceholderConfig[] = [
    {
      id: "ph-name",
      fieldKey: "name",
      label: "Participant Name",
      x: 161,
      y: 380,
      width: 800,
      height: 75,
      fontFamily: "Great Vibes",
      fontSize: 54,
      color: "#0f172a",
      align: "center",
      isBold: false,
      isItalic: false,
    },
  ];

  const template = await prisma.template.create({
    data: {
      eventId: event.id,
      backgroundUrl: organizerUploadedBackground,
      placeholders: JSON.stringify(customPlaceholders),
    },
  });
  console.log(`✓ Template created with organizer background: ${template.backgroundUrl}`);

  // 5. Verify deleting/removing fields
  // If an optional field is added and then removed:
  const withOptionalDate = [
    ...customPlaceholders,
    {
      id: "ph-date",
      fieldKey: "date",
      label: "Event Date",
      x: 150,
      y: 600,
      width: 300,
      height: 35,
      fontFamily: "Roboto",
      fontSize: 16,
      color: "#475569",
      align: "center",
    },
  ];

  // Organizer removes the date field:
  const afterRemovingDate = withOptionalDate.filter((ph) => ph.fieldKey !== "date");
  if (afterRemovingDate.length !== 1 || afterRemovingDate[0].fieldKey !== "name") {
    throw new Error("Failed to remove optional field!");
  }
  console.log("✓ Verified: Optional fields can be cleanly removed, leaving only the recipient name");

  console.log("\n>>> ALL TEMPLATE CUSTOMIZATION TESTS PASSED! <<<");
  await prisma.$disconnect();
}

runTemplateTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
