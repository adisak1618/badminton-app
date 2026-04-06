---
phase: 02-club-setup
plan: 04
subsystem: api
tags: [line-bot, flex-message, webhook, elysia, bun, messaging-api]

# Dependency graph
requires:
  - phase: 02-club-setup plan 02
    provides: lineClient singleton, env with WEB_BASE_URL, webhook dispatcher with idempotency

provides:
  - Join event handler that sends Flex Message with club setup link when bot joins a group
  - Updated webhook dispatcher routing join events to handleJoinEvent
  - Integration tests for join event handling (mocked LINE client, mocked idempotency)

affects:
  - 02-club-setup plan 05 (group linking flow — setup link points to /clubs/link page)
  - Any plan wiring additional webhook event handlers

# Tech tracking
tech-stack:
  added: []
  patterns:
    - webhook event handler as named function in handlers/ subdirectory
    - mock.module for LINE SDK and idempotency in tests to avoid DB/network dependency
    - Shared test secret to handle singleton env module across test files in same Bun worker

key-files:
  created:
    - apps/api/src/webhook/handlers/join.ts
    - apps/api/src/__tests__/join-event.test.ts
  modified:
    - apps/api/src/webhook/line.ts
    - apps/api/src/__tests__/webhook.test.ts

key-decisions:
  - "Use replyMessage (free) not pushMessage for join event — replyToken available on join events"
  - "Mock both @line/bot-sdk and idempotency handler in tests to avoid DB/network dependency"
  - "Align test secrets across files — env module is a singleton cached on first import in Bun test runner"

patterns-established:
  - "Pattern: Webhook handler pattern — named async function accepting typed event, dispatched via switch/case in line.ts"
  - "Pattern: Test isolation — mock.module before beforeAll, align env vars across files in same process"

requirements-completed:
  - CLUB-02

# Metrics
duration: 15min
completed: 2026-04-06
---

# Phase 02 Plan 04: Bot Join Event Handler Summary

**LINE bot join handler sends Flex Message with /clubs/link?groupId CTA via replyMessage when added to a group**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-06T10:01:31Z
- **Completed:** 2026-04-06T10:16:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `handleJoinEvent` in `apps/api/src/webhook/handlers/join.ts` that sends a Flex Message bubble with a "Link to Club" CTA button pointing to `${WEB_BASE_URL}/clubs/link?groupId={groupId}`
- Wired join event dispatch into `apps/api/src/webhook/line.ts` via switch/case, preserving signature verification and idempotency
- Integration tests verify Flex Message type, replyToken, setup URL with groupId, and edge case with no groupId

## Task Commits

Each task was committed atomically:

1. **Task 1: Create join event handler with Flex Message** - `3b3b7da` (feat)
2. **Task 2: Wire join handler into webhook dispatcher and add integration test** - `3d8095b` (feat)

## Files Created/Modified
- `apps/api/src/webhook/handlers/join.ts` - Join event handler using replyMessage with Flex Message bubble
- `apps/api/src/webhook/line.ts` - Added switch/case dispatch with join event routing to handleJoinEvent
- `apps/api/src/__tests__/join-event.test.ts` - Integration tests with mocked LINE client and idempotency
- `apps/api/src/__tests__/webhook.test.ts` - Updated with idempotency mock and aligned test secrets

## Decisions Made
- Used `replyMessage` (free quota) instead of `pushMessage` — join events have a replyToken
- Mocked both `@line/bot-sdk` (MessagingApiClient) and the idempotency handler in tests to avoid requiring a real DB connection
- Aligned `LINE_CHANNEL_SECRET` test value across test files because Bun 1.1.29 runs test files in the same worker process, causing the env module singleton to cache the first secret value

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed cross-file test secret conflict in Bun test runner**
- **Found during:** Task 2 (integration test implementation)
- **Issue:** Bun 1.1.29 runs test files in the same worker process. The `env` module is a singleton cached on first import. `join-event.test.ts` loads with `LINE_CHANNEL_SECRET = "test-channel-secret-for-join-tests"`. When `webhook.test.ts` subsequently runs with a different secret, `validateSignature` still uses the cached value, causing 401s.
- **Fix:** Aligned `TEST_SECRET` in `webhook.test.ts` to match `join-event.test.ts`. Added `mock.module("@line/bot-sdk")` and idempotency mock to `webhook.test.ts` for consistency.
- **Files modified:** `apps/api/src/__tests__/webhook.test.ts`
- **Verification:** All 7 tests pass in full suite (`pnpm --filter api test`)
- **Committed in:** `3d8095b` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added idempotency mock to avoid DB dependency in tests**
- **Found during:** Task 2 (running tests)
- **Issue:** The plan's test code didn't mock the idempotency handler, which makes a real DB insert call. Tests failed with `NeonDbError: ConnectionRefused` using the local placeholder DATABASE_URL.
- **Fix:** Added `mock.module("../webhook/handlers/idempotency", ...)` in both join-event.test.ts and webhook.test.ts to bypass DB calls, running the handler directly.
- **Files modified:** `apps/api/src/__tests__/join-event.test.ts`, `apps/api/src/__tests__/webhook.test.ts`
- **Verification:** All tests pass without DB connection
- **Committed in:** `3d8095b` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered
- Bun 1.1.29 shares module cache across test files in same run — env singleton and mock.module behavior requires careful test ordering and consistent env values

## User Setup Required

**External services require manual configuration before the join handler can send real Flex Messages:**

- `LINE_CHANNEL_ACCESS_TOKEN` — from LINE Developers Console -> Messaging API channel -> Channel access token (long-lived)
- `WEB_BASE_URL` — Your deployed web app URL (e.g., `https://yourdomain.com`)
- Ensure Messaging API and Login channels are under the **same Provider** in LINE Developers Console

## Next Phase Readiness
- Bot join event handler is complete — when bot is added to a group, it immediately sends a Flex Message with the club setup link
- The `/clubs/link?groupId=` page (Plan 02-03) receives the groupId from this CTA
- Next: verify end-to-end flow with real LINE bot and deployed web app

## Self-Check: PASSED

- FOUND: apps/api/src/webhook/handlers/join.ts
- FOUND: apps/api/src/webhook/line.ts
- FOUND: apps/api/src/__tests__/join-event.test.ts
- FOUND: .planning/phases/02-club-setup/02-04-SUMMARY.md
- FOUND commit: 3b3b7da (feat: create join event handler)
- FOUND commit: 3d8095b (feat: wire join handler and add integration test)

---
*Phase: 02-club-setup*
*Completed: 2026-04-06*
