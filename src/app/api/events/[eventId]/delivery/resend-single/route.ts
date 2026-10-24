import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { processSingleDelivery } from "@/lib/queue/delivery-worker";

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deliveryId, subject, body } = await req.json();

    if (!deliveryId) {
      return NextResponse.json(
        { error: "deliveryId is required" },
        { status: 400 }
      );
    }

    const result = await processSingleDelivery(deliveryId, {
      subject,
      body,
    });

    return NextResponse.json({
      message: result.success ? "Email resent successfully" : "Resend attempt failed",
      result,
    });
  } catch (error: any) {
    console.error("Resend single error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend email" },
      { status: 500 }
    );
  }
}
