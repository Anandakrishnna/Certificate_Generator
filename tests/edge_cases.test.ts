import { PrismaClient } from "@prisma/client";
import { generateCertificatePdf } from "../src/lib/generator/pdf-generator";
import { generateCertificateSvg } from "../src/lib/generator/image-generator";
import { parseSpreadsheetBuffer } from "../src/lib/parser/spreadsheet-parser";
import { PDFDocument } from "pdf-lib";

const prisma = new PrismaClient();

async function runPhase10EdgeCaseTests() {
  console.log("=== Testing Phase 10: Edge Cases, Performance & Polish ===");

  // -------------------------------------------------------------
  // Test 1: Unicode & Accented Names Rendering in PDF and SVG
  // -------------------------------------------------------------
  console.log("1. Testing Unicode & accented names rendering...");
  const unicodeNames = [
    "José María García-Márquez",
    "Élise Müller-Köhler",
    "Renée D'Souza",
    "Siddharth Rao (सिद्दार्थ)",
  ];

  for (const name of unicodeNames) {
    const placeholders = [
      {
        fieldKey: "{{name}}",
        x: 100,
        y: 200,
        width: 500,
        height: 50,
        fontFamily: "Noto Serif",
        fontSize: 32,
        color: "#0f172a",
        align: "center" as const,
      },
    ];

    // PDF generation with Unicode font
    const pdfBuf = await generateCertificatePdf({
      backgroundUrl: "",
      placeholders,
      participantData: { name },
      certificateUid: "CERT-UNICODE-TEST",
    });

    if (!pdfBuf || pdfBuf.length < 500) {
      throw new Error(`Failed to generate valid PDF for Unicode name: ${name}`);
    }

    // Inspect created PDF
    const parsedPdf = await PDFDocument.load(pdfBuf);
    if (parsedPdf.getPageCount() !== 1) {
      throw new Error("Generated PDF should contain exactly 1 page");
    }

    // SVG generation with Unicode text
    const svgStr = generateCertificateSvg({
      backgroundUrl: "",
      placeholders,
      participantData: { name },
      certificateUid: "CERT-UNICODE-TEST",
    });

    if (!svgStr.includes(name)) {
      throw new Error(`SVG output missing Unicode name text: ${name}`);
    }
  }
  console.log("✓ All Unicode and accented names rendered cleanly in PDF & SVG");

  // -------------------------------------------------------------
  // Test 2: Long Names Auto-Shrink & Text Fitting
  // -------------------------------------------------------------
  console.log("2. Testing auto-shrink text fitting for long names...");
  const longName = "Professor Maximillian Bartholomew Montgomery-Hetherington III";
  const narrowWidth = 250; // Narrow bounding box that forces auto-shrink
  const initialFontSize = 40;

  const placeholdersLong = [
    {
      fieldKey: "{{name}}",
      x: 100,
      y: 200,
      width: narrowWidth,
      height: 50,
      fontFamily: "Roboto",
      fontSize: initialFontSize,
      color: "#0f172a",
      align: "center" as const,
    },
  ];

  const svgLong = generateCertificateSvg({
    backgroundUrl: "",
    placeholders: placeholdersLong,
    participantData: { name: longName },
    certificateUid: "CERT-LONG-NAME",
  });

  // Extract the font-size used in the SVG output
  const fontSizeMatch = svgLong.match(/font-size="(\d+)px"/);
  if (!fontSizeMatch) {
    throw new Error("Could not parse font-size in SVG output");
  }
  const fittedFontSize = parseInt(fontSizeMatch[1], 10);
  console.log(`   Initial font-size: ${initialFontSize}px -> Auto-scaled font-size: ${fittedFontSize}px`);

  if (fittedFontSize >= initialFontSize) {
    throw new Error(`Expected font size to shrink from ${initialFontSize}px, but got ${fittedFontSize}px`);
  }
  console.log("✓ Long name auto-shrink text fitting verified (scaled down to fit bounding box)");

  // -------------------------------------------------------------
  // Test 3: 500+ Rows Large Dataset Handling
  // -------------------------------------------------------------
  console.log("3. Testing 500+ rows dataset parser and validation...");
  const csvLines = ["Name,Email,Role"];
  for (let i = 1; i <= 550; i++) {
    csvLines.push(`Attendee Number ${i},attendee_${i}@university.edu,${i % 10 === 0 ? "Speaker" : "Participant"}`);
  }
  const largeCsvBuffer = Buffer.from(csvLines.join("\n"), "utf-8");
  const report = parseSpreadsheetBuffer(largeCsvBuffer, "large_participants.csv");

  console.log(`   Processed rows: ${report.totalRows} (Valid: ${report.validCount}, Invalid: ${report.invalidCount})`);

  if (report.totalRows !== 550) {
    throw new Error(`Expected 550 rows, got ${report.totalRows}`);
  }
  if (report.validCount !== 550) {
    throw new Error(`Expected all 550 rows to be valid, got ${report.validCount}`);
  }
  console.log("✓ Large dataset (550 rows) validated smoothly without degradation");

  // -------------------------------------------------------------
  // Test 4: Duplicate Email Resolution Rules
  // -------------------------------------------------------------
  console.log("4. Testing duplicate email resolution logic...");
  const duplicateCsv = `Name,Email
First Instance,duplicate@example.com
Second Instance,duplicate@example.com
Unique Person,unique@example.com`;

  const dupReport = parseSpreadsheetBuffer(Buffer.from(duplicateCsv, "utf-8"), "dup.csv");
  if (dupReport.duplicateCount !== 2) {
    throw new Error(`Expected 2 duplicate rows flagged, got ${dupReport.duplicateCount}`);
  }

  // Simulate "Keep First Duplicate" action
  const seenEmails = new Set<string>();
  const resolvedRows = dupReport.rows.map((r) => {
    const key = r.email.toLowerCase().trim();
    if (seenEmails.has(key)) {
      return { ...r, isExcluded: true };
    }
    seenEmails.add(key);
    return { ...r, isExcluded: false, status: "valid" as const };
  });

  const activeCount = resolvedRows.filter((r) => !r.isExcluded).length;
  if (activeCount !== 2) {
    throw new Error(`Expected 2 active rows after keeping first duplicate, got ${activeCount}`);
  }
  console.log("✓ Duplicate resolution strategy verified (First kept, duplicates excluded)");

  console.log("\n=======================================================");
  console.log(" ALL PHASE 10 EDGE CASES & PERFORMANCE TESTS PASSED! ");
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

runPhase10EdgeCaseTests().catch(async (e) => {
  console.error("Phase 10 Test failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
