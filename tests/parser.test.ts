import { parseSpreadsheetBuffer } from "../src/lib/parser/spreadsheet-parser";
import * as XLSX from "xlsx";

function runParserTests() {
  console.log("=== Testing Universal Spreadsheet Parser & Cross-App Support ===");

  // 1. Standard CSV with aliases
  console.log("1. Testing CSV parsing with aliases and edge cases...");
  const sampleCsv = `Participant_Name,Email_Address,Award,College
Alice Walker,alice@university.edu,1st Place,Stanford
Bob Dylan,invalid-email-no-at,2nd Place,MIT
,no.name@example.com,Participant,Harvard
Charlie Brown,alice@university.edu,Honorable Mention,Stanford
Diana Prince,diana.prince@dc.com,Participant,Gotham College`;

  const csvBuffer = Buffer.from(sampleCsv, "utf-8");
  const csvReport = parseSpreadsheetBuffer(csvBuffer, "participants.csv");

  if (csvReport.totalRows !== 5) throw new Error("Expected 5 rows in CSV");
  console.log("✓ CSV with aliases parsed successfully");

  // 2. Arbitrary non-standard column headers (e.g. "Member", "Primary Contact", "Department")
  console.log("2. Testing spreadsheet with arbitrary non-standard column headers...");
  const nonStandardCsv = `Member,Primary Contact,Department
Liam Vance,liam.vance@company.com,Engineering
Sophia Lee,sophia.lee@company.com,Design`;

  const nonStandardReport = parseSpreadsheetBuffer(
    Buffer.from(nonStandardCsv, "utf-8"),
    "members.csv"
  );

  console.log(`✓ Detected name column: "${nonStandardReport.detectedColumns.nameColumn}"`);
  console.log(`✓ Detected email column: "${nonStandardReport.detectedColumns.emailColumn}"`);
  if (
    nonStandardReport.detectedColumns.nameColumn !== "Member" ||
    nonStandardReport.detectedColumns.emailColumn !== "Primary Contact"
  ) {
    throw new Error("Failed to auto-detect non-standard headers!");
  }
  console.log("✓ Arbitrary non-standard column headers parsed and detected via heuristics");

  // 3. Tab-Separated Values (TSV) from dragging or pasting from Excel / Google Sheets
  console.log("3. Testing TSV / raw text data dragged/pasted from Excel or Google Sheets...");
  const tsvData = "Full Name\tWork Email\tRole\nJohn Wick\tjohn.wick@continental.com\tLead\nNeo Anderson\tneo@matrix.io\tArchitect";
  const tsvReport = parseSpreadsheetBuffer(Buffer.from(tsvData, "utf-8"), "pasted_data.tsv");

  if (tsvReport.totalRows !== 2 || tsvReport.validCount !== 2) {
    throw new Error("TSV / Excel pasted text parsing failed!");
  }
  console.log("✓ Cross-app TSV / Excel text drag & drop parsed successfully");

  // 4. Excel spreadsheet with multiple metadata header rows (title in row 1, empty row 2, headers in row 3)
  console.log("4. Testing Excel spreadsheet with title banner on row 1...");
  const complexAoa = [
    ["2026 Annual Hackathon Official Registration List"], // Title banner row 1
    [""], // Empty row 2
    ["Student Name", "Student Email", "Project"], // Real header row 3
    ["Grace Hopper", "grace@navy.mil", "Compiler"],
    ["Ada Lovelace", "ada@analytical.org", "Engine"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(complexAoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const complexXlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const complexReport = parseSpreadsheetBuffer(complexXlsxBuffer, "complex.xlsx");
  if (complexReport.totalRows !== 2 || complexReport.validCount !== 2) {
    throw new Error("Failed to auto-skip title banner row in Excel file!");
  }
  console.log("✓ Complex Excel file with title banner on top auto-detected header row 3!");

  console.log("\n>>> ALL UNIVERSAL SPREADSHEET TESTS PASSED! <<<");
}

try {
  runParserTests();
} catch (err) {
  console.error("Test error:", err);
  process.exit(1);
}
