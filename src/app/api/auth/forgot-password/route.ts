import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signPasswordResetToken } from "@/lib/auth";
import { emailService } from "@/lib/email/email-service";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address. Please check your spelling or sign up." },
        { status: 404 }
      );
    }

    const resetToken = signPasswordResetToken({
      userId: user.id,
      email: user.email,
    });

    // Derive base URL from incoming request header or origin
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    let emailSent = false;
    let emailErrorMessage: string | null = null;

    try {
      const emailResult = await emailService.sendEmail({
        to: user.email,
        subject: "Reset your CertifyFlow password",
        text: `Hello ${user.name},\n\nYou requested a password reset for your CertifyFlow account.\n\nPlease click the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\nIf you did not request this, you can safely ignore this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">CertifyFlow</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
            </div>
            <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.5;">We received a request to reset your password for your CertifyFlow account. Click the button below to choose a new password:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 15px;">Reset Password</a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Or copy and paste this link in your browser:</p>
            <p style="color: #64748b; font-size: 12px; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a>
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        `,
      });

      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailErrorMessage = emailResult.errorMessage || "Failed to dispatch email";
      }
    } catch (err: any) {
      console.warn("Could not dispatch password reset email:", err?.message || err);
      emailErrorMessage = err?.message || "Failed to dispatch email";
    }

    return NextResponse.json({
      message: emailSent
        ? "Password reset link sent to your email!"
        : "Password reset link generated successfully.",
      emailSent,
      emailErrorMessage: emailSent ? undefined : emailErrorMessage,
      resetUrl, // Always returned so users are never locked out in dev / offline / SMTP delivery failure
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}

