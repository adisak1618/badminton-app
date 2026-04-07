---
phase: 04-event-creation
plan: 01
subsystem: api
tags: [line-bot, webhook, elysia, drizzle, bun, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Elysia webhook router, lineClient singleton, DB schema (clubs, clubMembers, members)
  - phase: 02-club-setup
    provides: clubs table with lineGroupId, club_members table with roles
provides:
  - Text-message webhook handler that parses /create /new สร้าง สร้างอีเวนท์ commands
  - Single-JOIN role check (groupId -> club -> member -> role)
  - LIFF_ID env var added to API validation
  - Unit tests for all 4 command aliases + silent-ignore edge cases
affects:
  - 04-02 (event CRUD API uses the same club role check pattern)
  - 04-03 (LIFF event creation form is the destination of the LIFF URL sent here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single JOIN query to resolve groupId -> clubId + role in one DB round trip (avoids N+1)
    - TDD pattern: RED (failing tests) -> GREEN (implementation) -> verify no regressions

key-files:
  created:
    - apps/api/src/webhook/handlers/text-message.ts
    - apps/api/src/__tests__/text-message.test.ts
  modified:
    - apps/api/src/env.ts
    - apps/api/src/webhook/line.ts

key-decisions:
  - "LIFF deep-link format: https://liff.line.me/{LIFF_ID}?path=/liff/events/create&clubId={clubId}"
  - "D-03 silent ignore: non-admin/non-member senders get no reply — no error message, keeps group chat clean"
  - "Single JOIN query used instead of 3 sequential queries — resolves T-04-04 DoS threat"

patterns-established:
  - "Text command handler: trim() -> CREATE_COMMANDS.includes() -> single JOIN -> role guard -> replyMessage"
  - "DB mock pattern in bun tests: mock.module('@repo/db') with controllable dbMockResult array"

requirements-completed: [BOT-03]

# Metrics
duration: 20min
completed: 2026-04-08
---

# Phase 04 Plan 01: Text-Message Webhook Handler Summary

**Webhook text-message handler routing /create /new สร้าง สร้างอีเวนท์ commands to a LIFF event-creation deep-link, with single-JOIN role guard that silently ignores non-admins (D-03)**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-08T07:00:00Z
- **Completed:** 2026-04-08T07:20:00Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Created `text-message.ts` handler with all 4 command aliases (English and Thai)
- Implemented single JOIN query: clubs -> clubMembers -> members (resolves T-04-04, avoids N+1)
- Role guard silently ignores non-admin/non-member/unlinked-group senders (D-03)
- Added `LIFF_ID` env var to API validation in `env.ts`
- Wired `case "message"` in webhook router to `handleTextMessage`
- All 10 unit tests pass using mocked DB pattern (TDD: RED then GREEN)

## Task Commits

Each task was committed atomically:

1. **Task 1: Text-message webhook handler with TDD** - `33e43d6` (feat)

**Plan metadata:** (pending docs commit)

_Note: TDD task had RED (tests written first, failing), then GREEN (implementation, all pass)_

## Files Created/Modified

- `apps/api/src/webhook/handlers/text-message.ts` - Command parser + single-JOIN role check + replyMessage with LIFF URL
- `apps/api/src/__tests__/text-message.test.ts` - 10 unit tests covering all 4 aliases, silent-ignore cases, trim behavior
- `apps/api/src/env.ts` - Added `LIFF_ID: z.string().min(1)` to server env validation
- `apps/api/src/webhook/line.ts` - Added `import { handleTextMessage }` and `case "message":` to switch

## Decisions Made

- LIFF deep-link URL format uses `?path=` query param: `https://liff.line.me/{LIFF_ID}?path=/liff/events/create&clubId={clubId}` — standard LIFF path routing per RESEARCH.md Pattern 3
- D-03 silent ignore implemented: no reply sent to non-admins — keeps LINE group chat clean and doesn't reveal command existence to non-admins
- Single JOIN query (clubs -> clubMembers -> members) resolves T-04-04 DoS mitigation — one DB round trip instead of 3 sequential lookups

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing integration test failures (club-members, LIFF profile, club CRUD) were present before this plan and are unrelated — they require a live DB connection. These are out of scope for this plan.

## User Setup Required

`LIFF_ID` env var must be set before the bot handler can reply with LIFF links. Obtain the LIFF ID from the LINE Developers Console (under the LIFF tab of your LINE Login channel) and add it to `apps/api/.env.local`:

```
LIFF_ID=<your-liff-id-here>
```

## Next Phase Readiness

- BOT-03 text command handler is complete — admins can trigger event creation from LINE group chat
- The LIFF URL targets `/liff/events/create?clubId=...` — Phase 04-03 must implement this page
- Phase 04-02 (event CRUD API) can use the same single-JOIN role check pattern as reference

---
*Phase: 04-event-creation*
*Completed: 2026-04-08*
