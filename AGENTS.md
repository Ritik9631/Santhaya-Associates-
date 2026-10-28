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

## Automated Testing & Development Workflow Policy — 2026-10-29
1. **Agent Testing Responsibility**: The Antigravity agent is responsible for automatically performing all applicable development tests, security checks, regression tests, typechecks, lint checks, and production builds.
2. **Autonomous Defect Remediation**: Automatically diagnose and fix test failures within the currently approved implementation scope, then rerun the relevant tests.
3. **Zero Routine Manual Testing Burden**: Do not require the project owner to manually perform routine testing after every development stage.
4. **Concise Phase-Completion Reporting**: Provide concise phase-completion reports containing implementation status, automated test results, blockers, and the next recommended action.
5. **Project Owner Production UAT Gate**: The project owner will perform comprehensive manual functional and user-acceptance testing when the application is production-ready, before approving its public launch.
6. **Non-Destructive Development Invariant**: Continue to use safe development environments and non-destructive test data.
7. **Explicit Approval Gate**: Require explicit human approval before applying database migrations, creating privileged staff accounts, sending real customer emails, changing production configuration, or deploying.
8. **Verification Discipline**: Do not bypass security requirements or mark untested functionality as verified.
9. **Strict Stage Scope Boundary**: Continue implementing only the currently approved development stage. Do not automatically begin unrelated stages.

## Completion gate
Run supported lint, type-check, build and relevant tests. Inspect mobile/desktop UI where possible; report commands and actual results, including skipped checks. Verify accessibility, navigation, metadata and no fake form success. Update `MEMORY.md` with factual changes, pending tasks and one session-log entry. Stop and request approval before starting another phase.

## Naming note
`AGENTS.md` is the primary coding-agent entrypoint. `AGENT.md` is retained as a compatibility pointer.

## Scope lock — 2026-10-26
Santhaya Associates is a construction tender and machinery supply business. Implement only government/private construction tender services, construction machinery supply, manufacturing machinery supply, and the approved quotation and GST billing workflows. Do not add unrelated agency services or content without explicit user approval.
