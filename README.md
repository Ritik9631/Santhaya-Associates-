# Santhaya Associates — Corporate Website & Staff ERP System

Official web platform and enterprise management system for **Santhaya Associates Pvt. Ltd.** (Gopalpur, Motihari, East Champaran, Bihar - 845401).

Santhaya Associates operates across three primary industrial pillars:
1. **Government & Private Construction Tenders**
2. **Construction Machinery Supply & Rentals**
3. **Manufacturing Machinery Supply**

The system integrates a public, client-facing corporate website with an internal, role-protected Staff ERP for quotation estimation, Indian GST-compliant billing, payments, customer management, and multi-channel document sharing (WhatsApp & Email).

---

## 1. Architectural Highlights & Invariants

- **Zero Public Authentication:** Public visitors and prospective clients never encounter login, signup, or registration prompts. Quotation requests (`/request-quotation`) are completely unauthenticated and protected by cryptographic tokens, rate limiting, and honeypot defenses.
- **Strict Staff Isolation:** All operational and administrative functionalities reside exclusively under `/staff/*`, secured by server-side session authentication, Supabase Auth, Row-Level Security (RLS), and Role-Based Access Control (RBAC). Staff accounts are provisioned exclusively by authorized administrators.
- **Indian Statutory GST Engine:** Dynamic intra-state (CGST + SGST) vs inter-state (IGST) tax calculation, Modulo 36 GSTIN verification, auto-derived PAN, and gapless financial year quotation/invoice sequence numbering complying with Section 31 of CGST Act, 2017 & Rule 46 of CGST Rules, 2017.
- **Staff-Controlled Document Sharing Hub:** Touch-friendly, zero-paid-API document distribution via WhatsApp (`wa.me`) and external email client (`mailto:`) with pre-composed messages, Indian phone validation (`+91`), and explicit staff attestation (`Confirm Manually Sent`).
- **Transactional Outbox Subsystem:** Decoupled asynchronous email delivery using PostgreSQL `email_outbox` queue, optimistic row locking, exponential backoff retries, and quota guards. Operates in `EMAIL_PROVIDER=mock` mode during development.

---

## 2. Technology Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Actions, React 18)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom Santhaya corporate palette (Deep Navy `#10243B`, Gold `#F4B323`, Clean Slate)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL 15+, Auth, Row-Level Security)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Validation:** [Zod](https://zod.dev/)
- **PDF Generation:** Server-rendered Next.js print templates with exact A4 geometry (`@page { size: A4 portrait; margin: 8mm 10mm; }`), 32mm official circular corporate seal, and draft safeguards

---

## 3. Local Development Quickstart

### Prerequisites
- **Node.js:** v20.x or v22.x LTS (tested on v22.12.0)
- **npm:** v10.x or v11.x
- **Git**
- Access to the development Supabase project (`bkqneudnnhvvwmtggorz`)

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Ritik9631/Santhaya-Associates-.git
   cd Santhaya-Associates
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` and configure your credentials:
   ```bash
   cp .env.example .env.local
   ```
   *(Ensure `DEV_SUPABASE_PROJECT_REF=bkqneudnnhvvwmtggorz`, `SUPABASE_ENV=development`, `ALLOW_TEST_ENV=true`, and `EMAIL_PROVIDER=mock`)*

3. **Install Dependencies:**
   ```bash
   npm install
   # or on Windows PowerShell:
   npm.cmd install
   ```

4. **Verify Database Connectivity:**
   ```bash
   npm.cmd run test:db-health
   ```

5. **Start Development Server:**
   ```bash
   npm.cmd run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Quality Verification & Testing Commands

Run all quality gates locally before committing:

```bash
# Typecheck TypeScript codebase (0 errors required)
npm.cmd run typecheck

# Lint with Next.js ESLint (0 errors/warnings required)
npm.cmd run lint

# Run the complete test suite (17 comprehensive test batteries)
npm.cmd test

# Run specific regression test suites
npm.cmd run test:batch5          # Batch 5 Manual Document Sharing & Notification Suite
npm.cmd run test:stamp           # Official Round Seal Integration & 1-Page A4 Fit Suite
npm.cmd run test:refinements     # GSTIN Checksum, PAN Derivation & Financial Decimals
npm.cmd run test:db-health       # Read-only database continuity check

# Build production bundle (26/26 routes)
npm.cmd run build
```

---

## 5. Project Status & Roadmap

- **Phases 1–6:** **COMPLETE & VERIFIED**
- **Batches 1–5 Bug Fixes & Refinements:** **COMPLETE & VERIFIED**
- **Phase 7 Production Deployment:** **ON HOLD** (Awaiting formal human authorization before live domain publication)

For comprehensive technical handover and cross-device instructions, refer to [`docs/DEVELOPMENT-HANDOVER.md`](./docs/DEVELOPMENT-HANDOVER.md) and [`MEMORY.md`](./MEMORY.md).
