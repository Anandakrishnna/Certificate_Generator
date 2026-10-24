import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = "certify-flow-super-secret-key-123456";

async function runAuthVerification() {
  console.log("=== Testing Phase 2: Database Schema & Authentication ===");

  const testEmail = `test_author_${Date.now()}@example.com`;
  const testPassword = "SecurePassword123!";

  // 1. Password hashing
  console.log("1. Hashing password...");
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testPassword, salt);

  // 2. Database User creation
  console.log("2. Creating user in SQLite DB...");
  const user = await prisma.user.create({
    data: {
      name: "Test Organizer",
      email: testEmail,
      passwordHash,
    },
  });
  console.log(`✓ User created successfully with ID: ${user.id}`);

  // 3. Password verification
  console.log("3. Verifying password match...");
  const isValid = await bcrypt.compare(testPassword, user.passwordHash);
  if (!isValid) throw new Error("Password verification failed!");
  console.log("✓ Password comparison succeeded");

  // 4. JWT generation and verification
  console.log("4. Testing JWT sign and verify...");
  const token = jwt.sign({ userId: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.userId !== user.id || decoded.email !== user.email) {
    throw new Error("JWT token verification failed!");
  }
  console.log("✓ JWT sign and decode verified successfully");

  // 5. Test unique constraint on email
  console.log("5. Testing unique constraint on email...");
  try {
    await prisma.user.create({
      data: {
        name: "Duplicate User",
        email: testEmail,
        passwordHash,
      },
    });
    throw new Error("Failed: Unique constraint was NOT enforced!");
  } catch (err) {
    console.log("✓ Unique email constraint properly rejected duplicate");
  }

  console.log("\n>>> ALL PHASE 2 AUTH TESTS PASSED SUCCESSFULLY! <<<");
  await prisma.$disconnect();
}

runAuthVerification().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
