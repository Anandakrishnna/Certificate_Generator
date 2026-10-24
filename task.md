# Execution Plan: Certificate Generation & Distribution Platform

This execution plan provides a modular, step-by-step roadmap tailored for execution by an AI coding agent. Each phase contains clear deliverables, file structures, technical requirements, acceptance criteria, and verification steps.

---

## 1. Architecture & Technology Stack

- **Framework**: Next.js 14+ (App Router, React 18/19, TypeScript)
- **Styling & UI**: Tailwind CSS, Lucide React (clean, minimal aesthetic per PRD Section 10)
- **Canvas Editor**: Konva (`react-konva` / `konva`) for interactive drag-and-drop placeholder placement, bounding boxes, snapping, and live preview
- **Database & ORM**: SQLite via Prisma ORM for zero-setup local execution (switchable to PostgreSQL via `DATABASE_URL`)
- **Authentication**: JWT-based session authentication with bcrypt password hashing
- **Spreadsheet Parsing & Validation**: `papaparse` (CSV) + `xlsx` (Excel) + custom RFC email and alias validation engine
- **Certificate Generation Engine**:
  - PDF: `pdf-lib` + `@pdf-lib/fontkit` (with embedded Unicode fonts like Roboto / Noto Serif)
  - PNG: `node-canvas` / `sharp` or client-side/server canvas export
- **Storage Layer**: Local filesystem storage adapter (`/uploads`, `/generated`) with modular S3/R2 interface
- **Email Delivery & Queue**:
  - Queue: Database-backed queue with polling worker or BullMQ-compatible interface
  - Email Provider: Pluggable adapter (Ethereal/Mock SMTP for local testing, Resend / SMTP for production)
  - Retries: Exponential backoff (1m, 5m, 15m), max 3 retries, manual resend capability

---

## 2. Directory Structure Blueprint

```text
certificate-generator/
├── prisma/
│   ├── schema.prisma              # Data models (User, Event, Participant, Template, Certificate, EmailDelivery)
│   └── seed.ts                    # Sample author, events, and templates
├── public/
│   ├── fonts/                     # Unicode-supported TTF fonts (Sans & Serif)
│   └── templates/presets/         # Built-in minimal template backgrounds (SVG/PNG)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── events/
│   │   │       ├── new/page.tsx
│   │   │       └── [eventId]/
│   │   │           ├── page.tsx               # Event overview & status
│   │   │           ├── upload/page.tsx        # Spreadsheet upload & validation
│   │   │           ├── template/page.tsx      # Canvas template editor
│   │   │           ├── mapping/page.tsx       # Placeholder mapping & preview
│   │   │           ├── generate/page.tsx      # Bulk generation progress
│   │   │           └── delivery/page.tsx      # Email sender & tracking
│   │   ├── verify/[certificateUid]/page.tsx   # Public certificate verification
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts (or custom JWT routes)
│   │   │   ├── events/route.ts
│   │   │   ├── events/[eventId]/route.ts
│   │   │   ├── participants/validate/route.ts
│   │   │   ├── templates/route.ts
│   │   │   ├── generate/route.ts
│   │   │   ├── email/send/route.ts
│   │   │   └── verify/[certificateUid]/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── CertificateCanvas.tsx          # Konva interactive canvas
│   │   │   ├── Toolbar.tsx                    # Font, size, color, alignment controls
│   │   │   └── PlaceholderLayer.tsx           # Draggable placeholder bounding boxes
│   │   ├── upload/
│   │   │   ├── FileDropzone.tsx
│   │   │   └── ValidationReportTable.tsx      # Inline edit & row exclusion table
│   │   ├── delivery/
│   │   │   ├── DeliveryStatusBadge.tsx
│   │   │   └── DeliveryProgressTracker.tsx
│   │   └── ui/                                # Reusable UI components (Buttons, Modals, Inputs)
│   ├── lib/
│   │   ├── auth.ts                            # JWT token generation & verification
│   │   ├── db.ts                              # Prisma client singleton
│   │   ├── email/
│   │   │   ├── email-service.ts               # Mail delivery abstraction
│   │   │   └── templates.ts                   # Email subject & body interpolator
│   │   ├── generator/
│   │   │   ├── pdf-generator.ts               # pdf-lib PDF builder
│   │   │   ├── image-generator.ts             # PNG renderer
│   │   │   └── unicode-fonts.ts               # Fontkit font loader
│   │   ├── parser/
│   │   │   ├── spreadsheet-parser.ts          # CSV / XLSX reader
│   │   │   └── validator.ts                   # Email RFC, duplicate, and alias rules
│   │   ├── queue/
│   │   │   └── delivery-queue.ts              # Async queue with exponential backoff
│   │   └── storage/
│   │       └── local-storage.ts               # Local file storage provider
│   └── types/
│       ├── certificate.ts
│       ├── template.ts
│       └── participant.ts
├── tests/
│   ├── parser.test.ts
│   ├── generator.test.ts
│   └── queue.test.ts
├── task.md                                    # This execution plan
└── prd.md                                     # Product Requirements Document
```

