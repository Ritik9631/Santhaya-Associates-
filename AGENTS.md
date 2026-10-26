# AGENTS.md — Mandatory agent operating instructions
Applies to all coding agents and all sessions in this workspace.

## Start every session
1. Read `PRD.md`, `RULES.md`, `MEMORY.md`, `PHASES.md` and `README.md` before editing.
2. Inspect actual code, package scripts, git status and existing assets. Documentation does not prove features exist.
3. State task scope, affected files, assumptions, risks and verification plan before substantial changes.
4. Ask for human approval if work exceeds the current phase or changes architecture/business requirements.

## During implementation
- Implement only the authorized phase; preserve existing working behavior and use compatible stable dependencies.
- Do not claim a form saved/sent data until verified against a working backend.
- Do not invent company claims, contact details, logos, inventory, testimonials or GST classifications.
- Validate inputs on the server once persistence is enabled; enforce authorization in server code and RLS.
- Treat `docs/Executive-Summary-Reference.pdf` as background research, subordinate to the updated PRD and RULES. Its simplified GST rules and Phase 1 fake-success suggestion are NOT implementation requirements.
- Update `MEMORY.md` promptly for decisions and actual completed milestones; never log unverified success.
- If blocked, explain what is missing rather than fabricate data or bypass security.

## Completion gate
Run supported lint, type-check, build and relevant tests. Inspect mobile/desktop UI where possible; report commands and actual results, including skipped checks. Verify accessibility, navigation, metadata and no fake form success. Update `MEMORY.md` with factual changes, pending tasks and one session-log entry. Stop and request approval before starting another phase.

## Naming note
`AGENTS.md` is the primary coding-agent entrypoint. `AGENT.md` is retained as a compatibility pointer.

## Scope lock — 2026-10-26
Santhaya Associates is a construction tender and machinery supply business. Implement only government/private construction tender services, construction machinery supply, manufacturing machinery supply, and the approved quotation and GST billing workflows. Do not add unrelated agency services or content without explicit user approval.
