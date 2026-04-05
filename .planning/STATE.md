# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** Members can register for badminton sessions directly inside their Line group — no more copy-paste templates, no manual headcount tracking.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-04-05 — Roadmap created; 28 v1 requirements mapped across 6 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Single Next.js app hosts webhook, LIFF, and admin web — no cross-process RPC for Phase 1 scale
- [Roadmap]: Flex Message card is a static snapshot by design — LIFF is the live registration view; no edit-message strategy
- [Roadmap]: Line Messaging API and LIFF channels must be under the same provider — verify before writing identity-lookup code in Phase 2
- [Roadmap]: Vercel region should be set to `hnd1` (Tokyo) in `vercel.json` before first production deployment

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Short-lived token flow for group-to-club linking has limited community documentation — may need focused research pass before planning Phase 2
- [Phase 6]: Vercel Cron Jobs have daily granularity on Hobby plan — evaluate Inngest or Trigger.dev if sub-daily scheduling precision is needed

## Session Continuity

Last session: 2026-04-05
Stopped at: Roadmap and STATE created; REQUIREMENTS.md traceability updated; ready to begin Phase 1 planning
Resume file: None
