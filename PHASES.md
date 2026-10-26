# Development phases and gates

| Phase | Goal | Approval gate |
|---|---|---|
| 0 | Documentation, brand assets, requirements | User approves documents |
| 1 | Next.js scaffold, public pages, validated demo request form | Lint, typecheck, build, responsive and form QA |
| 2 | Supabase schema, public request persistence, anti-spam | RLS/validation tests and real end-to-end request |
| 3 | Staff auth, roles and dashboard | Unauthorized access denied, role matrix tested |
| 4 | Quotations, PDF, email, acceptance history | Workflow, revisions and PDF totals verified |
| 5 | Orders, accountant-reviewed GST invoices, payments | Tax scenarios, money arithmetic, numbering, audit tests |
| 6 | Security, backup, accessibility, deployment | Written production go-live approval |

No agent may advance automatically. Report files changed, commands run, evidence, failures and remaining risks at each gate.
