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

## Mandatory Authentication & Public Website Constraint
- Public visitors and clients never log in or register. No auth/dashboard links on public site.
- Public quotation form functions without client authentication.
- Staff authentication is strictly internal (provisioned by admin; no self-registration).
- No staff login or dashboard implementation in Phase 2; strictly reserved for Phase 3 upon approval.

No agent may advance automatically. Report files changed, commands run, evidence, failures and remaining risks at each gate.

