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

    const { subject, body } = await req.json();

    // Mark failed deliveries as retrying
    await prisma.emailDelivery.updateMany({
      where: {
        participant: { eventId: params.eventId },
        status: { in: ["failed", "retrying"] },
      },
      data: {
        status: "retrying",
      },
    });

    const processResult = await processEventDeliveries(params.eventId, {
      subject,
      body,
    });

    return NextResponse.json({
      message: "Retry batch initiated for failed deliveries",
      processResult,
    });
  } catch (error: any) {
    console.error("Retry failed error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retry deliveries" },
      { status: 500 }
    );
  }
}
