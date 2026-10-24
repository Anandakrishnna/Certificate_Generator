# PRD: Certificate Generation & Distribution Platform

## 1. Overview

A web application that lets event organizers (Authors) bulk-generate personalized certificates for participants and automatically email each certificate to its recipient. Authors upload a participant list (CSV/XLSX), design or upload a certificate template, map data fields onto the template, and the system generates and emails one personalized certificate per participant.

Target users: college clubs, IEEE/tech student chapters, hackathon organizers, workshop/webinar hosts.

## 2. Problem Statement

Event organizers currently create certificates manually in tools like Canva/PowerPoint, individually editing names and manually emailing each file — slow, error-prone, and does not scale past a handful of participants. There is no lightweight, purpose-built tool for small/student organizations to automate this end-to-end (design → generate → deliver → track).

## 3. Goals / Non-Goals

### Goals
- Allow an Author to go from spreadsheet + template to fully delivered certificates in under 10 minutes for events with up to 500 participants.
- Validate participant data (names, emails) before generation to prevent bad sends.
- Support a simple in-browser template design/placeholder-mapping flow — no design software required.
- Export certificates as PDF and PNG.
- Automatically email certificates with per-recipient delivery status and retry on failure.

### Non-Goals (v1)
- No multi-template A/B testing.
- No real-time collaborative template editing (multiple authors editing same template simultaneously).
- No built-in payment/ticketing integration.
- No certificate verification/blockchain authentication layer (flag for Future Scope).
- No SMS delivery — email only in v1.

## 4. User Roles

### 4.1 Author / Admin
- Creates and manages events.
- Uploads participant spreadsheets.
- Designs/uploads certificate templates.
- Maps data to template placeholders.
- Triggers generation and sending.
- Views delivery status/analytics.

### 4.2 Participant
- Receives certificate via email.
- No login required (certificate is delivered as an attachment and/or hosted link).
- Optionally can access a public verification page via a unique certificate ID/link.

## 5. Core Features

1. **Authentication** — Author signup/login (email + password, optionally Google OAuth).
2. **Event Management** — create/edit/delete event (name, date, description, organizer/club name).
3. **Spreadsheet Upload & Validation**
   - Accept CSV/XLSX.
   - Require `name` and `email` columns (case-insensitive header matching, allow common aliases: `full_name`, `participant_name`, `email_address`, `mail`).
   - Validate: non-empty names, RFC-compliant email format, duplicate email detection, duplicate name+email row detection.
   - Display validation report: valid rows, flagged rows (with reason), allow inline fix or row exclusion before proceeding.
4. **Template Design / Upload**
   - Upload existing template image (PNG/JPG/PDF) as background, OR
   - Use built-in minimal template presets (Author picks one, customizes colors/text).
   - Drag-and-drop placeholder fields onto canvas: `{{name}}`, `{{event_name}}`, `{{date}}`, `{{organizer}}`, optional custom fields pulled from extra spreadsheet columns.
   - Each placeholder: configurable font, size, color, alignment, bounding box (x, y, width, height) — draggable with numeric coordinate fallback for precision.
   - Live preview with sample data from first spreadsheet row.
5. **Mapping Review** — Author confirms which spreadsheet column maps to which placeholder (auto-suggested by column name matching, Author can override).
6. **Bulk Generation**
   - Server-side render one certificate per valid participant row (PDF primary, PNG secondary).
   - Progress indicator (X of N generated).
   - Store generated files linked to participant + event.
7. **Preview & Approval**
   - Author reviews a sample set (e.g., first 5, random 5, or all) before sending.
   - Option to regenerate after template edits without re-uploading spreadsheet.
8. **Email Delivery**
   - Send personalized email per participant with certificate attached (PDF) and/or a download link.
   - Customizable email subject/body template with placeholders.
   - Real-time per-recipient status: Queued → Sending → Sent → Failed → Retrying.
   - Automatic retry (configurable, default 3 attempts, exponential backoff) on transient failures (SMTP timeout, rate limit).
   - Manual "resend" action per failed recipient.
   - Delivery summary: sent count, failed count, pending count.
9. **Dashboard/Analytics** — per-event view of generation + delivery status, downloadable delivery report (CSV).

## 6. User Flow (Step by Step)

1. Author signs up/logs in.
2. Author creates new event (name, date, organizer).
3. Author uploads spreadsheet → system validates → shows validation report → Author fixes/excludes bad rows → confirms valid participant list.
4. Author designs certificate: uploads background OR picks preset → drags placeholder fields onto canvas → sets font/size/color per field.
5. System auto-suggests spreadsheet-column-to-placeholder mapping → Author confirms/edits.
6. Author clicks "Generate Preview" → system renders sample certificates → Author reviews.
7. Author clicks "Generate All" → system bulk-renders all certificates → progress bar shown.
8. Author reviews generated certificates (spot check), optionally regenerates.
9. Author customizes email subject/body → clicks "Send All".
10. System queues and sends emails → live per-recipient status updates.
11. Failed sends auto-retry; Author can manually resend remaining failures.
12. Author downloads final delivery report (CSV: name, email, status, timestamp).

## 7. Data Model

