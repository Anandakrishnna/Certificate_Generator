import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifySmtpConnection } from "@/lib/email/email-service";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const decryptedPass = user?.smtpPass ? decryptSecret(user.smtpPass) : "";
    const isUserConfigured = Boolean(user?.smtpUser && decryptedPass);
    const isSystemConfigured = Boolean(
      (process.env.SMTP_USER && process.env.SMTP_PASS) ||
      process.env.RESEND_API_KEY
    );

    const isConfigured = isUserConfigured || isSystemConfigured;
    const provider = isUserConfigured
      ? "gmail_smtp"
      : process.env.RESEND_API_KEY
      ? "resend"
      : process.env.SMTP_USER
      ? "gmail_smtp"
      : "mock";

    const effectiveEmail = user?.smtpUser || session.email || "";

    return NextResponse.json({
      isConfigured,
      provider,
      smtpUser: effectiveEmail,
      smtpHost: user?.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com",
      smtpPort: String(user?.smtpPort || process.env.SMTP_PORT || "587"),
      smtpFrom:
        user?.smtpFrom ||
        `"${user?.name || session.name || "Organizer"}" <${effectiveEmail}>`,
      organizerEmail: session.email,
      organizerName: user?.name || session.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to read email settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { smtpUser, smtpPass, smtpFrom, smtpHost, smtpPort } =
      await req.json();

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: "Email address and Google App Password are required." },
        { status: 400 }
      );
    }

    const host = smtpHost || "smtp.gmail.com";
    const port = Number(smtpPort) || 587;
    const cleanUser = smtpUser.trim();
    const cleanPass = smtpPass.trim().replace(/\s+/g, ""); // Strip spaces in 16-character App Passwords
    const from = smtpFrom || `"${session.name || "Organizer"}" <${cleanUser}>`;

    // 1. Pre-flight verification: test credentials before saving!
    const verifyResult = await verifySmtpConnection({
      host,
      port,
      user: cleanUser,
      pass: cleanPass,
    });

    if (!verifyResult.success) {
      return NextResponse.json(
        {
          error:
            verifyResult.error ||
            "Failed to authenticate with SMTP server. Please verify your email and 16-character Google App Password.",
        },
        { status: 400 }
      );
    }

    // 2. Encrypt password at rest using AES-256-GCM
    const encryptedPassword = encryptSecret(cleanPass);

    // 3. Persist encrypted credentials to SQLite/database
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        smtpHost: host,
        smtpPort: port,
        smtpUser: cleanUser,
        smtpPass: encryptedPassword,
        smtpFrom: from,
      },
    });

    // 4. Update process.env as fallback
    process.env.SMTP_HOST = host;
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_USER = cleanUser;
    process.env.SMTP_PASS = cleanPass;
    process.env.SMTP_FROM = from;

    return NextResponse.json({
      success: true,
      message: `Verified and activated Gmail SMTP for ${cleanUser}! Certificates will be dispatched from your address.`,
      isConfigured: true,
      provider: "gmail_smtp",
      smtpUser: cleanUser,
    });
  } catch (error: any) {
    console.error("Save settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save email settings" },
      { status: 500 }
    );
  }
}
