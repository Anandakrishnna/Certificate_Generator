import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as zlib from "zlib";
import {
  RawParticipantRow,
  ValidationReport,
  validateParticipantRows,
  RFC_EMAIL_REGEX,
} from "./validator";

export const NAME_ALIASES = [
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

export const EMAIL_ALIASES = [
  "email_id",
  "emailid",
  "mail_id",
  "primary_email",
  "contact_email",
  "participant_email",
  "student_email",
  "email",
  "email_address",
  "emailaddress",
  "mail",
  "e_mail",
  "attendee_email",
  "recipient_email",
  "correo",
];

export const TEAM_ALIASES = [
  "team",
  "team_name",
  "teamname",
  "group",
  "group_name",
  "groupname",
  "project_team",
  "squad",
  "team_title",
];

export const LEADER_NAME_ALIASES = [
  "leader_name",
  "leadername",
  "leader",
  "team_leader",
  "team_leader_name",
  "teamleader",
  "team_lead",
  "lead_name",
  "captain",
  "captain_name",
  "lead",
];

export const LEADER_EMAIL_ALIASES = [
  "email_id",
  "emailid",
  "leader_email",
  "leader_mail",
  "leaderemail",
  "team_leader_email",
  "team_leader_mail",
  "team_lead_email",
  "teamlead_email",
  "captain_email",
  "lead_email",
  "primary_email",
  "contact_email",
  "mail_id",
  "participant_email",
];

export function normalizeHeader(header: string): string {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[:?*()]/g, "")
    .replace(/[\s\-_.]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export interface ParseOptions {
  nameColumn?: string;
  emailColumn?: string;
  sheetName?: string;
  isTeamMode?: boolean;
  teamColumn?: string;
  leaderNameColumn?: string;
  leaderEmailColumn?: string;
}

export interface DetectedTeamColumns {
  teamColumn?: string;
  leaderNameColumn: string;
  leaderEmailColumn: string;
  memberColumns: { nameCol: string; emailCol?: string }[];
}

/**
 * Detect team columns for Option C (1 team per row with leader + members)
 */
export function detectTeamColumns(
  allColumns: string[],
  options?: ParseOptions
): DetectedTeamColumns | null {
  // 1. Check for team name column
  let teamColumn: string | undefined = options?.teamColumn;
  if (!teamColumn || !allColumns.includes(teamColumn)) {
    for (const key of allColumns) {
      if (TEAM_ALIASES.includes(normalizeHeader(key))) {
        teamColumn = key;
        break;
      }
    }
  }

  // 2. Check for leader name column
  let leaderNameColumn: string | undefined =
    options?.leaderNameColumn || options?.nameColumn;
  if (!leaderNameColumn || !allColumns.includes(leaderNameColumn)) {
    for (const key of allColumns) {
      if (LEADER_NAME_ALIASES.includes(normalizeHeader(key))) {
        leaderNameColumn = key;
        break;
      }
    }
  }

  // 3. Check for leader email column
  let leaderEmailColumn: string | undefined =
    options?.leaderEmailColumn || options?.emailColumn;
  if (!leaderEmailColumn || !allColumns.includes(leaderEmailColumn)) {
    for (const key of allColumns) {
      if (LEADER_EMAIL_ALIASES.includes(normalizeHeader(key))) {
        leaderEmailColumn = key;
        break;
      }
    }
  }

  // 4. Find member columns (e.g. Member 2 Name, Member 2 Email, Member 3, etc.)
  const memberMap = new Map<number, { nameCol?: string; emailCol?: string }>();

  for (const col of allColumns) {
    if (col === teamColumn || col === leaderNameColumn || col === leaderEmailColumn) {
      continue;
    }

    const norm = normalizeHeader(col);

    // Matches: member_2_name, member2_name, member_2, member2, team_member_2
    const nameMatch = norm.match(/^(?:team_?)?member_?([0-9]+)(?:_?(?:name|full_?name))?$/);
    // Matches: member_2_email, member2_email, member_2_mail, team_member_2_email
    const emailMatch = norm.match(/^(?:team_?)?member_?([0-9]+)_?(?:email|mail|email_id|emailaddress)$/);

    if (emailMatch) {
      const num = parseInt(emailMatch[1], 10);
      const curr = memberMap.get(num) || {};
      curr.emailCol = col;
      memberMap.set(num, curr);
    } else if (nameMatch) {
      const num = parseInt(nameMatch[1], 10);
      const curr = memberMap.get(num) || {};
      curr.nameCol = col;
      memberMap.set(num, curr);
    }
  }

  // Convert memberMap to sorted array
  const memberColumns: { nameCol: string; emailCol?: string }[] = [];
  const sortedKeys = Array.from(memberMap.keys()).sort((a, b) => a - b);
  for (const k of sortedKeys) {
    const item = memberMap.get(k);
    if (item?.nameCol) {
      memberColumns.push({
        nameCol: item.nameCol,
        emailCol: item.emailCol,
      });
    }
  }

  const isAutoTeam =
    memberColumns.length > 0 &&
    (Boolean(teamColumn) || Boolean(leaderNameColumn) || Boolean(leaderEmailColumn));

  if (options?.isTeamMode || isAutoTeam) {
    if (!leaderNameColumn) {
      for (const key of allColumns) {
        if (key !== teamColumn && !memberMap.has(1) && NAME_ALIASES.includes(normalizeHeader(key))) {
          leaderNameColumn = key;
          break;
        }
      }
      if (!leaderNameColumn) leaderNameColumn = allColumns[0];
    }

    if (!leaderEmailColumn) {
      for (const key of allColumns) {
        if (key !== teamColumn && key !== leaderNameColumn && EMAIL_ALIASES.includes(normalizeHeader(key))) {
          leaderEmailColumn = key;
          break;
        }
      }
      if (!leaderEmailColumn) {
        leaderEmailColumn =
          allColumns.find((c) => c !== teamColumn && c !== leaderNameColumn) ||
          allColumns[1] ||
          allColumns[0];
      }
    }

    return {
      teamColumn,
      leaderNameColumn,
      leaderEmailColumn,
      memberColumns,
    };
  }

  return null;
}

/**
 * Expand team rows into individual participants with leader routing
 */
export function expandTeamRows(
  rawJsonRows: Record<string, any>[],
  teamConfig: DetectedTeamColumns,
  allColumns: string[]
): RawParticipantRow[] {
  const { teamColumn, leaderNameColumn, leaderEmailColumn, memberColumns } = teamConfig;
  const rawRows: RawParticipantRow[] = [];

  const excludedFromExtra = new Set<string>([
    leaderNameColumn,
    leaderEmailColumn,
  ]);
  if (teamColumn) excludedFromExtra.add(teamColumn);
  for (const m of memberColumns) {
    excludedFromExtra.add(m.nameCol);
    if (m.emailCol) excludedFromExtra.add(m.emailCol);
  }

  const extraColumns = allColumns.filter((col) => !excludedFromExtra.has(col));

  rawJsonRows.forEach((row, rowIndex) => {
    const teamName = teamColumn && row[teamColumn]
      ? String(row[teamColumn]).trim()
      : `Team ${rowIndex + 1}`;

    const leaderName = String(row[leaderNameColumn] || "").trim();
    const leaderEmail = String(row[leaderEmailColumn] || "").trim();

    // Collect common team extra fields (e.g. project title, college, track)
    const baseExtra: Record<string, any> = {};
    for (const col of extraColumns) {
      if (row[col] !== undefined && row[col] !== "") {
        baseExtra[col] = String(row[col]).trim();
      }
    }

    // 1. Leader row
    if (leaderName) {
      rawRows.push({
        rowNumber: rowIndex + 2,
        rawName: leaderName,
        rawEmail: leaderEmail,
        isLeader: true,
        teamName,
        leaderName,
        leaderEmail,
        recipientEmail: leaderEmail,
        deliveredToLeader: false,
        extraFields: {
          ...baseExtra,
          teamName,
          role: "Team Leader",
          leaderName,
          leaderEmail,
        },
      });
    }

    // 2. Member rows
    for (const m of memberColumns) {
      const memberName = String(row[m.nameCol] || "").trim();
      if (
        !memberName ||
        ["nil", "nill", "none", "na", "n/a", "-", "--", "null", "no", "nobody"].includes(
          memberName.toLowerCase()
        )
      ) {
        continue; // skip blank or placeholder member slots like "Nill"
      }

      const memberEmail = m.emailCol ? String(row[m.emailCol] || "").trim() : "";
      const deliveredToLeader = !memberEmail;

      rawRows.push({
        rowNumber: rowIndex + 2,
        rawName: memberName,
        rawEmail: memberEmail,
        isLeader: false,
        teamName,
        leaderName,
        leaderEmail,
        recipientEmail: memberEmail || leaderEmail,
        deliveredToLeader,
        extraFields: {
          ...baseExtra,
          teamName,
          role: "Team Member",
          leaderName,
          leaderEmail,
          memberEmail: memberEmail || null,
          recipientEmail: memberEmail || leaderEmail,
        },
      });
    }
  });

  return rawRows;
}

export async function parsePdfToRows(pdfBuffer: Buffer): Promise<Record<string, any>[]> {
  let PDFParseClass: any;
  try {
    const { createRequire } = await import("module");
    const nodeRequire = createRequire(import.meta.url);
    PDFParseClass = nodeRequire("pdf-parse").PDFParse;
  } catch {
    const mod = await import("pdf-parse");
    PDFParseClass = (mod as any).PDFParse || (mod as any).default?.PDFParse;
  }

  const parser: any = new PDFParseClass({ data: pdfBuffer });
  await parser.load();

  const numPages: number = parser.doc?.numPages || 1;
  const allRows: Record<string, any>[] = [];
  let detectedHeaders: string[] = [];
  let colPositions: { name: string; x: number }[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await parser.doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: { text: string; x: number; y: number }[] = [];
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      items.push({
        text: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5],
      });
    }

    if (items.length === 0) continue;

    // Sort descending by y (top down), then ascending by x (left to right)
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group items into rows by y position (tolerance ~ 5.5 units)
    const rawRows: { text: string; x: number; y: number }[][] = [];
    let currentRow: { text: string; x: number; y: number }[] = [];
    let currentY: number | null = null;

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) > 5.5) {
        if (currentRow.length > 0) {
          currentRow.sort((a, b) => a.x - b.x);
          rawRows.push(currentRow);
        }
        currentRow = [item];
        currentY = item.y;
      } else {
        currentRow.push(item);
      }
    }
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rawRows.push(currentRow);
    }

    // Filter out page footers like "-- 1 of 1 --" or "Page 1 of 2"
    const validRows = rawRows.filter((r) => {
      const fullText = r.map((c) => c.text).join(" ").trim();
      return (
        !fullText.match(/^--\s*\d+\s+of\s+\d+\s*--$/i) &&
        !fullText.match(/^page\s+\d+\s+(?:of|\/)\s+\d+$/i)
      );
    });

    if (validRows.length === 0) continue;

    let dataStartIndex = 0;
    // On the first page with content, identify header row
    if (detectedHeaders.length === 0) {
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(validRows.length, 5); i++) {
        const rowTexts = validRows[i].map((c) => c.text.toLowerCase());
        const hasHeaderCandidate = rowTexts.some((t) =>
          [
            "name",
            "email",
            "team",
            "leader",
            "member",
            "timestamp",
            "phone",
            "student",
            "roll",
            "id",
          ].some((kw) => t.includes(kw))
        );
        if (hasHeaderCandidate) {
          headerRowIdx = i;
          break;
        }
      }

      const headerItems = validRows[headerRowIdx];
      detectedHeaders = headerItems.map((h, i) => h.text.trim() || `Column_${i + 1}`);
      colPositions = headerItems.map((h) => ({
        name: h.text.trim() || `Column`,
        x: h.x,
      }));
      dataStartIndex = headerRowIdx + 1;
    }

    // Map each data row into an object matching the detected headers
    for (let r = dataStartIndex; r < validRows.length; r++) {
      const rowItems = validRows[r];

      // If a subsequent page repeats the header row, skip it
      const rowTexts = rowItems.map((c) => c.text.toLowerCase());
      const isRepeatedHeader =
        rowItems.length === detectedHeaders.length &&
        rowTexts.some((t) =>
          ["timestamp", "email", "team", "leader", "member"].some((kw) => t.includes(kw))
        );
      if (r === 0 && pageNum > 1 && isRepeatedHeader) {
        continue;
      }

      const rowObj: Record<string, any> = {};
      detectedHeaders.forEach((h) => {
        rowObj[h] = "";
      });

      if (rowItems.length === detectedHeaders.length) {
        rowItems.forEach((item, idx) => {
          rowObj[detectedHeaders[idx]] = item.text;
        });
      } else {
        // Map items to column headers based on x coordinate boundaries
        for (const item of rowItems) {
          let assignedIdx = 0;
          for (let i = colPositions.length - 1; i >= 0; i--) {
            if (item.x >= colPositions[i].x - 15) {
              assignedIdx = i;
              break;
            }
          }
          const colName = detectedHeaders[assignedIdx];
          if (rowObj[colName]) {
            rowObj[colName] += " " + item.text;
          } else {
            rowObj[colName] = item.text;
          }
        }
      }

      if (Object.values(rowObj).some((v) => String(v).trim() !== "")) {
        allRows.push(rowObj);
      }
    }
  }

  await parser.destroy();

  if (allRows.length === 0) {
    throw new Error(
      "Unable to extract text from this PDF. Please make sure the PDF contains selectable text (not a scanned image) or use an Excel (.xlsx) / CSV file."
    );
  }

  return allRows;
}

