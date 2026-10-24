import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { parseSpreadsheetBuffer } from "@/lib/parser/spreadsheet-parser";
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
        const report = parseSpreadsheetBuffer(buffer, "pasted_data.tsv", {
          nameColumn: body.nameColumn,
          emailColumn: body.emailColumn,
        });
        return NextResponse.json({ report });
      }

      // If re-mapping existing parsed rows with new name/email columns
      if (body.rawRows && body.nameColumn && body.emailColumn) {
        const rawJsonRows: Record<string, any>[] = body.rawRows;
        const allColumns = Object.keys(rawJsonRows[0] || {});
        const extraColumns = allColumns.filter(
          (c) => c !== body.nameColumn && c !== body.emailColumn
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
            rawName: String(row[body.nameColumn] || "").trim(),
            rawEmail: String(row[body.emailColumn] || "").trim(),
            extraFields,
          };
        });

        const report = validateParticipantRows(
          rawRows,
          {
            nameColumn: body.nameColumn,
            emailColumn: body.emailColumn,
            extraColumns,
            allColumns,
          },
          {
            rawRows: rawJsonRows,
            sheetNames: body.sheetNames,
            activeSheetName: body.activeSheetName,
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

    const report = parseSpreadsheetBuffer(buffer, file.name, {
      nameColumn,
      emailColumn,
      sheetName,
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
