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
        _count: {
          select: {
            participants: true,
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

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    let certificateCount = 0;
    let deliveryCount = 0;
    for (const p of event.participants) {
      certificateCount += p._count.certificates;
      deliveryCount += p._count.emailDeliveries;
    }

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: event.eventDate,
        organizerName: event.organizerName,
        createdAt: event.createdAt,
        participantCount: event._count.participants,
        certificateCount,
        deliveryCount,
        activeTemplate: event.templates[0] || null,
      },
    });
  } catch (error: any) {
    console.error("Get event error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, eventDate, organizerName } = await req.json();

    const existing = await prisma.event.findFirst({
      where: { id: params.eventId, authorId: session.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const updated = await prisma.event.update({
      where: { id: params.eventId },
      data: {
        name: name ? name.trim() : existing.name,
        description: description !== undefined ? description?.trim() : existing.description,
        eventDate: eventDate ? new Date(eventDate) : existing.eventDate,
        organizerName: organizerName ? organizerName.trim() : existing.organizerName,
      },
    });

    return NextResponse.json({ event: updated });
  } catch (error: any) {
    console.error("Update event error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.event.findFirst({
      where: { id: params.eventId, authorId: session.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id: params.eventId },
    });

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error: any) {
    console.error("Delete event error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
