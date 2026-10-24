import { parseSpreadsheetBuffer } from "../src/lib/parser/spreadsheet-parser.js";
import * as XLSX from "xlsx";

function runParserTests() {
  console.log("=== Testing Phase 4: Spreadsheet Parser & Validation Engine ===");

  // 1. Test CSV with mixed header casing, aliases, invalid emails, and duplicates
  console.log("1. Testing CSV parsing with aliases and edge cases...");
  const sampleCsv = `Participant_Name,Email_Address,Award,College
Alice Walker,alice@university.edu,1st Place,Stanford
Bob Dylan,invalid-email-no-at,2nd Place,MIT
,no.name@example.com,Participant,Harvard
Charlie Brown,alice@university.edu,Honorable Mention,Stanford
Diana Prince,diana.prince@dc.com,Participant,Gotham College`;

  const csvBuffer = Buffer.from(sampleCsv, "utf-8");
  const csvReport = parseSpreadsheetBuffer(csvBuffer, "participants.csv");

  console.log(`✓ Total rows detected: ${csvReport.totalRows} (Expected: 5)`);
  if (csvReport.totalRows !== 5) throw new Error("Expected 5 rows in CSV");

  // Check alias matching
  if (csvReport.detectedColumns.nameColumn !== "Participant_Name") {
    throw new Error("Failed to match alias for name: Participant_Name");
  }
  if (csvReport.detectedColumns.emailColumn !== "Email_Address") {
    throw new Error("Failed to match alias for email: Email_Address");
  }
  console.log("✓ Aliases correctly matched (Participant_Name, Email_Address)");

  // Check extra columns
  if (!csvReport.detectedColumns.extraColumns.includes("Award") || !csvReport.detectedColumns.extraColumns.includes("College")) {
    throw new Error("Failed to preserve extra columns (Award, College)");
  }
  console.log("✓ Extra columns preserved: Award, College");

  // Check invalid email detection (Bob Dylan)
  const bobRow = csvReport.rows.find((r) => r.name === "Bob Dylan");
  if (!bobRow || bobRow.status !== "invalid" || !bobRow.errorReasons.some((r) => r.includes("Invalid email"))) {
    throw new Error("Failed to flag invalid email for Bob Dylan");
  }
  console.log("✓ Invalid RFC email format correctly caught");

  // Check empty name detection (row 3)
  const emptyNameRow = csvReport.rows.find((r) => r.email === "no.name@example.com");
  if (!emptyNameRow || emptyNameRow.status !== "invalid" || !emptyNameRow.errorReasons.some((r) => r.includes("name cannot be empty"))) {
    throw new Error("Failed to flag empty name row");
  }
  console.log("✓ Empty participant name correctly caught");

  // Check duplicate email detection (alice@university.edu used twice)
  const duplicateRows = csvReport.rows.filter((r) => r.email === "alice@university.edu");
  if (duplicateRows.length !== 2 || duplicateRows.some((r) => r.status !== "duplicate")) {
    throw new Error("Failed to detect duplicate email rows for alice@university.edu");
  }
  console.log("✓ Duplicate emails across multiple rows correctly caught");

  // 2. Test Excel XLSX generation and parsing
  console.log("2. Testing Excel (.xlsx) binary parsing...");
  const wsData = [
    ["student_name", "mail", "team"],
    ["Elena Rostova", "elena@tech.io", "Alpha"],
    ["Marcus Vance", "marcus@tech.io", "Beta"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendees");
  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const xlsxReport = parseSpreadsheetBuffer(xlsxBuffer, "attendees.xlsx");
  if (xlsxReport.totalRows !== 2 || xlsxReport.validCount !== 2) {
    throw new Error(`XLSX parsing failed! Total: ${xlsxReport.totalRows}, Valid: ${xlsxReport.validCount}`);
  }
  console.log(`✓ XLSX binary parsed successfully (${xlsxReport.validCount} valid rows)`);

  console.log("\n>>> ALL PHASE 4 PARSER & VALIDATION TESTS PASSED! <<<");
}

try {
  runParserTests();
} catch (err) {
  console.error("Test error:", err);
  process.exit(1);
}
