export interface RawParticipantRow {
  rowNumber: number;
  rawName: string;
  rawEmail: string;
  extraFields: Record<string, any>;
}

export interface ValidatedParticipantRow {
  id: string; // temporary row id for frontend manipulation
  rowNumber: number;
  name: string;
  email: string;
  extraFields: Record<string, any>;
  status: "valid" | "invalid" | "duplicate";
  errorReasons: string[];
  isExcluded: boolean;
}

export interface ValidationReport {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  excludedCount: number;
  rows: ValidatedParticipantRow[];
  detectedColumns: {
    nameColumn: string;
    emailColumn: string;
    extraColumns: string[];
    allColumns: string[];
  };
  sheetNames?: string[];
  activeSheetName?: string;
  rawRows?: Record<string, any>[]; // cached parsed rows for instant client-side column re-mapping
}

// RFC 5322 compliant regex for practical email validation
export const RFC_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateParticipantRows(
  rows: RawParticipantRow[],
  detectedColumns: {
    nameColumn: string;
    emailColumn: string;
    extraColumns: string[];
    allColumns: string[];
  },
  options?: {
    sheetNames?: string[];
    activeSheetName?: string;
    rawRows?: Record<string, any>[];
  }
): ValidationReport {
  const seenEmails = new Map<string, number>();
  const validatedRows: ValidatedParticipantRow[] = [];

  // Pass 1: Count email occurrences to identify duplicates
  rows.forEach((row) => {
    const emailKey = (row.rawEmail || "").trim().toLowerCase();
    if (emailKey) {
      seenEmails.set(emailKey, (seenEmails.get(emailKey) || 0) + 1);
    }
  });

  // Pass 2: Validate each row
  rows.forEach((row, index) => {
    const errorReasons: string[] = [];
    const name = (row.rawName || "").trim();
    const email = (row.rawEmail || "").trim();
    const emailLower = email.toLowerCase();

    // 1. Name validation
    if (!name) {
      errorReasons.push("Participant name cannot be empty");
    }

    // 2. Email format validation
    if (!email) {
      errorReasons.push("Email address cannot be empty");
    } else if (!RFC_EMAIL_REGEX.test(email)) {
      errorReasons.push("Invalid email format (RFC compliance error)");
    }

    // 3. Duplicate detection
    const isDuplicate = emailLower && (seenEmails.get(emailLower) || 0) > 1;
    if (isDuplicate) {
      errorReasons.push("Duplicate email address detected in spreadsheet");
    }

    let status: "valid" | "invalid" | "duplicate" = "valid";
    if (errorReasons.some((r) => r.includes("Duplicate"))) {
      status = "duplicate";
    }
    if (errorReasons.some((r) => !r.includes("Duplicate"))) {
      status = "invalid";
    }

    validatedRows.push({
      id: `row-${index + 1}-${Date.now()}`,
      rowNumber: row.rowNumber,
      name,
      email,
      extraFields: row.extraFields,
      status,
      errorReasons,
      isExcluded: status !== "valid",
    });
  });

  const validCount = validatedRows.filter((r) => r.status === "valid").length;
  const invalidCount = validatedRows.filter((r) => r.status === "invalid").length;
  const duplicateCount = validatedRows.filter((r) => r.status === "duplicate").length;
  const excludedCount = validatedRows.filter((r) => r.isExcluded).length;

  return {
    totalRows: rows.length,
    validCount,
    invalidCount,
    duplicateCount,
    excludedCount,
    rows: validatedRows,
    detectedColumns,
    sheetNames: options?.sheetNames,
    activeSheetName: options?.activeSheetName,
    rawRows: options?.rawRows,
  };
}