export async function parseSpreadsheetBuffer(
  buffer: Buffer,
  filename: string,
  options?: ParseOptions
): Promise<ValidationReport> {
  const lowerName = filename.toLowerCase();

  // Guard: Reject image files (direct users to Template step)
  const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"];
  if (imageExtensions.some((ext) => lowerName.endsWith(ext))) {
    throw new Error(
      "You uploaded an image file instead of a participant spreadsheet. Please upload an Excel (.xlsx, .xls), CSV (.csv), or PDF table file. (If this is your certificate background design, please upload it under the 'Template' tab)."
    );
  }

  const isPdf =
    lowerName.endsWith(".pdf") ||
    (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-");

  const isDelimitedText =
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".tsv") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".tab");

  let rawJsonRows: Record<string, any>[] = [];
  let sheetNames: string[] = [];
  let activeSheetName: string | undefined = options?.sheetName;

  if (isPdf) {
    rawJsonRows = await parsePdfToRows(buffer);
  } else if (isDelimitedText) {
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

  // Check if Team Mode (Option C) applies
  const teamConfig = detectTeamColumns(allColumns, options);

  if (teamConfig) {
    const rawRows = expandTeamRows(rawJsonRows, teamConfig, allColumns);

    return validateParticipantRows(
      rawRows,
      {
        nameColumn: teamConfig.leaderNameColumn,
        emailColumn: teamConfig.leaderEmailColumn,
        teamColumn: teamConfig.teamColumn,
        leaderNameColumn: teamConfig.leaderNameColumn,
        leaderEmailColumn: teamConfig.leaderEmailColumn,
        memberColumns: teamConfig.memberColumns,
        extraColumns: allColumns.filter(
          (c) =>
            c !== teamConfig.teamColumn &&
            c !== teamConfig.leaderNameColumn &&
            c !== teamConfig.leaderEmailColumn &&
            !teamConfig.memberColumns.some((m) => m.nameCol === c || m.emailCol === c)
        ),
        allColumns,
      },
      {
        sheetNames,
        activeSheetName,
        rawRows: rawJsonRows,
        isTeamMode: true,
      }
    );
  }

  // Standard Individual Row Mode (1 participant per row)
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
      isTeamMode: false,
    }
  );
}
