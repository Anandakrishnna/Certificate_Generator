# CertifyFlow 🎓⚡

**Automated Certificate Generation & Email Distribution Platform**

An end-to-end web platform designed for event organizers (college clubs, IEEE chapters, hackathons, and webinar hosts) to bulk-generate personalized certificates from spreadsheets and automatically email them directly from the organizer's mailbox with live tracking and public verification.

---

## 🚀 Key Highlights & Features

### 1. 📊 Spreadsheet Upload & Smart Validation Engine
- **File Format Support**: Seamlessly parses `.csv`, `.xlsx`, and `.xls` files.
- **Fuzzy Header Detection**: Automatic alias mapping for `name` (`full_name`, `participant_name`, `student_name`) and `email` (`email_address`, `mail`).
- **RFC-Compliant Email Validation**: Regex checks prevent bounces before dispatching.
- **Duplicate Detection**: Identifies duplicate emails and duplicate (name + email) combinations.
- **Interactive In-Place Table Editor**: Fix flagged emails and names inline, or exclude rows with 1 click before confirming.

### 2. 🎨 Interactive Visual Canvas Studio
- **Powered by Konva Canvas**: High-performance drag-and-drop placeholder placement with snapping guidelines.
- **Flexible Backgrounds**: Upload custom high-resolution certificate backgrounds (PNG, JPG, SVG) or select built-in minimalist presets.
- **Rich Typography Controls**: Font family (Sans vs Serif), font size, text color picker, and multi-mode text alignment (left, center, right).
- **Live Data Preview**: Toggle between raw placeholder tags (`{{name}}`, `{{event_name}}`) and realistic preview using attendee data.

### 3. 🔗 Dynamic Field Mapping & Sample Approval
- Auto-suggests spreadsheet columns to template placeholders.
- Sample Certificate Approval Carousel: Renders first 3–5 certificates on demand before committing to bulk generation.

### 4. ⚡ High-Performance Batch Generation
- **Server-Side PDF Rendering**: Powered by `pdf-lib` and `@pdf-lib/fontkit` with embedded TTF Unicode fonts (`Noto Serif`, `Roboto`).
- **Edge-Case Resilience**: Auto-scales text size and handles non-Latin accented characters without clipping or missing glyphs.
- **Unique Certificate UID**: Embeds a unique verification token (`CERT-XXXXXXXX`) on every issued certificate.
- **PNG/SVG Export**: High-fidelity raster/vector export alongside print-ready PDFs.

### 5. 📬 Organizer-Direct Email Delivery & Queue
- **Dispatched from Organizer's Mailbox**: Sends directly from the logged-in organizer's Gmail/SMTP address with custom `Reply-To`.
- **Automatic PDF Attachment**: Attaches the personalized certificate PDF directly to the recipient's email.
- **Exponential Backoff Retries**: Transient delivery failures auto-retry on 1-minute, 5-minute, and 15-minute schedules.
- **Real-Time Tracking Console**: Live per-recipient status indicators (`Queued`, `Sending`, `Sent`, `Failed`, `Retrying`) with individual "Manual Resend" actions.

### 6. 🛡️ Public Certificate Verification Portal
- Anyone can verify certificate authenticity by visiting `/verify/[certificateUid]`.
- Displays recipient name, event name, issue date, organizer badge, and full certificate preview without requiring a login.

