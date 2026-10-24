import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { certificateUid: string } }
) {
  try {
    const { certificateUid } = params;

    if (!certificateUid) {
      return NextResponse.json(
        { verified: false, error: "Certificate UID is required" },
        { status: 400 }
      );
    }

    const certificate = await prisma.certificate.findUnique({
      where: { certificateUid: certificateUid.trim().toUpperCase() },
      include: {
        participant: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        {
          verified: false,
          error: "Certificate not found or invalid verification UID.",
          certificateUid,
        },
        { status: 404 }
      );
    }

    let extraFields = {};
    try {
      extraFields = JSON.parse(certificate.participant.extraFields || "{}");
    } catch {
      extraFields = {};
    }

    return NextResponse.json({
      verified: true,
      certificate: {
        certificateUid: certificate.certificateUid,
        recipientName: certificate.participant.name,
        recipientEmail: certificate.participant.email,
        eventName: certificate.participant.event.name,
        organizerName: certificate.participant.event.organizerName,
        eventDate: certificate.participant.event.eventDate,
        generatedAt: certificate.generatedAt,
        fileUrlPdf: certificate.fileUrlPdf,
        fileUrlPng: certificate.fileUrlPng,
        extraFields,
      },
    });
  } catch (error: any) {
    console.error("Public certificate verification error:", error);
    return NextResponse.json(
      { verified: false, error: "Internal server error verifying certificate." },
      { status: 500 }
    );
  }
}
