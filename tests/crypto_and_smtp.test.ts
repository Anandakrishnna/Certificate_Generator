import { encryptSecret, decryptSecret } from "../src/lib/crypto.ts";
import { verifySmtpConnection } from "../src/lib/email/email-service.ts";

async function runHardeningTests() {
  console.log("=== Testing Security, Encryption & SMTP Hardening ===");

  // Test 1: AES-256-GCM Encryption & Decryption
  console.log("1. Testing AES-256-GCM password encryption and decryption...");
  const rawAppPassword = "abcd efgh ijkl mnop";
  const encrypted = encryptSecret(rawAppPassword);

  if (!encrypted || !encrypted.includes(":")) {
    throw new Error("Encrypted secret does not match expected iv:authTag:cipher format");
  }

  if (encrypted === rawAppPassword) {
    throw new Error("Password was stored unencrypted!");
  }

  const decrypted = decryptSecret(encrypted);
  if (decrypted !== rawAppPassword) {
    throw new Error(`Decrypted text '${decrypted}' does not match original '${rawAppPassword}'`);
  }
  console.log("✓ Encryption and decryption verified with AES-256-GCM authenticated cipher.");

  // Test 2: Legacy fallback compatibility
  console.log("2. Testing legacy unencrypted password backward compatibility...");
  const legacyPass = "simplepassword123";
  const decryptedLegacy = decryptSecret(legacyPass);
  if (decryptedLegacy !== legacyPass) {
    throw new Error("Legacy unencrypted password failed backward compatibility check");
  }
  console.log("✓ Backward compatibility verified.");

  // Test 3: verifySmtpConnection with invalid credentials returns clear error
  console.log("3. Testing verifySmtpConnection with invalid credentials...");
  const result = await verifySmtpConnection({
    host: "smtp.gmail.com",
    port: 587,
    user: "invalid_test_organizer@gmail.com",
    pass: "invalidpassword999",
  });

  if (result.success) {
    throw new Error("Invalid credentials should not have succeeded!");
  }

  if (!result.error || result.error.length === 0) {
    throw new Error("Expected raw error string from SMTP server, got empty string");
  }

  console.log(`✓ Pre-flight verification properly captured error: "${result.error.slice(0, 60)}..."`);

  console.log("\n=============================================");
  console.log(" ALL EMAIL HARDENING TESTS PASSED SUCCESSFULLY ");
  console.log("=============================================\n");
}

runHardeningTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
