import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { emailService } from "@/lib/email/email-service";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetEmail } = await req.json();

    const recipient = targetEmail || session.email;
    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json(
        { error: "A valid recipient email address is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const userSmtp =
      user?.smtpUser && user?.smtpPass
        ? {
            host: user.smtpHost || "smtp.gmail.com",
            port: user.smtpPort || 587,
            user: user.smtpUser,
            pass: user.smtpPass,
            from:
              user.smtpFrom ||
              `"${user.name || session.name || "Organizer"}" <${user.smtpUser}>`,
          }
        : undefined;

    const testSubject = "CertifyFlow Live Delivery Verification";
    const fromDisplay =
      userSmtp?.from ||
      `"${user?.name || session.name || "Organizer"}" <${user?.smtpUser || session.email}>`;

    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #4338ca; margin: 0; font-size: 22px;">🎉 Live Email Delivery Successful!</h2>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${recipient.split("@")[0]}</strong>,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          This message confirms that your personal outgoing Gmail connection is <strong>active and working</strong>. 
          When you dispatch event certificates to participants, they will be delivered directly from your address.
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #0f172a; line-height: 1.6;">
            <strong>Sender:</strong> ${fromDisplay}<br/>
            <strong>Recipient:</strong> ${recipient}<br/>
            <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Status:</strong> Authenticated via Google App Password
          </p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          CertifyFlow Automated Credential Delivery Engine &bull; Sent from organizer mailbox
        </p>
      </div>
    `;

    const result = await emailService.sendEmail({
      to: recipient,
      from: fromDisplay,
      replyTo: user?.email || session.email,
      subject: testSubject,
      html: testHtml,
      text: "This is a test message confirming live email delivery from your organizer email address.",
      smtpConfig: userSmtp,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            result.errorMessage ||
            "Failed to dispatch test email. Please verify your 16-character Google App Password.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email dispatched successfully from ${user?.smtpUser || session.email} to ${recipient}! Check your inbox.`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test email" },
      { status: 500 }
    );
  }
}