---

## 3. Step-by-Step Execution Phases

### Phase 1: Environment Setup & Core Foundations
- [x] **Task 1.1: Project Initialization**
  - Initialize Next.js project with TypeScript, Tailwind CSS, ESLint, and App Router.
  - Install dependencies: `prisma`, `@prisma/client`, `lucide-react`, `papaparse`, `xlsx`, `pdf-lib`, `@pdf-lib/fontkit`, `konva`, `react-konva`, `bcryptjs`, `jsonwebtoken`.
  - Configure path aliases in `tsconfig.json` (`@/*` pointing to `./src/*`).
- [x] **Task 1.2: Design Tokens & Base UI Components**
  - Implement minimal, clean theme in `tailwind.config.ts` (neutral slate/zinc, primary indigo/slate, clean typography per PRD Section 10).
  - Create reusable UI primitives: `Button`, `Input`, `Card`, `Badge`, `Modal`, `Tabs`, `Alert`.
- [x] **Task 1.3: Unicode Safe Fonts & Sample Assets**
  - Download and configure Unicode-safe fonts (e.g. Roboto Regular/Bold and Noto Serif) in `public/fonts/`.
  - Add 2 minimal built-in template background SVGs/PNGs into `public/templates/presets/`.
- [x] **Task 1.4: Storage Abstraction Layer**
  - Implement `src/lib/storage/local-storage.ts` with methods: `saveFile(buffer, path)`, `getFile(path)`, `deleteFile(path)`.
  - Ensure uploaded templates and generated certificates are saved locally in `./uploads` and `./generated` with clean URL serving.

*Verification*: Run `npm run build` to confirm zero compilation errors.

---

### Phase 2: Database Schema & Authentication
- [x] **Task 2.1: Prisma Schema Definition**
  - Create `prisma/schema.prisma` mapping all PRD Section 7 entities:
    - `User`: `id`, `name`, `email`, `passwordHash`, `createdAt`
    - `Event`: `id`, `authorId`, `name`, `description`, `eventDate`, `organizerName`, `createdAt`
    - `Participant`: `id`, `eventId`, `name`, `email`, `extraFields` (JSON), `validationStatus`, `createdAt`
    - `Template`: `id`, `eventId`, `backgroundUrl`, `placeholders` (JSON array: `fieldKey, x, y, width, height, font, fontSize, color, align`), `createdAt`
    - `Certificate`: `id`, `participantId`, `templateId`, `fileUrlPdf`, `fileUrlPng`, `certificateUid` (unique nano/uuid), `generatedAt`
    - `EmailDelivery`: `id`, `certificateId`, `participantId`, `status` (`queued | sending | sent | failed | retrying`), `attemptCount`, `lastAttemptedAt`, `errorMessage`, `sentAt`
  - Run `npx prisma db push` or `prisma migrate dev`.
- [x] **Task 2.2: Authentication System**
  - Implement password hashing with `bcryptjs`.
  - Create JWT session utilities in `src/lib/auth.ts` (token sign, verify, HTTP-only cookie management).
  - Implement API routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
  - Build Auth UI: `/login` and `/register` with validation feedback.
- [x] **Task 2.3: Auth Middleware & Route Protection**
  - Protect `/dashboard` and `/events/*` routes using Next.js middleware checking the session cookie.

*Verification*: Register a user, log in, verify cookie creation and redirection to `/dashboard`.

---

