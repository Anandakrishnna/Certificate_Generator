import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await prisma.event.findMany({
      where: { authorId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            participants: true,
            templates: true,
            // count certificates across event
          },
        },
        participants: {
          select: {
            _count: {
              select: {
                certificates: true,
                emailDeliveries: true,
              },
            },
          },
        },
      },
    });

    // Format events with aggregated totals
    const formattedEvents = events.map((event) => {
      let totalCertificates = 0;
      let totalDeliveries = 0;

      for (const p of event.participants) {
        totalCertificates += p._count.certificates;
        totalDeliveries += p._count.emailDeliveries;
      }

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: event.eventDate,
        organizerName: event.organizerName,
        createdAt: event.createdAt,
        participantCount: event._count.participants,
        templateCount: event._count.templates,
        certificateCount: totalCertificates,
        deliveryCount: totalDeliveries,
      };
    });

    return NextResponse.json({ events: formattedEvents });
  } catch (error: any) {
    console.error("Fetch events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, eventDate, organizerName } = await req.json();

    if (!name || !organizerName || !eventDate) {
      return NextResponse.json(
        { error: "Event name, organizer name, and date are required." },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        authorId: session.userId,
        name: name.trim(),
        description: description?.trim() || null,
        eventDate: new Date(eventDate),
        organizerName: organizerName.trim(),
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: any) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
