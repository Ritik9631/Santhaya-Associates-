# Development phases and gates

| Phase | Goal | Approval gate | Status |
|---|---|---|---|
| 0 | Documentation, brand assets, requirements | User approves documents | Completed (2026-10-26) |
| 1 | Next.js scaffold, public pages, validated demo request form | Lint, typecheck, build, responsive and form QA | Completed & Approved (2026-10-26) |
| 2 | Supabase schema, public request persistence (unauthenticated), anti-spam | RLS/validation tests and real end-to-end request (no staff login/dashboard in Phase 2) | In Planning (Awaiting Architecture Approval) |
| 3 | Staff auth (admin-provisioned accounts only), roles and dashboard | Unauthorized access denied, role matrix tested (no public auth links, noindex) | Pending |
| 4 | Quotations, PDF, email, acceptance history | Workflow, revisions and PDF totals verified | Pending |
| 5 | Orders, accountant-reviewed GST invoices, payments | Tax scenarios, money arithmetic, numbering, audit tests | Pending |
| 6 | Security, backup, accessibility, deployment | Written production go-live approval | Pending |

## Mandatory Authentication and Public Website Rule
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

No agent may advance automatically. Report files changed, commands run, evidence, failures and remaining risks at each gate.

