import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { CERTIFICATE_FONTS } from "@/types/template";

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
        participants: { take: 5, orderBy: { createdAt: "asc" } },
      },
    });

    if (!event || event.templates.length === 0) {
      return NextResponse.json(
        { error: "Event or certificate template not found." },
        { status: 404 }
      );
    }

    const { mapping } = await req.json();
    const template = event.templates[0];
    const placeholders = JSON.parse(template.placeholders || "[]");

    // Generate previews for each participant
    const previews = event.participants.map((p) => {
      const extraFields = JSON.parse(p.extraFields || "{}");
      const participantData: Record<string, any> = {
        name: p.name,
        email: p.email,
        ...extraFields,
      };

      // Interpolate each placeholder
      const renderedFields = placeholders.map((ph: any) => {
        let value = "";
        const m = mapping ? mapping[ph.id] : null;

        if (m) {
          if (m.sourceType === "static") {
            value = m.staticValue || "";
          } else if (m.sourceType === "column" && m.column) {
            value = participantData[m.column] !== undefined ? String(participantData[m.column]) : "";
          }
        } else {
          // Fallback to direct fieldKey lookup
          if (ph.fieldKey === "name") value = p.name;
          else if (ph.fieldKey === "event_name") value = event.name;
          else if (ph.fieldKey === "organizer") value = event.organizerName;
          else if (ph.fieldKey === "date") {
            value = new Date(event.eventDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          } else if (participantData[ph.fieldKey] !== undefined) {
            value = String(participantData[ph.fieldKey]);
          }
        }

        const matchedFont = CERTIFICATE_FONTS.find((f) => f.id === ph.fontFamily);
        const fontFamily = matchedFont ? matchedFont.family : ph.fontFamily || "sans-serif";

        let textAnchor = "middle";
        let xPos = ph.x + ph.width / 2;
        if (ph.align === "left") {
          textAnchor = "start";
          xPos = ph.x;
        } else if (ph.align === "right") {
          textAnchor = "end";
          xPos = ph.x + ph.width;
        }

        // SVG text baseline adjustment
        const yPos = ph.y + ph.fontSize * 0.9;

        return {
          id: ph.id,
          fieldKey: ph.fieldKey,
          value,
          x: xPos,
          y: yPos,
          fontFamily,
          fontSize: ph.fontSize,
          color: ph.color,
          textAnchor,
          isBold: ph.isBold,
          isItalic: ph.isItalic,
        };
      });

      return {
        participantId: p.id,
        name: p.name,
        email: p.email,
        backgroundUrl: template.backgroundUrl,
        fields: renderedFields,
      };
    });

    return NextResponse.json({ previews });
  } catch (error: any) {
    console.error("Generate preview error:", error);
    return NextResponse.json(
      { error: "Failed to generate sample previews" },
      { status: 500 }
    );
  }
}
