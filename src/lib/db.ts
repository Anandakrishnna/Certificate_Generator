import { PrismaClient } from "@prisma/client";

function checkServerlessDatabaseSafety() {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.DENO_REGION
  );

  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

  if (isServerless && (dbUrl.startsWith("file:") || !dbUrl.includes("://"))) {
    const errorMsg =
      "FATAL: Running local SQLite ('file:./dev.db') on a serverless platform (Vercel/AWS/Netlify). " +
      "The serverless filesystem is ephemeral and read-only across lambdas, causing credentials and data to vanish between requests. " +
      "Please set DATABASE_URL in your production deployment to a hosted PostgreSQL database (Neon, Supabase) or libSQL/Turso.";
    console.error(errorMsg);
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMsg);
    }
  }
}

checkServerlessDatabaseSafety();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
