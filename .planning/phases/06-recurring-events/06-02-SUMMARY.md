---
phase: 06-recurring-events
plan: 02
subsystem: api
tags: [cron, recurring-events, bearer-auth, timezone, idempotency]
dependency_graph:
  requires: ["06-01"]
  provides: ["cron-endpoint", "occurrence-generation"]
  affects: ["events-table", "line-messaging"]
tech_stack:
  added: []
  patterns: ["bearer-token-auth", "timingSafeEqual", "Bangkok-timezone-arithmetic", "idempotency-guard"]
key_files:
  created:
    - apps/api/src/routes/cron.ts
    - apps/api/src/__tests__/cron.test.ts
  modified:
    - apps/api/src/index.ts
decisions:
  - "cronRoutes mounted inside /api group (path: POST /api/cron/generate-occurrences) to keep prefix consistent"
  - "generateEventTitle arg order fixed to match actual signature: (eventDate, venueName)"
  - "LINE push wrapped in try/catch to avoid failing occurrence creation on LINE errors"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  files_changed: 3
---

# Phase 06 Plan 02: Cron Occurrence Generation Summary

Cron endpoint `POST /api/cron/generate-occurrences` with bearer-token auth, Bangkok timezone arithmetic, catch-up logic, and idempotency guard — delivering EVNT-04 and EVNT-05.

## What Was Built

### Task 1: Cron endpoint (a16b1bd)

`apps/api/src/routes/cron.ts` — exports `cronRoutes` (Elysia plugin, prefix `/cron`):

- **Bearer auth** using `crypto.timingSafeEqual` to prevent timing attacks (T-6-01)
- **`isWindowOpenOrMissed`** — compares current Bangkok time against template's `openDayOfWeek`/`openTime` and `eventDayOfWeek`/`eventTime`; handles catch-up (D-03)
- **`calcNextEventDate`** — calculates next event UTC timestamp in Bangkok timezone via `fromZonedTime`
- **`getWeekStart`** — UTC Sunday boundary for idempotency window check
- **Idempotency guard** (T-6-04) — SELECT before INSERT, skips if event already exists for `templateId` + week range
- **LINE Flex Message** posted via `lineClient.pushMessage`; message ID stored on event; push errors are caught and logged (non-fatal)

`apps/api/src/index.ts` — `cronRoutes` added inside `.group("/api", ...)`, mounted at `/api/cron/generate-occurrences`

### Task 2: Integration tests (d9dcb68)

`apps/api/src/__tests__/cron.test.ts`:

- 401 without Authorization header
- 401 with wrong bearer token
- Generates occurrence (verifies `templateId` set and `status=open`)
- Skips template with closed window
- Idempotency: second call produces no duplicate
- Flex Message pushed to LINE group on generation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed generateEventTitle argument order**
- **Found during:** Task 1
- **Issue:** Plan's code called `generateEventTitle(tpl.venueName, eventDateUtc)` but actual signature is `(eventDate: Date, venueName: string)`
- **Fix:** Swapped arguments to `generateEventTitle(eventDateUtc, tpl.venueName)`
- **Files modified:** apps/api/src/routes/cron.ts
- **Commit:** a16b1bd

**2. [Rule 2 - Missing error handling] Wrapped LINE push in try/catch**
- **Found during:** Task 1
- **Issue:** Plan's code had no error handling on `lineClient.pushMessage`; a LINE API failure would abort occurrence creation
- **Fix:** Added `try/catch` around `lineClient.pushMessage` with `console.error` logging
- **Files modified:** apps/api/src/routes/cron.ts
- **Commit:** a16b1bd

## Threat Flags

None — all surfaces were accounted for in the plan's `<threat_model>`.

## Known Stubs

None.

## Self-Check: PASSED

Files:
- apps/api/src/routes/cron.ts — FOUND
- apps/api/src/__tests__/cron.test.ts — FOUND
- apps/api/src/index.ts (modified) — FOUND

Commits:
- a16b1bd — FOUND
- d9dcb68 — FOUND