### 7. 📈 Delivery Analytics & CSV Export
- Downloadable delivery reports (CSV) with timestamp, recipient email, status, attempt counts, and error logs.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React Server Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Canvas Engine**: [Konva](https://konvajs.org/) / `react-konva`
- **Database & ORM**: SQLite via [Prisma ORM](https://www.prisma.io/) (zero-config, portable)
- **Auth**: JWT Session Cookies with `bcryptjs` password hashing
- **PDF Engine**: `pdf-lib` + `@pdf-lib/fontkit`
- **Spreadsheet Parsers**: `papaparse` (CSV) + `xlsx` (Excel)
- **Email Delivery**: `nodemailer` (Google SMTP / Custom SMTP / Resend API)

---

## 📁 Directory Structure

```text
certificate-generator/
├── prisma/
│   ├── schema.prisma              # Data models (User, Event, Participant, Template, Certificate, EmailDelivery)
│   └── seed.ts                    # Sample events & attendees seed
├── public/
│   ├── fonts/                     # Unicode-supported TTF fonts (Noto Serif, Roboto)
│   ├── templates/presets/         # Minimalist template backgrounds (SVG)
│   ├── uploads/                   # User-uploaded template backgrounds
│   └── generated/                 # Generated certificate PDFs and images
├── src/
│   ├── app/
│   │   ├── (auth)/                # /login & /register pages
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/         # Events overview & metrics
│   │   │   └── events/
│   │   │       ├── new/           # Event creation wizard
│   │   │       └── [eventId]/
│   │   │           ├── upload/    # Spreadsheet dropzone & validation
│   │   │           ├── template/  # Konva visual canvas designer
│   │   │           ├── mapping/   # Placeholder mapping & sample approval
│   │   │           ├── generate/  # Bulk generation progress
│   │   │           └── delivery/  # Email console, retries & tracking
│   │   ├── verify/[uid]/          # Public verification page
│   │   └── api/                   # REST API routes (Auth, Events, Generate, Delivery, Verification)
│   ├── components/
│   │   ├── canvas/                # Konva canvas components & styling toolbar
│   │   ├── upload/                # Dropzone & validation table
│   │   ├── delivery/              # SMTP configuration modal & tracking badges
│   │   └── ui/                    # Reusable primitives (Buttons, Modals, Badges, Inputs)
│   └── lib/
│       ├── auth.ts                # JWT authentication utilities
│       ├── db.ts                  # Prisma client singleton
│       ├── email/                 # Email delivery provider & template interpolator
│       ├── generator/             # PDF-lib and SVG rendering engine
│       ├── parser/                # CSV/XLSX parser & validation rules
│       ├── queue/                 # Delivery worker with exponential retries
│       └── storage/               # Local filesystem storage abstraction
└── tests/                         # Integration & unit test suites
```

---

## ⚡ Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm** or **pnpm**

### 2. Clone & Install
```bash
git clone https://github.com/Anandakrishnna/Certificate_Generator.git
cd Certificate_Generator
npm install
```

### 3. Initialize Database
```bash
npx prisma db push
```

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Account Credentials

For quick exploration without registering:
- **Email**: `demo@certifyflow.com`
- **Password**: `demo1234`

---

## 📧 Outgoing Email (Gmail SMTP) Setup

> ⚠️ **CRITICAL NOTE ON EMAIL DELIVERY**:  
> Without configured SMTP / Gmail credentials, certificates in local development will "send" silently via an in-memory simulated mock provider and **will never reach participants' real mailboxes**.  
> Always connect a valid 16-character Google App Password or SMTP provider before dispatching certificates. In production environments (`NODE_ENV === "production"`), unconfigured sends are strictly blocked to prevent silent mock delivery.

To send real certificate emails directly from your Gmail address:

1. **Generate a Google App Password**:
   - Go to: [Google Account App Passwords](https://myaccount.google.com/apppasswords)
   - *(Make sure 2-Step Verification is turned ON on your Google account).*
   - Enter App name: `CertifyFlow` and click **Create**.
   - Copy the generated 16-character password (e.g., `abcd efgh ijkl mnop`).
2. **Configure in the App**:
   - Open your event's Delivery page (`/events/[eventId]/delivery`).
   - Click **"Configure Gmail / SMTP"**.
   - Your email address will be automatically populated.
   - Paste the 16-character App Password and click **"Save & Activate"**.
   - The platform will perform an automated pre-flight verification with Google's servers before activating.
   - Click **"Verify with a Test Email"** to confirm instant delivery!

---

## 🗄️ Database: Local SQLite vs. Production Serverless

- **Local Development**: Uses local SQLite (`DATABASE_URL="file:./dev.db"`). Requires zero setup.
- **Production Serverless (Vercel / Netlify / AWS Lambda)**:  
  Serverless filesystems are ephemeral and read-only across lambdas. Running SQLite (`file:`) on serverless platforms will wipe credentials and event data across invocations.  
  To deploy to production, set `DATABASE_URL` to a hosted PostgreSQL instance (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com)) or [Turso](https://turso.tech). CertifyFlow includes automated startup guards in `src/lib/db.ts` that safely detect and error on ephemeral serverless SQLite usage.

---

## 🧪 Testing & Verification

Run the automated test suite:

```bash
# Verify End-to-End HTTP flows (Auth, Events, CSV Export, Verification)
node --experimental-strip-types tests/verify_http.ts

# Test Spreadsheet parser & alias detection
node tests/parser.test.mjs
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
