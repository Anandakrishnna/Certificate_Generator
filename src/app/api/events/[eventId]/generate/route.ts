import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { generateCertificatePdf } from "@/lib/generator/pdf-generator";
import { generateCertificateSvg } from "@/lib/generator/image-generator";
import { storage } from "@/lib/storage/local-storage";

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
        _count: {
          select: { participants: true },
        },
        participants: {
          include: {
            certificates: {
              take: 1,
              orderBy: { generatedAt: "desc" },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const certificatesList = [];
    for (const p of event.participants) {
      if (p.certificates.length > 0) {
        certificatesList.push({
          id: p.certificates[0].id,
          participantId: p.id,
          participantName: p.name,
          participantEmail: p.email,
          certificateUid: p.certificates[0].certificateUid,
          fileUrlPdf: p.certificates[0].fileUrlPdf,
          fileUrlPng: p.certificates[0].fileUrlPng,
          generatedAt: p.certificates[0].generatedAt,
        });
      }
    }

    return NextResponse.json({
      totalParticipants: event._count.participants,
      generatedCount: certificatesList.length,
      certificates: certificatesList,
    });
  } catch (error: any) {
    console.error("Fetch generation status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generation status" },
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
      include: {
        templates: { take: 1, orderBy: { createdAt: "desc" } },
        participants: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.templates.length === 0) {
      return NextResponse.json(
        { error: "No certificate template configured. Please complete Step 2." },
        { status: 400 }
      );
    }

    if (event.participants.length === 0) {
      return NextResponse.json(
        { error: "No participants uploaded. Please complete Step 1." },
        { status: 400 }
      );
    }

    const template = event.templates[0];
    const placeholders = JSON.parse(template.placeholders || "[]");

    let generatedCount = 0;
    const generatedCertificates = [];

    // Process participants in batches of 25 to prevent memory spikes
    const batchSize = 25;
    for (let i = 0; i < event.participants.length; i += batchSize) {
      const batch = event.participants.slice(i, i + batchSize);

      for (const participant of batch) {
        const extraFields = JSON.parse(participant.extraFields || "{}");
        const participantData: Record<string, string> = {
          name: participant.name,
          email: participant.email,
          event_name: event.name,
          organizer: event.organizerName,
          date: new Date(event.eventDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          ...extraFields,
        };

        // Unique verification UID
        const certificateUid = `CERT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        // 1. Generate PDF
        const pdfBuffer = await generateCertificatePdf({
          backgroundUrl: template.backgroundUrl,
          placeholders,
          participantData,
          certificateUid,
        });

        // 2. Generate SVG / Image
        const svgContent = generateCertificateSvg({
          backgroundUrl: template.backgroundUrl,
          placeholders,
          participantData,
          certificateUid,
        });

        // 3. Save files to storage
        const pdfPath = `generated/${event.id}_${participant.id}.pdf`;
        const svgPath = `generated/${event.id}_${participant.id}.svg`;

        const fileUrlPdf = await storage.saveFile(pdfBuffer, pdfPath);
        const fileUrlPng = await storage.saveFile(
          Buffer.from(svgContent, "utf-8"),
          svgPath
        );

        // 4. Upsert Certificate in database
        const existingCert = await prisma.certificate.findFirst({
          where: { participantId: participant.id },
        });

        let certRecord;
        if (existingCert) {
          certRecord = await prisma.certificate.update({
            where: { id: existingCert.id },
            data: {
              templateId: template.id,
              fileUrlPdf,
              fileUrlPng,
              certificateUid,
              generatedAt: new Date(),
            },
          });
        } else {
          certRecord = await prisma.certificate.create({
            data: {
              participantId: participant.id,
              templateId: template.id,
              fileUrlPdf,
              fileUrlPng,
              certificateUid,
            },
          });
        }

        generatedCount++;
        generatedCertificates.push({
          id: certRecord.id,
          participantName: participant.name,
          participantEmail: participant.email,
          certificateUid,
          fileUrlPdf,
          fileUrlPng,
        });
      }
    }

    return NextResponse.json({
      message: `Successfully generated ${generatedCount} certificates.`,
      generatedCount,
      certificates: generatedCertificates,
    });
  } catch (error: any) {
    console.error("Bulk generation error:", error);
    return NextResponse.json(
      { error: error.message || "Bulk certificate generation failed" },
      { status: 500 }
    );
  }
}
