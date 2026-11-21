const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  "";

const isPostgres =
  dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const sqliteSchemaPath = path.join(__dirname, "..", "prisma", "schema.sqlite.prisma");
const postgresSchemaPath = path.join(__dirname, "..", "prisma", "schema.postgres.prisma");

try {
  if (isPostgres) {
    console.log("⚡ Database: PostgreSQL detected (Hosted/Serverless)");
    if (fs.existsSync(postgresSchemaPath)) {
      fs.copyFileSync(postgresSchemaPath, schemaPath);
    }
    execSync("npx prisma generate", { stdio: "inherit" });
    if (process.env.VERCEL || process.env.CI) {
      execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    }
  } else {
    console.log("⚡ Database: SQLite detected (Local dev.db)");
    if (fs.existsSync(sqliteSchemaPath)) {
      fs.copyFileSync(sqliteSchemaPath, schemaPath);
    }
    execSync("npx prisma generate", { stdio: "inherit" });
  }
} catch (error) {
  console.error("Database setup error:", error);
  process.exit(1);
}
