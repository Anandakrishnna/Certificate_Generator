import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPasswordResetToken, hashPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Reset token and new password are required." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const payload = verifyPasswordResetToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new link." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account could not be found." },
        { status: 404 }
      );
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    const sessionToken = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      message: "Password reset successfully! You are now logged in.",
      user: { id: user.id, name: user.name, email: user.email },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}

