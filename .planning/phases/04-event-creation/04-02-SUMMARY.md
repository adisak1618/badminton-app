---
phase: 04-event-creation
plan: 02
subsystem: api
tags: [elysia, drizzle, line-messaging-api, flex-message, bun-test, thai-locale]

# Dependency graph
requires:
  - phase: 03-member-identity
    provides: authMiddleware, SessionData, requireClubRole, members/club-members schema
  - phase: 02-club-setup
    provides: clubs schema with lineGroupId and default fee fields
  - phase: 04-01
    provides: LIFF_ID env var in env.ts, webhook text-message handler
provides:
  - POST /api/events — creates event with status=open and pushes Flex Message card to LINE group
  - GET /api/events/club-defaults — returns club defaults for form pre-fill
  - buildEventFlexCard — Flex Message bubble builder with Thai date, fees, spots count, CTA buttons
  - generateEventTitle — Thai short date + venue name auto-title generator
  - unprocessableEntity — ApiError factory for 422 responses
affects: [04-03-liff-form, 05-registration, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Elysia plugin with prefix and authMiddleware for new route groups
    - pushMessage wrapped in try/catch — event saved even if LINE push fails
    - lineMessageId stored via separate UPDATE after INSERT (allows null on push failure)
    - Intl.DateTimeFormat("th-TH") for Thai locale date formatting (CE calendar)
    - mockImplementationOnce with Promise.reject for testing async failures in bun:test

key-files:
  created:
    - apps/api/src/routes/events.ts
    - apps/api/src/lib/flex-messages.ts
    - apps/api/src/__tests__/events.test.ts
  modified:
    - apps/api/src/lib/errors.ts
    - apps/api/src/index.ts

key-decisions:
  - "unprocessableEntity returns 422 when club.lineGroupId is null — admin must link group before creating events"
  - "pushMessage failure does NOT rollback event — event saved, lineMessageId stays null (Pitfall 3 from RESEARCH.md)"
  - "status set to open explicitly on insert — overrides schema default of draft per D-12"
  - "Auto-title uses th-TH CE locale (not Buddhist Era) — year omitted so era distinction is invisible"
  - "mockImplementationOnce(() => Promise.reject(...)) instead of mockRejectedValueOnce() — avoids bun:test unhandled rejection false positive"

patterns-established:
  - "Pattern: POST endpoint guard order: authMiddleware -> member lookup -> requireClubRole -> club lookup -> 422 check -> insert -> side-effect"
  - "Pattern: Error handler returns text body for ApiError (not JSON object) — tests should use res.text() not res.json() for error assertions"

requirements-completed: [EVNT-01, EVNT-02, BOT-01]

# Metrics
duration: 45min
completed: 2026-04-08
---

# Phase 4 Plan 02: Event API Routes and Flex Message Card Summary

**Elysia event CRUD plugin with POST /api/events (pushes Flex Message to LINE group) and GET /api/events/club-defaults, backed by 10 passing integration tests**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08
- **Tasks:** 1 (TDD)
- **Files modified:** 5 (2 new routes/libs, 1 test, 2 modified)

## Accomplishments

- POST /api/events: creates event with status=open, calls lineClient.pushMessage with Flex bubble, stores lineMessageId; event saved even if push fails
- GET /api/events/club-defaults: returns club's homeCourtLocation, defaultShuttlecockFee, defaultCourtFee, defaultMaxPlayers for admin/owner pre-fill
- buildEventFlexCard: constructs Flex Message bubble with Thai-formatted date, "ลูกขน X฿ / สนาม Y฿" fee format, "0/max คน" spots count, tappable venue link, and two CTA buttons (ลงทะเบียน / รายละเอียด)
- generateEventTitle: auto-generates "แบด {day} {month} - {venue}" using Intl.DateTimeFormat th-TH locale
- unprocessableEntity ApiError helper for 422 responses

## Task Commits

1. **Task 1: Event routes, Flex card builder, tests** - `3ef9c4c` (feat)

## Files Created/Modified

- `apps/api/src/routes/events.ts` — Elysia plugin: POST /events and GET /events/club-defaults
- `apps/api/src/lib/flex-messages.ts` — buildEventFlexCard and generateEventTitle exports
- `apps/api/src/__tests__/events.test.ts` — 10 integration tests covering EVNT-01, EVNT-02, BOT-01
- `apps/api/src/lib/errors.ts` — added unprocessableEntity helper
- `apps/api/src/index.ts` — registered eventRoutes in /api group

## Decisions Made

- Event goes directly to `open` status on creation — no draft workflow per D-12
- pushMessage failure is caught and logged but does not rollback the event — lineMessageId stored as null
- Club's lineGroupId null check throws 422 with Thai error message before any pushMessage attempt
- LIFF URLs built from env.LIFF_ID (added by plan 04-01): `https://liff.line.me/{LIFF_ID}/liff/events/{id}/register` and `.../liff/events/{id}`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used mockImplementationOnce instead of mockRejectedValueOnce**
- **Found during:** Task 1 (writing the "pushMessage throws" test)
- **Issue:** bun:test's `mockRejectedValueOnce` caused an unhandled rejection error in the test runner before the test body ran
- **Fix:** Replaced with `mockImplementationOnce(() => Promise.reject(new Error(...)))` which avoids the false positive
- **Files modified:** apps/api/src/__tests__/events.test.ts
- **Verification:** Test passes — event is created, lineMessageId is null
- **Committed in:** 3ef9c4c

**2. [Rule 1 - Bug] Used res.text() instead of res.json() for 422 error assertion**
- **Found during:** Task 1 (422 test for null lineGroupId)
- **Issue:** Elysia's error handler returns the error message as plain text body, not JSON — `res.json()` throws SyntaxError
- **Fix:** Changed assertion to `const text = await res.text(); expect(text).toContain("LINE")`
- **Files modified:** apps/api/src/__tests__/events.test.ts
- **Verification:** 422 test passes
- **Committed in:** 3ef9c4c

---

**Total deviations:** 2 auto-fixed (1 blocking bun:test quirk, 1 runtime behavior bug)
**Impact on plan:** Both fixes were necessary for correct test behavior. No scope creep.

## Issues Encountered

- Full test suite has pre-existing ordering failures (23→24 pass after my changes, club-members.test.ts fails when clubs.test.ts runs first due to shared DB state). These predate this plan and are not regressions.
- LIFF_ID was empty in .env.local causing env validation failure; added placeholder value `placeholder-liff-id` so the env var satisfies `z.string().min(1)` when running tests without LIFF_ID set in environment.

## Known Stubs

None — all fields in POST /api/events response are wired to real DB values.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: input-validation | apps/api/src/routes/events.ts | eventDate accepted as raw ISO string and parsed client-side — Thai timezone offset (+07:00) must be included by caller; server trusts the offset without validation. Mitigated by Elysia t.String() ensuring non-empty, and Date constructor accepting ISO format. |

## Next Phase Readiness

- Event creation API complete — plan 04-03 (LIFF form) can POST to `/api/events` and GET `/api/events/club-defaults`
- LIFF URLs in Flex card point to `/liff/events/{id}/register` and `/liff/events/{id}` — these pages are Phase 5 scope
- lineMessageId stored for future BOT-02 (repost with updated count) in Phase 5

---
*Phase: 04-event-creation*
*Completed: 2026-04-08*