### Phase 3: Event Management & Navigation Shell
- [x] **Task 3.1: Event CRUD APIs**
  - `POST /api/events` (create event: name, description, date, organizer).
  - `GET /api/events` (list author's events with participant & certificate counts).
  - `GET /api/events/[eventId]` (event details).
  - `PUT /api/events/[eventId]` & `DELETE /api/events/[eventId]`.
- [x] **Task 3.2: Dashboard UI**
  - Build `/dashboard` overview listing existing events, active statistics (total certificates generated, emails sent).
  - Empty state with "Create New Event" CTA.
- [x] **Task 3.3: Event Creation Flow**
  - Build `/events/new` modal/page.
  - Build the event workspace layout (`/events/[eventId]`) with step-based navigation:
    `1. Upload Data` → `2. Design Template` → `3. Map Fields` → `4. Generate` → `5. Deliver & Track`.

*Verification*: Create an event, verify it appears in the dashboard, and navigate to the event workflow.

---

### Phase 4: Spreadsheet Upload & Validation Engine
- [x] **Task 4.1: Parser Engine (`src/lib/parser/`)**
  - Implement `spreadsheet-parser.ts` supporting both `.csv` and `.xlsx`/`.xls`.
  - Header normalization: trim whitespace, lowercase, and fuzzy alias detection for:
    - Name: `name`, `full_name`, `participant_name`, `student_name`
    - Email: `email`, `email_address`, `mail`, `e-mail`
  - Retain additional columns dynamically in `extraFields` JSON.
- [x] **Task 4.2: Data Validator (`src/lib/parser/validator.ts`)**
  - Check non-empty name.
  - RFC 5322 compliant email regex validation.
  - Duplicate detection:
    - Duplicate email detection.
    - Duplicate (name + email) row detection.
  - Return structured validation report:
    `{ totalRows, validCount, invalidCount, duplicateCount, rows: [{ id, name, email, extra, status: 'valid'|'invalid'|'duplicate', errorReasons: [] }] }`.
- [x] **Task 4.3: Upload & Validation UI (`/events/[eventId]/upload`)**
  - Drag-and-drop file dropzone with file size/type constraints (max 10MB).
  - Validation Summary Cards: Valid Rows, Flagged Rows, Duplicate Rows.
  - Interactive Validation Table:
    - In-place row editing to fix invalid emails/names.
    - Action buttons: "Exclude Row", "Keep First Duplicate", "Exclude All Duplicates".
    - "Confirm & Save Participants" button committing valid rows to the database.

*Verification*: Upload sample CSV with invalid emails, duplicate rows, and varying header cases. Verify error reporting and inline fix workflow.

---

### Phase 5: Template Canvas Editor & Presets
- [x] **Task 5.1: Canvas Studio Architecture (`src/components/canvas/`)**
  - Setup Konva-based canvas with standard certificate dimensions (A4 Landscape: 1123 x 794 or 1920 x 1080 px).
  - Support setting background via:
    - Upload custom image (PNG/JPG, auto-scaled with max 10MB limit).
    - Selecting built-in minimal template presets.
- [x] **Task 5.2: Draggable Placeholder Elements**
  - Default draggable elements: `{{name}}`, `{{event_name}}`, `{{date}}`, `{{organizer}}`, plus buttons to add detected `extraFields` from spreadsheet.
  - Implement Konva `Transformer` for each element:
    - Draggable position with snapping guidelines and numeric fallback inputs (`x`, `y`, `width`, `height`).
    - Typography toolbar: Font family (Sans vs Serif), font size, text color picker, text alignment (left, center, right).
    - Boundary checking: prevent/warn if placeholder lies outside canvas boundaries.
- [x] **Task 5.3: Live Data Preview**
  - Toggle switch: "Show Placeholders" (`{{name}}`) vs "Preview with First Participant" (e.g. "Jane Doe").
  - Save template configuration to `Template` table via `POST /api/templates`.

*Verification*: Drag placeholder onto canvas, change font size and color, toggle live preview, save, and reload to verify persistent coordinates.

---

### Phase 6: Field Mapping & Sample Approval
- [x] **Task 6.1: Field Mapping Interface (`/events/[eventId]/mapping`)**
  - Display list of template placeholders mapped against spreadsheet columns.
  - Auto-match based on key similarity (e.g., `{{name}}` -> `name`, `{{date}}` -> `event_date`).
  - Dropdown selector to manually remap or assign fallback static text.
- [x] **Task 6.2: Sample Certificate Preview & Approval**
  - "Generate Sample Preview" action: renders first 3-5 participant certificates on demand.
  - Modal carousel to inspect sample PDF/PNG outputs.
  - Approval toggle allowing the author to proceed to bulk generation.

*Verification*: Map custom extra columns (e.g. `role` or `award`), generate preview, and visually verify sample output.

---

### Phase 7: Bulk Certificate Generation Engine
- [x] **Task 7.1: Server-Side PDF & PNG Rendering Engine**
  - Implement `src/lib/generator/pdf-generator.ts` using `pdf-lib`:
    - Load template background image.
    - Register embedded TTF Unicode font.
    - Accurately translate canvas coordinates (accounting for DPI and landscape dimensions).
    - Render text with specified alignment, size, and color.
    - Embed unique `certificateUid` on the certificate footer/margin.
  - Implement `src/lib/generator/image-generator.ts` for PNG export.
- [x] **Task 7.2: Batch Processing & Progress API**
  - Create endpoint `/api/generate`:
    - Chunks participant list into batches (e.g., 25-50 participants per batch) to handle up to 500 participants smoothly without memory spikes.
    - Generates PDF and PNG files, saves to storage, and writes `Certificate` records with `certificateUid`.
    - Returns real-time progress (`generatedCount / totalCount`).
- [x] **Task 7.3: Generation UI (`/events/[eventId]/generate`)**
  - Progress bar with percentage and speed indicator.
  - Gallery view of generated certificates with spot-check modal and "Regenerate" button.

*Verification*: Run generation on 50 sample participants, verify files exist in storage and `Certificate` database records have valid URLs.

---

### Phase 8: Email Delivery Engine, Queue & Retries
- [x] **Task 8.1: Email Service & Templating (`src/lib/email/`)**
  - Build email template editor (Subject and Markdown/HTML Body) supporting variables: `{{name}}`, `{{event_name}}`, `{{certificate_url}}`.
  - Create email sender provider supporting:
    - Dev mode: Ethereal / Local console logging with preview URL.
    - Production mode: SMTP / Resend API adapter.
    - Attach certificate PDF to outgoing email.
- [x] **Task 8.2: Async Delivery Queue & Retry Worker (`src/lib/queue/`)**
  - On "Send All", populate `EmailDelivery` table with `status = 'queued'`.
  - Worker processes queued jobs with rate limit management (e.g. 5-10 emails/sec to prevent SMTP blocks).
  - Status transitions: `queued` → `sending` → `sent` (with timestamp) OR `failed` (with `errorMessage`).
  - Exponential backoff retry handler:
    - Retries `failed` records where `attemptCount < 3` at intervals: 1 min, 5 min, 15 min.
    - Marks permanently `failed` after 3 attempts.
- [x] **Task 8.3: Delivery Control & Tracking UI (`/events/[eventId]/delivery`)**
  - Live delivery dashboard:
    - Metrics: Total, Queued, Sending, Sent, Failed, Retrying.
    - Real-time polling / SSE status table with recipient email, status badge, attempts, error message.
    - "Manual Resend" button for individual failed recipients.
    - "Retry All Failed" batch action.

*Verification*: Trigger send with mock email adapter; simulate a failure and confirm retry backoff and manual resend execution.

---

### Phase 9: Dashboard Analytics & Report Export
- [x] **Task 9.1: Delivery Analytics & Export**
  - Export delivery report as CSV (`name`, `email`, `certificateUid`, `status`, `sentAt`, `errorMessage`).
  - Per-event statistics overview (success rate percentage, delivery timeline).
- [x] **Task 9.2: Public Certificate Verification (`/verify/[certificateUid]`)**
  - Public route (no login required) displaying:
    - Certificate preview (PNG/PDF embed).
    - Recipient name, event name, issue date, organizer.
    - Verification badge ("Authentic Certificate issued by [Organizer]").

*Verification*: Access `/verify/[certificateUid]` in incognito window and verify certificate authenticity details render.

---

### Phase 10: Edge Cases, Performance & Polish
- [x] **Task 10.1: Edge Case Guardrails (PRD Section 11)**
  - Special character / non-Latin names: Test Unicode rendering (accents, Hindi/Arabic/CJK if applicable).
  - Long names: Implement text measurement and auto-shrink/wrap if name exceeds bounding box width.
  - Large spreadsheet upload: Test 500+ rows with performance warning banner.
  - Duplicate email resolution handling.
- [x] **Task 10.2: UI Polish & Accessibility**
  - Polish UI micro-interactions, loading spinners, toast notifications, responsive mobile views for dashboard/monitoring.
  - Add sample demo data button ("Load Demo Event") for instant testing.

---

## 4. Coding Agent Instructions & Workflow Protocol

When building this project with an AI coding agent:
1. **Sequential Execution**: Follow the phases in order from Phase 1 to Phase 10. Do not skip to Phase 5 before completing Phase 1-3.
2. **Task State Tracking**: Mark completed tasks by changing `- [ ]` to `- [x]` in this `task.md` file after each task is implemented and verified.
3. **Automated Verification**: After every phase, run verification commands (e.g., test scripts, dev server check, schema validation) before moving to the next.
4. **Resilience**: Ensure all edge cases (missing columns, invalid emails, long strings, font missing glyphs) have explicit unit test coverage or robust fallback defaults.
