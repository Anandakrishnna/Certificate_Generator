import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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

    const { participants } = await req.json();

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "No valid participants to save." },
        { status: 400 }
      );
    }

    // Replace existing participants for this event in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing participants (cascades to certificates if regenerating)
      await tx.participant.deleteMany({
        where: { eventId: params.eventId },
      });

      // Bulk create new confirmed participants
      await tx.participant.createMany({
        data: participants.map((p: any) => ({
          eventId: params.eventId,
          name: p.name.trim(),
          email: p.email.trim().toLowerCase(),
          extraFields: JSON.stringify(p.extraFields || {}),
          validationStatus: "valid",
        })),
      });
    });

    const count = await prisma.participant.count({
      where: { eventId: params.eventId },
    });

    return NextResponse.json({
      message: `Successfully saved ${count} participants.`,
      count,
    });
  } catch (error: any) {
    console.error("Confirm participants error:", error);
    return NextResponse.json(
      { error: "Failed to save participants to event." },
      { status: 500 }
    );
  }
}
