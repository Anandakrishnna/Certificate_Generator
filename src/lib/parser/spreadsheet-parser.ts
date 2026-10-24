import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  RawParticipantRow,
  ValidationReport,
  validateParticipantRows,
  RFC_EMAIL_REGEX,
} from "./validator";

const NAME_ALIASES = [
  "name",
  "full_name",
  "fullname",
  "participant_name",
  "participant",
  "student_name",
  "attendee_name",
  "attendee",
  "first_name",
  "firstname",
  "recipient_name",
  "recipient",
  "candidate",
  "candidate_name",
  "member_name",
  "member",
  "registrant",
  "user_name",
  "username",
  "contact_name",
  "contact",
  "delegates",
  "nom",
  "nombre",
];

const EMAIL_ALIASES = [
  "email",
  "email_address",
  "emailaddress",
  "mail",
  "e_mail",
  "email_id",
  "emailid",
  "mail_id",
  "primary_email",
  "participant_email",
  "student_email",
  "attendee_email",
  "recipient_email",
  "contact_email",
  "correo",
];

function normalizeHeader(header: string): string {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.]+/g, "_");
}

export interface ParseOptions {
  nameColumn?: string;
  emailColumn?: string;
  sheetName?: string;
}

export function parseSpreadsheetBuffer(
  buffer: Buffer,
  filename: string,
  options?: ParseOptions
): ValidationReport {
  const lowerName = filename.toLowerCase();
  const isDelimitedText =
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".tsv") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".tab");

  let rawJsonRows: Record<string, any>[] = [];
  let sheetNames: string[] = [];
  let activeSheetName: string | undefined = options?.sheetName;

  if (isDelimitedText) {
    const textContent = buffer.toString("utf-8");
    const parsed = Papa.parse(textContent, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
    });
    rawJsonRows = (parsed.data as Record<string, any>[]).filter((r) =>
      Object.values(r).some((v) => String(v).trim() !== "")
    );
  } else {
    // Process any Excel / OpenDocument format supported by SheetJS
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      throw new Error("Spreadsheet contains no sheets or readable data.");
    }

    if (!activeSheetName || !sheetNames.includes(activeSheetName)) {
      // Pick sheet with largest number of rows
      let maxRows = -1;
      activeSheetName = sheetNames[0];
      for (const sName of sheetNames) {
        const sheet = workbook.Sheets[sName];
        if (sheet && sheet["!ref"]) {
          const range = XLSX.utils.decode_range(sheet["!ref"]);
          const rowCount = range.e.r - range.s.r + 1;
          if (rowCount > maxRows) {
            maxRows = rowCount;
            activeSheetName = sName;
          }
        }
      }
    }

    const worksheet = workbook.Sheets[activeSheetName];
    // Read as 2D array first to detect header row if metadata/title rows exist
    const rawAoa = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (!rawAoa || rawAoa.length === 0) {
      throw new Error(`Sheet "${activeSheetName}" is empty.`);
    }

    // Detect header row index within first 10 rows
    let headerRowIndex = 0;
    let maxFilledCols = 0;
    const searchLimit = Math.min(10, rawAoa.length);

    for (let i = 0; i < searchLimit; i++) {
      const row = rawAoa[i];
      if (Array.isArray(row)) {
        const filled = row.filter((c) => String(c).trim() !== "").length;
        if (filled > maxFilledCols) {
          maxFilledCols = filled;
          headerRowIndex = i;
        }
      }
    }

    // Convert to JSON using detected header row
    const headers = (rawAoa[headerRowIndex] || []).map((h, i) =>
      String(h || `Column_${i + 1}`).trim()
    );

    const rowsAfterHeader = rawAoa.slice(headerRowIndex + 1);
    rawJsonRows = rowsAfterHeader
      .map((row) => {
        const obj: Record<string, any> = {};
        headers.forEach((h, colIdx) => {
          obj[h] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : "";
        });
        return obj;
      })
      .filter((r) => Object.values(r).some((v) => v !== ""));
  }

  if (rawJsonRows.length === 0) {
    throw new Error("Spreadsheet contains no participant data rows.");
  }

  // Determine available columns
  const allColumns = Object.keys(rawJsonRows[0] || {});
  if (allColumns.length === 0) {
    throw new Error("Unable to identify table columns in spreadsheet.");
  }

  let nameColumnKey: string | null = options?.nameColumn || null;
  let emailColumnKey: string | null = options?.emailColumn || null;

  // 1. Check direct aliases if not manually passed
  if (!nameColumnKey || !allColumns.includes(nameColumnKey)) {
    nameColumnKey = null;
    for (const key of allColumns) {
      const norm = normalizeHeader(key);
      if (NAME_ALIASES.includes(norm)) {
        nameColumnKey = key;
        break;
      }
    }
  }

  if (!emailColumnKey || !allColumns.includes(emailColumnKey)) {
    emailColumnKey = null;
    for (const key of allColumns) {
      const norm = normalizeHeader(key);
      if (EMAIL_ALIASES.includes(norm)) {
        emailColumnKey = key;
        break;
      }
    }
  }

  // 2. Value-based heuristic detection for Email
  if (!emailColumnKey) {
    let bestEmailCol = "";
    let highestEmailMatches = 0;

    for (const col of allColumns) {
      let matches = 0;
      for (const row of rawJsonRows.slice(0, 30)) {
        const val = String(row[col] || "").trim();
        if (RFC_EMAIL_REGEX.test(val)) {
          matches++;
        }
      }
      if (matches > highestEmailMatches) {
        highestEmailMatches = matches;
        bestEmailCol = col;
      }
    }

    if (highestEmailMatches > 0) {
      emailColumnKey = bestEmailCol;
    }
  }

  // 3. Heuristic detection for Name (first non-email string column)
  if (!nameColumnKey) {
    for (const col of allColumns) {
      if (col !== emailColumnKey) {
        nameColumnKey = col;
        break;
      }
    }
  }

  // Fallback defaults if still unresolved
  if (!nameColumnKey) nameColumnKey = allColumns[0];
  if (!emailColumnKey) emailColumnKey = allColumns.length > 1 ? allColumns[1] : allColumns[0];

  const extraColumns = allColumns.filter(
    (col) => col !== nameColumnKey && col !== emailColumnKey
  );

  // Map rows
  const rawRows: RawParticipantRow[] = rawJsonRows.map((row, index) => {
    const extraFields: Record<string, any> = {};
    for (const col of extraColumns) {
      if (row[col] !== undefined && row[col] !== "") {
        extraFields[col] = String(row[col]).trim();
      }
    }

    return {
      rowNumber: index + 2,
      rawName: String(row[nameColumnKey!] || "").trim(),
      rawEmail: String(row[emailColumnKey!] || "").trim(),
      extraFields,
    };
  });

  return validateParticipantRows(
    rawRows,
    {
      nameColumn: nameColumnKey,
      emailColumn: emailColumnKey,
      extraColumns,
      allColumns,
    },
    {
      sheetNames,
      activeSheetName,
      rawRows: rawJsonRows,
    }
  );
}
