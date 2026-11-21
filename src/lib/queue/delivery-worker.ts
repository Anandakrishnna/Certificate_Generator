import { prisma } from "@/lib/db";
import { emailService } from "@/lib/email/email-service";
import { interpolateEmail, formatHtmlEmail, DEFAULT_EMAIL_TEMPLATE } from "@/lib/email/templates";
import { storage } from "@/lib/storage/local-storage";
import { decryptSecret } from "@/lib/crypto";

export async function processSingleDelivery(
  deliveryId: string,
  templateConfig?: { subject: string; body: string }
) {
  const delivery = await prisma.emailDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      certificate: true,
      participant: {
        include: {
          event: {
            include: { author: true },
          },
        },
      },
    },
  });

  if (!delivery || !delivery.certificate) {
    throw new Error("Delivery record or certificate not found");
  }

  const { participant, certificate } = delivery;
  const event = participant.event;
  const author = event.author;
  const extraFields = JSON.parse(participant.extraFields || "{}");

  const isDeliveredToLeader = Boolean(
    extraFields.deliveredToLeader ||
    (extraFields.isLeader === false && extraFields.leaderEmail && (!extraFields.memberEmail || participant.email === extraFields.leaderEmail))
  );

  const recipientEmail =
    extraFields.recipientEmail ||
    participant.email ||
    extraFields.leaderEmail;

  const variables: Record<string, string> = {
    name: participant.name,
    email: recipientEmail,
    participant_name: participant.name,
    team_name: extraFields.teamName || "Team",
    leader_name: extraFields.leaderName || "Team Leader",
    leader_email: extraFields.leaderEmail || "",
    event_name: event.name,
    organizer: event.organizerName || author?.name || "Organizer",
    date: new Date(event.eventDate).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    certificate_uid: certificate.certificateUid,
    download_url: certificate.fileUrlPdf,
    ...extraFields,
  };

  const subjectTemplate = templateConfig?.subject || DEFAULT_EMAIL_TEMPLATE.subject;
  const bodyTemplate = templateConfig?.body || DEFAULT_EMAIL_TEMPLATE.body;

  let subject = interpolateEmail(subjectTemplate, variables);
  let plainBody = interpolateEmail(bodyTemplate, variables);
  let htmlBody = formatHtmlEmail(plainBody);

  if (isDeliveredToLeader && extraFields.leaderEmail) {
    subject = `[Team: ${extraFields.teamName || "Certificate"}] ${participant.name} - ${subject}`;
    const leaderNoticePlain = `[TEAM CERTIFICATE NOTICE]\nHello ${extraFields.leaderName || "Team Leader"},\nThis certificate has been issued to your team member: ${participant.name} (${extraFields.teamName || "Team"}). Because their email was not provided, this certificate has been delivered to you. Please forward or present this certificate to them.\n\n----------------------------------------\n\n`;
    plainBody = leaderNoticePlain + plainBody;

    const leaderNoticeHtml = `
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 6px 0; font-weight: 700; color: #065f46; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">👑 Team Member Certificate Notice</p>
        <p style="margin: 0; color: #047857; font-size: 13px; line-height: 1.5;">
          Hello <strong>${extraFields.leaderName || "Team Leader"}</strong>, this certificate was awarded to your team member <strong>${participant.name}</strong> (${extraFields.teamName || "Team"}). Because their email was not provided, it has been delivered directly to you.
        </p>
      </div>
    `;
    htmlBody = leaderNoticeHtml + htmlBody;
  }

  // Load PDF attachment buffer
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await storage.getFile(certificate.fileUrlPdf);
  } catch (err) {
    console.warn("Could not read certificate PDF file for email attachment:", err);
  }

  // Update status to sending
  await prisma.emailDelivery.update({
    where: { id: delivery.id },
    data: {
      status: "sending",
      lastAttemptedAt: new Date(),
    },
  });

  const attachments = pdfBuffer
    ? [
        {
          filename: `${participant.name.replace(/\s+/g, "_")}_Certificate.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    : [];

  const decryptedPass = author?.smtpPass ? decryptSecret(author.smtpPass) : "";
  const authorSmtp =
    author?.smtpUser && decryptedPass
      ? {
          host: author.smtpHost || "smtp.gmail.com",
          port: author.smtpPort || 587,
          user: author.smtpUser,
          pass: decryptedPass,
          from: author.smtpFrom || `"${event.organizerName || author.name}" <${author.smtpUser}>`,
        }
      : undefined;

  const fromAddress =
    authorSmtp?.from ||
    (author?.smtpUser
      ? `"${event.organizerName || author.name}" <${author.smtpUser}>`
      : author?.email
      ? `"${event.organizerName || author.name}" <${author.email}>`
      : undefined);

  const result = await emailService.sendEmail({
    to: recipientEmail,
    from: fromAddress,
    replyTo: author?.email || author?.smtpUser || undefined,
    subject,
    html: htmlBody,
    text: plainBody,
    attachments,
    smtpConfig: authorSmtp,
  });

  if (result.success) {
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        errorMessage: null,
        attemptCount: delivery.attemptCount + 1,
      },
    });
    return { success: true };
  } else {
    const nextAttemptCount = delivery.attemptCount + 1;
    const finalStatus = nextAttemptCount >= 3 ? "failed" : "retrying";

    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: finalStatus,
        errorMessage: result.errorMessage || "Email send failed",
        attemptCount: nextAttemptCount,
      },
    });

    return {
      success: false,
      status: finalStatus,
      error: result.errorMessage,
    };
  }
}

export async function processEventDeliveries(
  eventId: string,
  templateConfig?: { subject: string; body: string }
) {
  // Find all queued or retrying deliveries for this event
  const deliveries = await prisma.emailDelivery.findMany({
    where: {
      participant: { eventId },
      status: { in: ["queued", "retrying"] },
    },
    take: 100,
  });

  const results = [];
  for (const del of deliveries) {
    try {
      const res = await processSingleDelivery(del.id, templateConfig);
      results.push(res);
    } catch (err: any) {
      results.push({ success: false, error: err.message });
    }
  }

  return {
    processedCount: deliveries.length,
    results,
  };
}
