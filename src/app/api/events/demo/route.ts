import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { generateCertificatePdf } from "@/lib/generator/pdf-generator";
import { generateCertificateSvg } from "@/lib/generator/image-generator";
import { storage } from "@/lib/storage/local-storage";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Create Demo Event
    const event = await prisma.event.create({
      data: {
        authorId: session.userId,
        name: "Demo: Global Web Innovation Summit 2026",
        organizerName: "Association for Computing & Innovation",
        eventDate: new Date("2026-11-20T10:00:00Z"),
        description:
          "Demonstration event with sample attendees, Unicode names, auto-scaling typography, and pre-generated certificates.",
      },
    });

    // 2. Configure default template with classic gold preset
    const placeholders = [
      {
        fieldKey: "{{name}}",
        x: 561,
        y: 420,
        width: 600,
        height: 60,
        fontFamily: "Noto Serif",
        fontSize: 38,
        color: "#0f172a",
        align: "center",
      },
      {
        fieldKey: "{{event_name}}",
        x: 561,
        y: 490,
        width: 700,
        height: 40,
        fontFamily: "Roboto",
        fontSize: 20,
        color: "#334155",
        align: "center",
      },
      {
        fieldKey: "{{organizer}}",
        x: 350,
        y: 650,
        width: 300,
        height: 30,
        fontFamily: "Roboto",
        fontSize: 16,
        color: "#475569",
        align: "center",
      },
      {
        fieldKey: "{{date}}",
        x: 770,
        y: 650,
        width: 250,
        height: 30,
        fontFamily: "Roboto",
        fontSize: 16,
        color: "#475569",
        align: "center",
      },
    ];

    const template = await prisma.template.create({
      data: {
        eventId: event.id,
        backgroundUrl: "/templates/presets/classic_gold.svg",
        placeholders: JSON.stringify(placeholders),
      },
    });

    // 3. Create sample participants with edge cases (Accented, Long name, etc.)
    const sampleAttendees = [
      {
        name: "Dr. Alexander Bartholomew Montgomery-Smith",
        email: "alexander.montgomery@oxford.ac.uk",
        track: "Keynote Speaker (Long Name Auto-Fit Demo)",
      },
      {
        name: "José María García-Márquez",
        email: "jose.garcia@universidad.es",
        track: "Accented Unicode Name Demo",
      },
      {
        name: "Amina Al-Mansoor",
        email: "amina.mansoor@techhub.io",
        track: "Best Poster Presentation",
      },
      {
        name: "Elena Rostova",
        email: "elena.rostova@polytechnique.edu",
        track: "Workshop Lead",
      },
      {
        name: "Marcus Brody",
        email: "m.brody@cambridge.edu",
        track: "Research Fellow",
      },
    ];

    for (const attendee of sampleAttendees) {
      const p = await prisma.participant.create({
        data: {
          eventId: event.id,
          name: attendee.name,
          email: attendee.email,
          extraFields: JSON.stringify({ Track: attendee.track }),
          validationStatus: "valid",
        },
      });

      const certUid = `CERT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const participantData = {
        name: attendee.name,
        event_name: event.name,
        organizer: event.organizerName,
        date: "November 20, 2026",
      };

      // Generate PDF
      const pdfBuffer = await generateCertificatePdf({
        backgroundUrl: template.backgroundUrl,
        placeholders: placeholders as any,
        participantData,
        certificateUid: certUid,
      });

      // Generate SVG
      const svgContent = generateCertificateSvg({
        backgroundUrl: template.backgroundUrl,
        placeholders: placeholders as any,
        participantData,
        certificateUid: certUid,
      });

      const pdfPath = `generated/${event.id}_${p.id}.pdf`;
      const svgPath = `generated/${event.id}_${p.id}.svg`;

      const fileUrlPdf = await storage.saveFile(pdfBuffer, pdfPath);
      const fileUrlPng = await storage.saveFile(
        Buffer.from(svgContent, "utf-8"),
        svgPath
      );

      const cert = await prisma.certificate.create({
        data: {
          participantId: p.id,
          templateId: template.id,
          fileUrlPdf,
          fileUrlPng,
          certificateUid: certUid,
        },
      });

      // Populate delivery queue
      await prisma.emailDelivery.create({
        data: {
          certificateId: cert.id,
          participantId: p.id,
          status: "queued",
          attemptCount: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Demo event created successfully with 5 participants and certificates.",
      eventId: event.id,
    });
  } catch (error: any) {
    console.error("Create demo event error:", error);
    return NextResponse.json(
      { error: "Failed to generate demo event." },
      { status: 500 }
    );
  }
}
