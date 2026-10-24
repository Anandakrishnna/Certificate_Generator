import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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
      include: {
        templates: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        participants: {
          take: 5,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const template = event.templates[0];
    if (!template) {
      return NextResponse.json(
        { error: "No certificate template configured yet. Please complete Step 2." },
        { status: 400 }
      );
    }

    const placeholders = JSON.parse(template.placeholders || "[]");

    // Extract available columns from participants
    const sampleParticipants = event.participants.map((p) => {
      const extra = JSON.parse(p.extraFields || "{}");
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        ...extra,
      };
    });

    // Gather all column keys
    const columnSet = new Set<string>(["name", "email"]);
    if (sampleParticipants.length > 0) {
      Object.keys(sampleParticipants[0]).forEach((k) => {
        if (k !== "id") columnSet.add(k);
      });
    }
    const availableColumns = Array.from(columnSet);

    // Initial smart auto-mapping suggestions
    const initialMapping: Record<string, { sourceType: "column" | "static"; column?: string; staticValue?: string }> = {};

    for (const ph of placeholders) {
      const key = ph.fieldKey.toLowerCase();
      if (key === "name") {
        initialMapping[ph.id] = { sourceType: "column", column: "name" };
      } else if (key === "event_name") {
        initialMapping[ph.id] = { sourceType: "static", staticValue: event.name };
      } else if (key === "organizer") {
        initialMapping[ph.id] = { sourceType: "static", staticValue: event.organizerName };
      } else if (key === "date") {
        initialMapping[ph.id] = {
          sourceType: "static",
          staticValue: new Date(event.eventDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        };
      } else {
        // Match with extra columns
        const matchedCol = availableColumns.find(
          (c) => c.toLowerCase().replace(/\s+/g, "_") === key
        );
        if (matchedCol) {
          initialMapping[ph.id] = { sourceType: "column", column: matchedCol };
        } else {
          initialMapping[ph.id] = { sourceType: "column", column: availableColumns[0] };
        }
      }
    }

    return NextResponse.json({
      template: {
        id: template.id,
        backgroundUrl: template.backgroundUrl,
        placeholders,
      },
      event: {
        id: event.id,
        name: event.name,
        organizerName: event.organizerName,
        eventDate: event.eventDate,
      },
      availableColumns,
      sampleParticipants,
      suggestedMapping: initialMapping,
    });
  } catch (error: any) {
    console.error("Fetch mapping data error:", error);
    return NextResponse.json(
      { error: "Failed to load mapping data" },
      { status: 500 }
    );
  }
}
