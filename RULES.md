# RULES.md — Mandatory development and QA rules

## Source of truth and change control
1. Read PRD, AGENTS, MEMORY, PHASES before work; check code reality.
2. Respect confirmed scope and phase gate. If documents conflict, stop and ask; never silently reinterpret.
3. Do not overwrite user assets, secrets or working code without approval; use git for traceability.
4. Keep `MEMORY.md` factual and up to date. Proposed != implemented != tested.

## Product integrity
5. Public customers never need an account to request quotations.
6. Staff functions are protected by verified identity AND authorized roles; no security through obscure URLs.
7. Never invent company data, service claims, testimonials, stock, awards or credentials.
8. No misleading 'request submitted' state before successful persistence and notification, if promised.
9. Preserve quotation/invoice history; do not silently mutate issued documents.
10. No GST production calculations until accountant-approved requirements and test scenarios are supplied.

## Engineering and security
11. TypeScript strict, modular code, reusable components, small dependencies, server validation.
12. Secrets remain server-only; environment examples contain names, never values.
13. Enable RLS and explicit least-privilege policies for future Supabase tables; test anonymous and staff access, including denied cases.
14. Rate-limit and protect public submissions; never expose client PII in logs or public APIs.
15. Use decimal-safe currency arithmetic; avoid binary floating-point for financial totals.
16. Add idempotency/transaction protections for issuance, payment and numbering workflows.

## UX, SEO and quality
17. Use approved navy/gold brand and supplied original logo; do not fabricate one.
18. Build responsive, keyboard-accessible UI; check focus, contrast, labels and errors.
19. Use accurate titles, descriptions, headings, canonical strategy and sitemap; private pages not indexed.
20. Avoid needless animations, overdesigned cards, fabricated marketing proof and broken placeholder links.
21. Test lint, typecheck, build and relevant workflows; never report PASS without running checks.
22. Update README, docs and MEMORY when changes affect setup, scope or architecture.
23. No deployment or migration against production without explicit approval and backup plan.
24. Stop after current phase and request human review.

## Mandatory Authentication and Public Website Rule
25. Public visitors and clients must never be required to log in or sign up.
26. Do not display Login, Sign In, Register, Sign Up, Account, or Dashboard links anywhere in the public website navigation, footer, or quotation form.
27. The public quotation request form must work without client authentication.
28. Staff authentication must be implemented separately for authorized Santhaya Associates employees.
29. Do not provide public staff self-registration. Staff accounts must be provisioned by an authorized administrator.
30. Protect all staff dashboard pages, APIs, and database operations using server-side authentication and role-based authorization.
31. Exclude staff authentication and dashboard routes from public navigation and XML sitemaps, and apply noindex to staff-facing pages.
32. Never rely on a hidden URL, robots.txt, or noindex as a security mechanism.
33. Do not expose customer information, quotation records, GST invoices, or payment data to unauthorized users.
34. Do not implement staff login or dashboard functionality during Phase 2 unless separately approved.

## Rules maintenance
When the user approves a new durable rule, add it here with date and rationale, note it in MEMORY, and preserve earlier decisions as superseded rather than silently deleting them.

## Scope lock — 2026-10-26
Santhaya Associates is a construction tender and machinery supply business. Implement only government/private construction tender services, construction machinery supply, manufacturing machinery supply, and the approved quotation and GST billing workflows. Do not add unrelated agency services or content without explicit user approval.

