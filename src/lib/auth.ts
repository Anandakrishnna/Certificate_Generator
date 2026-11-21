import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "certify-flow-super-secret-key-123456";
const AUTH_COOKIE_NAME = "certify_auth_token";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface ResetTokenPayload {
  userId: string;
  email: string;
  purpose: "password_reset";
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function signPasswordResetToken(payload: { userId: string; email: string }): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, purpose: "password_reset" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export function verifyPasswordResetToken(token: string): ResetTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.purpose === "password_reset") {
      return decoded as ResetTokenPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getSessionUser(): Promise<TokenPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { AUTH_COOKIE_NAME };
