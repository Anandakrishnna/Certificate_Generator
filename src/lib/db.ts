import { PrismaClient } from "@prisma/client";

const resolvedDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  "";

function checkServerlessDatabaseSafety() {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.DENO_REGION
  );

  // During static page generation / build analysis, avoid throwing fatal errors
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.VERCEL_ENV === undefined;

  if (isServerless && (!resolvedDbUrl || resolvedDbUrl.startsWith("file:"))) {
    const errorMsg =
      "WARN: Running on serverless without hosted PostgreSQL DATABASE_URL. " +
      "Ensure DATABASE_URL or POSTGRES_PRISMA_URL is set in your Vercel project environment variables.";
    console.warn(errorMsg);
    // Only throw in runtime, never during build/collect page data
    if (process.env.NODE_ENV === "production" && !isBuildPhase) {
      throw new Error(errorMsg);
    }
  }
}

checkServerlessDatabaseSafety();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: resolvedDbUrl
      ? {
          db: {
            url: resolvedDbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

