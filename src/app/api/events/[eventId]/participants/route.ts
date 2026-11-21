import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  parseSpreadsheetBuffer,
  detectTeamColumns,
  expandTeamRows,
} from "@/lib/parser/spreadsheet-parser";
import { validateParticipantRows } from "@/lib/parser/validator";

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findFirst({
      where: { id: params.eventId, authorId: session.userId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const participants = await prisma.participant.findMany({
      where: { eventId: params.eventId },
      orderBy: { createdAt: "asc" },
    });

    const parsedParticipants = participants.map((p) => ({
      ...p,
      extraFields: JSON.parse(p.extraFields || "{}"),
    }));

    return NextResponse.json({ participants: parsedParticipants });
  } catch (error: any) {
    console.error("Fetch participants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findFirst({
      where: { id: params.eventId, authorId: session.userId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";

    // Case 1: JSON payload (for remapping columns or pasting raw data directly)
    if (contentType.includes("application/json")) {
      const body = await req.json();

      // If user pasted raw text / TSV directly
      if (body.rawText) {
        const buffer = Buffer.from(body.rawText, "utf-8");
        const report = await parseSpreadsheetBuffer(buffer, "pasted_data.tsv", {
          nameColumn: body.nameColumn,
          emailColumn: body.emailColumn,
          isTeamMode: body.isTeamMode,
          teamColumn: body.teamColumn,
        });
        return NextResponse.json({ report });
      }

      // If re-mapping existing parsed rows with new name/email columns or toggling team mode
      if (body.rawRows) {
        const rawJsonRows: Record<string, any>[] = body.rawRows;
        const allColumns = Object.keys(rawJsonRows[0] || {});
        const isTeamMode = Boolean(body.isTeamMode);

        if (isTeamMode) {
          const teamConfig = detectTeamColumns(allColumns, {
            isTeamMode: true,
            teamColumn: body.teamColumn,
            leaderNameColumn: body.nameColumn || body.leaderNameColumn,
            leaderEmailColumn: body.emailColumn || body.leaderEmailColumn,
          });

          if (teamConfig) {
            const rawRows = expandTeamRows(rawJsonRows, teamConfig, allColumns);
            const report = validateParticipantRows(
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
                    !teamConfig.memberColumns.some(
                      (m) => m.nameCol === c || m.emailCol === c
                    )
                ),
                allColumns,
              },
              {
                rawRows: rawJsonRows,
                sheetNames: body.sheetNames,
                activeSheetName: body.activeSheetName,
                isTeamMode: true,
              }
            );
            return NextResponse.json({ report });
          }
        }

        // Standard 1-participant-per-row mode
        const nameCol = body.nameColumn || allColumns[0];
        const emailCol = body.emailColumn || allColumns[1] || allColumns[0];
        const extraColumns = allColumns.filter(
          (c) => c !== nameCol && c !== emailCol
        );

        const rawRows = rawJsonRows.map((row, idx) => {
          const extraFields: Record<string, any> = {};
          for (const col of extraColumns) {
            if (row[col] !== undefined && row[col] !== "") {
              extraFields[col] = String(row[col]).trim();
            }
          }
          return {
            rowNumber: idx + 2,
            rawName: String(row[nameCol] || "").trim(),
            rawEmail: String(row[emailCol] || "").trim(),
            extraFields,
          };
        });

        const report = validateParticipantRows(
          rawRows,
          {
            nameColumn: nameCol,
            emailColumn: emailCol,
            extraColumns,
            allColumns,
          },
          {
            rawRows: rawJsonRows,
            sheetNames: body.sheetNames,
            activeSheetName: body.activeSheetName,
            isTeamMode: false,
          }
        );

        return NextResponse.json({ report });
      }

      return NextResponse.json(
        { error: "Invalid JSON payload for participant parsing." },
        { status: 400 }
      );
    }

    // Case 2: Multipart Form Data (File Upload)
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const nameColumn = (formData.get("nameColumn") as string) || undefined;
    const emailColumn = (formData.get("emailColumn") as string) || undefined;
    const sheetName = (formData.get("sheetName") as string) || undefined;
    const isTeamMode =
      formData.get("isTeamMode") === "true" ? true : undefined;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided for upload" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const report = await parseSpreadsheetBuffer(buffer, file.name, {
      nameColumn,
      emailColumn,
      sheetName,
      isTeamMode,
    });

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Spreadsheet parsing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse spreadsheet" },
      { status: 400 }
    );
  }
}
