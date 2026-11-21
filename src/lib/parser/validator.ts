export interface RawParticipantRow {
  rowNumber: number;
  rawName: string;
  rawEmail: string;
  extraFields: Record<string, any>;
  isLeader?: boolean;
  teamName?: string;
  leaderName?: string;
  leaderEmail?: string;
  recipientEmail?: string;
  deliveredToLeader?: boolean;
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
  isLeader?: boolean;
  teamName?: string;
  leaderName?: string;
  leaderEmail?: string;
  recipientEmail?: string;
  deliveredToLeader?: boolean;
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
    teamColumn?: string;
    leaderNameColumn?: string;
    leaderEmailColumn?: string;
    memberColumns?: { nameCol: string; emailCol?: string }[];
  };
  isTeamMode?: boolean;
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
    teamColumn?: string;
    leaderNameColumn?: string;
    leaderEmailColumn?: string;
    memberColumns?: { nameCol: string; emailCol?: string }[];
  },
  options?: {
    sheetNames?: string[];
    activeSheetName?: string;
    rawRows?: Record<string, any>[];
    isTeamMode?: boolean;
  }
): ValidationReport {
  const seenEmails = new Map<string, number>();
  const validatedRows: ValidatedParticipantRow[] = [];

  // Pass 1: Count email occurrences to identify duplicates (only for individual emails, excluding blank member fallbacks)
  rows.forEach((row) => {
    const emailKey = (row.rawEmail || "").trim().toLowerCase();
    // Only count as duplicate if it is a personal email explicitly provided
    if (emailKey && !row.deliveredToLeader) {
      seenEmails.set(emailKey, (seenEmails.get(emailKey) || 0) + 1);
    }
  });

  // Pass 2: Validate each row
  rows.forEach((row, index) => {
    const errorReasons: string[] = [];
    const name = (row.rawName || "").trim();
    const rawEmail = (row.rawEmail || "").trim();
    const emailLower = rawEmail.toLowerCase();
    const isMember = row.isLeader === false;
    const leaderEmail = (row.leaderEmail || "").trim();
    const leaderEmailValid = Boolean(leaderEmail && RFC_EMAIL_REGEX.test(leaderEmail));

    // 1. Name validation
    if (!name) {
      errorReasons.push("Participant name cannot be empty");
    }

    // 2. Email format & Group Leader fallback validation
    let finalEmail = rawEmail;
    let deliveredToLeader = row.deliveredToLeader || false;
    let recipientEmail = rawEmail;

    if (!rawEmail) {
      if (isMember) {
        if (leaderEmailValid) {
          // Valid fallback: will deliver to group leader
          deliveredToLeader = true;
          recipientEmail = leaderEmail;
          finalEmail = ""; // preserve empty personal email
        } else {
          errorReasons.push(
            "Member email is empty and team leader email is missing/invalid"
          );
        }
      } else {
        errorReasons.push("Email address cannot be empty");
      }
    } else if (!RFC_EMAIL_REGEX.test(rawEmail)) {
      if (isMember && leaderEmailValid) {
        // Fallback to leader on invalid member email with note
        deliveredToLeader = true;
        recipientEmail = leaderEmail;
        finalEmail = rawEmail;
        errorReasons.push(
          "Invalid member email format; certificate will route to team leader"
        );
      } else {
        errorReasons.push("Invalid email format (RFC compliance error)");
      }
    } else {
      recipientEmail = rawEmail;
    }

    // 3. Duplicate detection (only flag if non-empty individual email appears multiple times)
    const isDuplicate =
      rawEmail && !deliveredToLeader && (seenEmails.get(emailLower) || 0) > 1;
    if (isDuplicate) {
      errorReasons.push("Duplicate email address detected in spreadsheet");
    }

    let status: "valid" | "invalid" | "duplicate" = "valid";
    if (errorReasons.some((r) => r.includes("Duplicate"))) {
      status = "duplicate";
    }
    // If the only error was a routing notice, keep it valid!
    const fatalErrors = errorReasons.filter(
      (r) => !r.includes("Duplicate") && !r.includes("route to team leader")
    );
    if (fatalErrors.length > 0) {
      status = "invalid";
    }

    validatedRows.push({
      id: `row-${index + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rowNumber: row.rowNumber,
      name,
      email: finalEmail,
      extraFields: row.extraFields,
      status,
      errorReasons,
      isExcluded: status !== "valid",
      isLeader: row.isLeader,
      teamName: row.teamName,
      leaderName: row.leaderName,
      leaderEmail: row.leaderEmail,
      recipientEmail: recipientEmail || leaderEmail,
      deliveredToLeader,
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
    isTeamMode: options?.isTeamMode,
    sheetNames: options?.sheetNames,
    activeSheetName: options?.activeSheetName,
    rawRows: options?.rawRows,
  };
}
