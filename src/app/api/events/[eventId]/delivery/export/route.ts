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

    const headers = [
      "Participant_Name",
      "Email_Address",
      "Certificate_UID",
      "Delivery_Status",
      "Attempt_Count",
      "Sent_At",
      "Last_Attempted_At",
      "Error_Message",
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(",")];

    for (const p of event.participants) {
      const cert = p.certificates[0] || null;
      const delivery = p.emailDeliveries[0] || null;

      const row = [
        escapeCsv(p.name),
        escapeCsv(p.email),
        escapeCsv(cert?.certificateUid || "N/A"),
        escapeCsv(delivery?.status || "not_queued"),
        delivery?.attemptCount || 0,
        escapeCsv(delivery?.sentAt ? delivery.sentAt.toISOString() : ""),
        escapeCsv(
          delivery?.lastAttemptedAt ? delivery.lastAttemptedAt.toISOString() : ""
        ),
        escapeCsv(delivery?.errorMessage || ""),
      ];

      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\r\n");
    const sanitizedEventName = event.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `delivery_report_${sanitizedEventName}_${event.id.slice(0, 8)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Export delivery report error:", error);
    return NextResponse.json(
      { error: "Failed to export delivery report" },
      { status: 500 }
    );
  }
}
