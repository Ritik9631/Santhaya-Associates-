# Santhaya Associates — Antigravity Starter Kit

**Status:** Documentation prepared; no application code has been generated.

## Before starting
1. Review `PRD.md`, `RULES.md`, `AGENTS.md`, `MEMORY.md`, and `PHASES.md`.
2. Add the original company logo to `public/` (do not fabricate one).
3. Keep `docs/Executive-Summary-Reference.pdf` for background only; updated Markdown documents take precedence.
4. Open this folder as the Antigravity workspace. Use `START-HERE-PROMPT.md` as the first message.
5. Approve the proposed architecture before the agent installs packages or edits files.

## Technology direction
Next.js App Router, TypeScript strict, Tailwind, shadcn/ui; later Supabase, server PDF, transactional email, Vercel.

## Important
Phase 1 form is an explicitly non-operational demo. No data persistence, email, invoices or admin authentication until authorized later phases. Never store real secrets in source control.

## File guide
- `PRD.md`: Product requirements
- `AGENTS.md`: Mandatory agent workflow
- `AGENT.md`: Legacy entrypoint pointer
- `RULES.md`: Engineering, security and quality gates
- `MEMORY.md`: Confirmed decisions, status and logs
- `PHASES.md`: Phase roadmap
- `START-HERE-PROMPT.md`: First Antigravity message
- `docs/Executive-Summary-Reference.pdf`: Background research, not authoritative

## After implementation
Agent must document exact scripts and test commands based on generated package.json. Do not assume scripts exist before scaffolding.
