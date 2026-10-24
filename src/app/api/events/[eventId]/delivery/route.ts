import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_EMAIL_TEMPLATE } from "@/lib/email/templates";

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
        participants: {
          include: {
            certificates: {
              take: 1,
              orderBy: { generatedAt: "desc" },
            },
            emailDeliveries: {
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    let sent = 0;
    let queued = 0;
    let sending = 0;
    let failed = 0;
    let retrying = 0;

    const recipientList = event.participants.map((p) => {
      const cert = p.certificates[0] || null;
      const delivery = p.emailDeliveries[0] || null;

      const status = delivery ? delivery.status : "not_queued";

      if (status === "sent") sent++;
      else if (status === "queued") queued++;
      else if (status === "sending") sending++;
      else if (status === "failed") failed++;
      else if (status === "retrying") retrying++;

      return {
        participantId: p.id,
        deliveryId: delivery?.id || null,
        name: p.name,
        email: p.email,
        certificateId: cert?.id || null,
        certificateUid: cert?.certificateUid || null,
        status,
        attemptCount: delivery?.attemptCount || 0,
        lastAttemptedAt: delivery?.lastAttemptedAt || null,
        errorMessage: delivery?.errorMessage || null,
        sentAt: delivery?.sentAt || null,
      };
    });

    const total = event.participants.length;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;

    // Build timeline of events from deliveries with activity
    const timeline = recipientList
      .filter((r) => r.sentAt || r.lastAttemptedAt)
      .map((r) => ({
        recipientName: r.name,
        recipientEmail: r.email,
        certificateUid: r.certificateUid,
        status: r.status,
        timestamp: r.sentAt || r.lastAttemptedAt,
        attemptCount: r.attemptCount,
        errorMessage: r.errorMessage,
      }))
      .sort(
        (a, b) =>
          new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
      )
      .slice(0, 50);

    return NextResponse.json({
      metrics: {
        total,
        sent,
        queued,
        sending,
        failed,
        retrying,
        successRate,
        certificatesReady: recipientList.filter((r) => r.certificateId !== null).length,
      },
      template: DEFAULT_EMAIL_TEMPLATE,
      recipients: recipientList,
      timeline,
    });
  } catch (error: any) {
    console.error("Fetch delivery status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery status" },
      { status: 500 }
    );
  }
}
