import * as fs from "fs";
import { parseSpreadsheetBuffer } from "../src/lib/parser/spreadsheet-parser";

async function runPdfTest() {
  console.log("=== Testing User PDF Registration Table Parsing ===");
  const pdfPath = "C:/Users/anandakrishna/.gemini/antigravity/brain/18b00e06-5662-4c9f-b30e-908be04ec024/.user_uploaded/media_1793759646836_2349aa3d.pdf";
  if (!fs.existsSync(pdfPath)) {
    console.log("Local user PDF not found, skipping local PDF regression test.");
    return;
  }
  const buffer = fs.readFileSync(pdfPath);

  const report = await parseSpreadsheetBuffer(buffer, "clash_of_codes.pdf");

  console.log(`\nReport Summary:`);
  console.log(`- Total Rows (Participants): ${report.totalRows}`);
  console.log(`- Valid: ${report.validCount}`);
  console.log(`- Invalid: ${report.invalidCount}`);
  console.log(`- Duplicates: ${report.duplicateCount}`);
  console.log(`- Is Team Mode: ${report.isTeamMode}`);
  console.log(`- Detected Columns:`, report.detectedColumns);

  // Validate expectations
  if (!report.isTeamMode) {
    throw new Error("Expected isTeamMode to be TRUE!");
  }

  if (report.detectedColumns.leaderNameColumn !== "Team Leader :") {
    throw new Error(`Expected Leader Name Column to be 'Team Leader :', got '${report.detectedColumns.leaderNameColumn}'`);
  }

  if (report.detectedColumns.emailColumn !== "Email ID") {
    throw new Error(`Expected Email Column to be 'Email ID', got '${report.detectedColumns.emailColumn}'`);
  }

  // Check that all delivery emails are valid and not tofu
  for (const row of report.rows) {
    if (row.recipientEmail?.includes("\u0001") || row.name?.includes("\u0001")) {
      throw new Error(`Tofu character found in row: ${JSON.stringify(row)}`);
    }
  }

  console.log(`\nSample participant rows:`);
  report.rows.slice(0, 5).forEach((r, idx) => {
    console.log(`[${idx + 1}] Name="${r.name}" | RecipientEmail="${r.recipientEmail}" | Team="${r.teamName}" | Leader="${r.leaderName}" | Role="${r.extraFields?.role}"`);
  });

  console.log("\n>>> PDF TABLE PARSER TEST PASSED PERFECTLY! <<<");
}

runPdfTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
