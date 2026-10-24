import { prisma } from "@/lib/db";
import { emailService } from "@/lib/email/email-service";
import { interpolateEmail, formatHtmlEmail, DEFAULT_EMAIL_TEMPLATE } from "@/lib/email/templates";
import { storage } from "@/lib/storage/local-storage";

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

  const variables: Record<string, string> = {
    name: participant.name,
    email: participant.email,
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

  const subject = interpolateEmail(subjectTemplate, variables);
  const plainBody = interpolateEmail(bodyTemplate, variables);
  const htmlBody = formatHtmlEmail(plainBody);

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

  const authorSmtp =
    author?.smtpUser && author?.smtpPass
      ? {
          host: author.smtpHost || "smtp.gmail.com",
          port: author.smtpPort || 587,
          user: author.smtpUser,
          pass: author.smtpPass,
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
    to: participant.email,
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
