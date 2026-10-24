import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { processEventDeliveries } from "@/lib/queue/delivery-worker";

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
      include: {
        participants: {
          include: {
            certificates: { take: 1, orderBy: { generatedAt: "desc" } },
            emailDeliveries: { take: 1, orderBy: { createdAt: "desc" } },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const isUserConfigured = Boolean(user?.smtpUser && user?.smtpPass);
    const isSystemConfigured = Boolean(
      (process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY
    );

    const { subject, body, allowSimulation } = await req.json();

    if (!isUserConfigured && !isSystemConfigured && !allowSimulation) {
      return NextResponse.json(
        {
          error:
            "Outgoing email provider is not configured. Please click 'Configure Gmail / SMTP' to connect your credentials before sending certificates.",
          requiresSmtpSetup: true,
        },
        { status: 400 }
      );
    }

    // 1. Queue deliveries for all participants who have a generated certificate
    let queuedCount = 0;
    for (const p of event.participants) {
      if (p.certificates.length > 0) {
        const cert = p.certificates[0];
        const existingDelivery = p.emailDeliveries[0];

        if (existingDelivery) {
          // Reset to queued
          await prisma.emailDelivery.update({
            where: { id: existingDelivery.id },
            data: {
              status: "queued",
              errorMessage: null,
              lastAttemptedAt: null,
            },
          });
        } else {
          await prisma.emailDelivery.create({
            data: {
              certificateId: cert.id,
              participantId: p.id,
              status: "queued",
            },
          });
        }
        queuedCount++;
      }
    }

    // 2. Process deliveries through background queue worker
    const processResult = await processEventDeliveries(params.eventId, {
      subject,
      body,
    });

    return NextResponse.json({
      message: `Dispatched ${queuedCount} certificates to delivery queue.`,
      queuedCount,
      processResult,
    });
  } catch (error: any) {
    console.error("Send all delivery error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger certificate send" },
      { status: 500 }
    );
  }
}
