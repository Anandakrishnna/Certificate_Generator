import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_PLACEHOLDERS, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from "@/types/template";

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
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Determine extra columns from participants
    let extraColumns: string[] = [];
    let sampleParticipant: any = null;

    if (event.participants.length > 0) {
      const p = event.participants[0];
      const parsedExtra = JSON.parse(p.extraFields || "{}");
      extraColumns = Object.keys(parsedExtra);
      sampleParticipant = {
        name: p.name,
        email: p.email,
        ...parsedExtra,
      };
    } else {
      sampleParticipant = {
        name: "Sophia Martinez",
        email: "sophia.martinez@example.com",
      };
    }

    const existingTemplate = event.templates[0];

    const templateData = existingTemplate
      ? {
          id: existingTemplate.id,
          eventId: event.id,
          backgroundUrl: existingTemplate.backgroundUrl,
          placeholders: JSON.parse(existingTemplate.placeholders || "[]"),
          canvasWidth: DEFAULT_CANVAS_WIDTH,
          canvasHeight: DEFAULT_CANVAS_HEIGHT,
        }
      : {
          eventId: event.id,
          backgroundUrl: "", // Requires organizer to upload their own certificate template
          placeholders: DEFAULT_PLACEHOLDERS,
          canvasWidth: DEFAULT_CANVAS_WIDTH,
          canvasHeight: DEFAULT_CANVAS_HEIGHT,
        };

    return NextResponse.json({
      template: templateData,
      eventDetails: {
        id: event.id,
        name: event.name,
        organizerName: event.organizerName,
        eventDate: event.eventDate,
      },
      sampleParticipant,
      extraColumns,
    });
  } catch (error: any) {
    console.error("Get template error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
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
      include: { templates: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { backgroundUrl, placeholders } = await req.json();

    if (!backgroundUrl) {
      return NextResponse.json(
        { error: "Please upload your certificate template image first." },
        { status: 400 }
      );
    }

    const placeholdersString = JSON.stringify(placeholders || []);

    let savedTemplate;
    if (event.templates.length > 0) {
      savedTemplate = await prisma.template.update({
        where: { id: event.templates[0].id },
        data: {
          backgroundUrl,
          placeholders: placeholdersString,
        },
      });
    } else {
      savedTemplate = await prisma.template.create({
        data: {
          eventId: params.eventId,
          backgroundUrl,
          placeholders: placeholdersString,
        },
      });
    }

    return NextResponse.json({
      message: "Template saved successfully",
      template: {
        id: savedTemplate.id,
        eventId: savedTemplate.eventId,
        backgroundUrl: savedTemplate.backgroundUrl,
        placeholders: JSON.parse(savedTemplate.placeholders),
      },
    });
  } catch (error: any) {
    console.error("Save template error:", error);
    return NextResponse.json(
      { error: "Failed to save template configuration" },
      { status: 500 }
    );
  }
}
