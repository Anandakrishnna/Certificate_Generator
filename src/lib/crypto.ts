import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "certifyflow_default_secure_key_fallback_2026";
  // Derive a consistent 32-byte key using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt sensitive text (such as SMTP / App Passwords) using AES-256-GCM.
 * Format: "iv:authTag:ciphertext" (all hex encoded)
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt sensitive text encrypted with encryptSecret.
 * Gracefully handles unencrypted legacy text if found.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) return "";
  // Check if it's formatted as iv:authTag:encrypted
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    // Legacy plaintext password stored before encryption
    return cipherText;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  if (!ivHex || !authTagHex || !encryptedHex) {
    return cipherText;
  }

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Failed to decrypt secret, returning original string", err);
    return cipherText;
  }
}
