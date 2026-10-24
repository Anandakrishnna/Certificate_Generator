# CertifyFlow — Email Delivery Bug Fix Prompt

Fix email delivery bugs in CertifyFlow (Next.js + Prisma + Nodemailer).

## Context
Repo files involved:
- `src/lib/email/email-service.ts`
- `src/lib/queue/delivery-worker.ts`
- `src/app/api/email/settings/route.ts`
- `src/app/api/events/[eventId]/delivery/send-all/route.ts`
- `prisma/schema.prisma` (SQLite, `User` model has `smtpUser`/`smtpPass`/`smtpHost`/`smtpPort`/`smtpFrom`)

## Bug 1 — Silent mock fallback (critical)
In `email-service.ts`, `createEmailService()` falls back to `MockEmailProvider` whenever
`RESEND_API_KEY` and `SMTP_USER`/`SMTP_PASS` env vars are both unset. `MockEmailProvider`
fakes success and marks DB status `"sent"` without sending real mail.

**Fix:** throw a clear error instead of silently mocking in production
(`NODE_ENV === "production"`), OR surface a loud warning banner in the delivery UI whenever
`/api/email/settings` returns `isConfigured: false`, blocking "Send All" until real
SMTP/Resend is configured. Never let a real send silently become a mock send for an organizer
who believes they configured SMTP.

## Bug 2 — SQLite persistence on serverless
`datasource` uses `file:./dev.db` (local SQLite file). If deployed on serverless (Vercel
etc), filesystem is ephemeral/read-only per invocation, so SMTP credentials saved via
`/api/email/settings` POST can vanish between requests, silently reverting to mock.

**Fix:** migrate datasource to a persistent DB (Postgres via Prisma, or libSQL/Turso),
update `DATABASE_URL` in `.env.example` and README accordingly, and add a startup/runtime
check that errors loudly if running on a known-serverless platform with a `file:` SQLite
url.

## Bug 3 — Swallowed SMTP auth errors
When real SMTP creds ARE set but wrong (bad Google App Password, 2FA not enabled),
nodemailer throws, and `SmtpEmailProvider.sendEmail` catches it, returning `errorMessage`
on the `EmailDelivery` row — but the delivery list UI doesn't surface `errorMessage`
prominently per recipient.

**Fix:** show `errorMessage` inline next to each "failed" row in the delivery console, and
make `/api/email/test` return the raw nodemailer error string unmodified so organizers can
diagnose (e.g. "Invalid login", "Username and Password not accepted").

## Additional hardening
- In `/api/email/settings` POST, after saving `smtpUser`/`smtpPass`, immediately attempt a
  real test send (reuse `/api/email/test` logic) and roll back / return error if it fails,
  instead of trusting unverified credentials.
- Add a visible "Provider: mock / gmail_smtp / resend" indicator on the delivery page
  (GET `/api/email/settings` already returns `provider` — just render it) so organizers can
  never be unaware mail is going to mock.
- Encrypt `smtpPass` at rest in the `User` table instead of storing the Google App Password
  plaintext.

## Deliverable
Implement all fixes, update affected files, and add a short note in README's SMTP setup
section warning that without configured SMTP, certificates "send" silently via mock and
never reach participants.