```
User (Author)
  - id, name, email, password_hash, created_at

Event
  - id, author_id (FK), name, description, event_date, organizer_name, created_at

Participant
  - id, event_id (FK), name, email, extra_fields (JSON), validation_status, created_at

Template
  - id, event_id (FK), background_url, placeholders (JSON array), created_at
  Placeholder object: { field_key, x, y, width, height, font, font_size, color, align }

Certificate
  - id, participant_id (FK), template_id (FK), file_url_pdf, file_url_png,
    certificate_uid (public verification id), generated_at

EmailDelivery
  - id, certificate_id (FK), participant_id (FK), status (queued|sending|sent|failed|retrying),
    attempt_count, last_attempted_at, error_message, sent_at
```

## 8. Tech Stack Recommendation

- **Frontend:** React (Next.js), Tailwind CSS, canvas editor via Fabric.js or Konva.js for drag-and-drop placeholder design.
- **Backend:** Node.js (Express/NestJS) or Python (FastAPI/Django) — either is viable; FastAPI recommended if certificate rendering uses Python image libraries.
- **Database:** PostgreSQL (relational data: events, participants, deliveries).
- **File Storage:** S3-compatible object storage (AWS S3 / Supabase Storage / Cloudflare R2) for templates and generated certificates.
- **Certificate Rendering:** 
  - Python: Pillow / ReportLab for PDF+PNG generation from template + coordinates.
  - Node alternative: `pdf-lib` + `sharp`/`canvas`.
- **Spreadsheet Parsing:** `pandas`/`openpyxl` (Python) or `xlsx`/`papaparse` (Node).
- **Email Delivery:** Transactional email provider — SendGrid, AWS SES, or Resend (recommended for deliverability + webhook-based status tracking).
- **Background Jobs/Queue:** Redis + BullMQ (Node) or Celery + Redis (Python) for async bulk generation and email sending.
- **Auth:** JWT-based session auth, optional Google OAuth via NextAuth/Auth.js.

## 9. Email Delivery Flow

1. On "Send All," create one `EmailDelivery` row per participant, status = `queued`.
2. Background worker pulls queued jobs, sends via email provider API.
3. On provider success response → status = `sent`, timestamp recorded.
4. On provider failure (bounce, rate limit, timeout) → status = `failed`, error_message recorded, increment `attempt_count`.
5. Retry worker re-attempts `failed` rows with `attempt_count < max_retries` using exponential backoff (e.g., 1 min, 5 min, 15 min).
6. After `max_retries` exhausted → status stays `failed`, surfaced to Author for manual resend.
7. Webhook from email provider (if supported) updates status to `delivered`/`bounced` for finer-grained tracking (stretch goal).
8. Author dashboard polls or subscribes (WebSocket/SSE) for live status updates during send.

## 10. Design Requirements

- Minimal, clean aesthetic throughout the product UI and default certificate templates.
- Limited color palette (2–3 core colors + neutral grays) for both app UI and preset certificate templates.
- Clean, legible typography — one primary typeface for UI, serif/elegant typeface option for certificate text.
- No visual clutter: generous whitespace, clear hierarchy, no unnecessary decorative elements.
- Certificate canvas editor must feel precise and responsive — snapping/alignment guides for placeholder positioning.
- Mobile-responsive dashboard for monitoring (editor itself can be desktop-only in v1).

## 11. Edge Cases & Validation

- Spreadsheet missing required columns → block upload, show clear error naming missing column(s).
- Spreadsheet with mixed/incorrect header casing or spacing → normalize headers before matching.
- Duplicate email addresses → flag all duplicates, let Author choose keep-first/keep-last/exclude-all.
- Invalid email format → flag row, exclude from send list until fixed.
- Empty name field → flag row as invalid.
- Spreadsheet with >500 rows → warn about longer processing time, chunk generation into batches.
- Template placeholder positioned outside canvas bounds → block save, highlight error.
- Participant name containing special characters/non-Latin scripts → ensure font supports Unicode rendering (embed Unicode-safe fonts).
- Email send failure due to invalid/nonexistent participant email → mark `failed` permanently after retries, do not keep retrying indefinitely.
- Duplicate event name by same Author → allow (append date/time), warn but don't block.
- Author edits template after generation already run → require explicit "regenerate" action, don't silently invalidate old certificates.
- Large file uploads (background template image) → enforce max file size (e.g., 10MB), compress on upload.

## 12. Success Metrics

- Time from spreadsheet upload to first certificate generated (target: < 5 min).
- % of spreadsheet rows requiring manual fix before validation passes (lower is better — measures parser robustness).
- Email delivery success rate (target: > 95% sent on first attempt + retries).
- Number of events created per Author (adoption/retention signal).
- Support tickets/errors reported per 100 certificates generated.

## 13. Future Scope

- Public certificate verification page (QR code on certificate linking to verification URL).
- Multiple template variants per event (e.g., different design for winners vs. participants).
- SMS/WhatsApp delivery option.
- Custom domain for verification links (white-labeling for institutions).
- Analytics on certificate opens/downloads (if hosted-link delivery used).
- Team/multi-admin support per organization with role-based permissions.
- API access for programmatic certificate generation (integration with external registration platforms).
- Blockchain-based tamper-proof certificate authentication.