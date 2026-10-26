# Santhaya Associates — Product Requirements Document
Version: 1.0 | Status: Approved project direction; company details pending confirmation | Updated: 2026-10-26

## 1. Purpose and business context
Build a professional public website and secure internal quotation/billing platform for Santhaya Associates Pvt. Ltd. (legal name to be confirmed). Business areas, per project brief: government and private construction tenders, construction machinery supply, and manufacturing machinery supply. Do not invent company credentials, inventory, history, testimonials, registration status, or addresses.

## 2. Users and access

### Mandatory Authentication and Public Website Rule
1. Public visitors and clients must never be required to log in or sign up.
2. Do not display Login, Sign In, Register, Sign Up, Account, or Dashboard links anywhere in the public website navigation, footer, or quotation form.
3. The public quotation request form must work without client authentication.
4. Staff authentication must be implemented separately for authorized Santhaya Associates employees.
5. Do not provide public staff self-registration. Staff accounts must be provisioned by an authorized administrator.
6. Protect all staff dashboard pages, APIs, and database operations using server-side authentication and role-based authorization.
7. Exclude staff authentication and dashboard routes from public navigation and XML sitemaps, and apply noindex to staff-facing pages.
8. Never rely on a hidden URL, robots.txt, or noindex as a security mechanism.
9. Do not expose customer information, quotation records, GST invoices, or payment data to unauthorized users.
10. Do not implement staff login or dashboard functionality during Phase 2 unless separately approved.

## 3. Public site requirements
Responsive navigation, hero, About, three services, How We Work, factual benefits, contact CTA, footer, privacy and terms placeholder pages. Homepage message: 'Building Today. Powering Tomorrow.' Main CTA: 'Request a Quotation'. Brand palette navy #10243B, gold #F4B323, white #FFFFFF. Use actual supplied logo only; if missing, use text wordmark with a visible asset-needed note, not a fabricated logo. Phone, email, address, GSTIN and company legal details are configurable and must remain explicitly unverified until provided. Public navigation and footer must never include Login, Sign In, Register, Sign Up, Account, or Dashboard links.

## 4. Public quotation request form
Route `/request-quotation`. Fields: business/customer name, contact person, email, Indian phone, optional GSTIN, service category (construction tender, construction machinery, manufacturing machinery, other), item/service requirements, optional quantity, technical specifications, delivery location/state, notes, and privacy consent. Client-side validation in Phase 1; server-side validation, abuse controls, persistence and notification in Phase 2. During Phase 1, never claim a request was submitted or received: label the form as a demo/not yet operational and do not retain personal data.

## 5. Business workflows (future phases)
Inquiry -> staff review -> quotation draft -> approval -> send PDF -> acceptance/rejection/expiry -> sales order -> invoice -> payment record -> outstanding balance. Preserve immutable snapshots of sent quotations and issued invoices; changes require controlled revisions/credit/debit note workflows. Client acceptance without account, if later implemented, requires secure expiring signed links and auditability; otherwise staff records acceptance with evidence.

## 6. Indian GST and invoicing requirements (future phases)
Company and customer billing/shipping details, GSTIN where applicable, supply type, place of supply, HSN/SAC, item-level configurable tax rates, discounts, freight and other charges, CGST/SGST/IGST/cess when applicable, invoice numbering, payment terms, audit history and compliant correction workflows. Do not infer GST solely from shipping state; verify legal place-of-supply rules and exceptions. Use decimal-safe money arithmetic, server-side calculations, deterministic rounding and test cases. Require qualified Indian GST/accounting review before issuing production invoices. Check e-invoicing/e-way bill applicability separately; no unverified compliance claims.

## 7. Technology decisions
Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Lucide, Zod. Supabase PostgreSQL/Auth/RLS/storage planned from Phase 2; server-only privileged operations; Resend (or approved transactional email provider) planned; PDF generation server-side; Vercel deployment and GitHub source control. Do not introduce separate backend service without approved need. Use supported compatible versions at implementation time.

## 8. Security and privacy
Enforce server-side role checks on every privileged action, RLS and least privilege; 'authenticated' alone is not authorization. Keep secrets out of source and client bundles. Public submission rate limiting, anti-spam, validation, consent and privacy policy before launch. Private document storage with controlled access; audit logs; backups and tested recovery; secure session handling. No real customer data in demo/test fixtures.

## 9. SEO, UX, accessibility and performance
Semantic headings, unique metadata, sitemap/robots for public routes, private routes noindex and never in sitemap, accessible forms/navigation, WCAG AA-minded contrast, responsive mobile-first layouts, image optimization and Core Web Vitals awareness. No false business claims. Avoid gratuitous motion and generic template visuals.

## 10. Delivery phases and acceptance
Phase 0: documentation, logo/company data checklist and architecture approval.
Phase 1: project scaffold, public pages, responsive navigation, demo quotation form with validation, SEO metadata, legal placeholders, README, tests and verified lint/typecheck/build.
Phase 2: Supabase schema, secure public form persistence, anti-spam, notification and tests (no staff login or dashboard in Phase 2).
Phase 3: staff authentication (admin-provisioned accounts only; no public self-registration), role authorization, dashboard, RLS tests.
Phase 4: quotation lifecycle, revisions, PDFs, delivery and acceptance evidence.
Phase 5: sales orders, GST invoice logic after accountant validation, payment tracking, audit logs.
Phase 6: end-to-end security, accounting, accessibility and deployment review.
No phase advances without user approval. An implementation is not complete until tests and limitations are reported.

## 11. Open business questions (do not block Phase 1)
Exact registered legal name and logo; official contact details and domain; registered state/GSTIN; service copy and approved imagery; staff roles; quote numbering/terms; invoice numbering and tax applicability; payment collection needs; privacy and retention policy. Use visibly marked placeholders, never invented facts.

## Scope lock — 2026-10-26
Santhaya Associates is a construction tender and machinery supply business. Implement only government/private construction tender services, construction machinery supply, manufacturing machinery supply, and the approved quotation and GST billing workflows. Do not add unrelated agency services or content without explicit user approval.
