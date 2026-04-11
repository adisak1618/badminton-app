---
phase: 09-event-details-page
plan: 02
subsystem: api
tags: [flex-message, line-bot, liff]

requires:
  - phase: 05-registration-loop
    provides: Flex card builders and repost-card logic
provides:
  - Single CTA button in both Flex card builders
  - Notification body text in repost cards
  - All registerLiffUrl values point to /events/{id} without /register
affects: [09-event-details-page]

tech-stack:
  added: []
  patterns: [context-aware CTA button based on event state]

key-files:
  created: []
  modified:
    - apps/api/src/lib/flex-messages.ts
    - apps/api/src/lib/repost-card.ts
    - apps/api/src/routes/events.ts
    - apps/api/src/routes/cron.ts
    - apps/api/src/routes/event-templates.ts

key-decisions:
  - "Keep both registerLiffUrl and detailsLiffUrl fields (same value) to minimize interface churn"

patterns-established:
  - "Context-aware CTA: isOpenWithSlots drives button label and style in Flex cards"

requirements-completed: [BOT-01]

duration: 2min
completed: 2026-04-12
---

# Phase 9 Plan 2: Flex Card Single CTA and Notification Line Summary

**Single context-aware CTA button on Flex cards with notification body text showing actor and remaining seats**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-12T06:27:27Z
- **Completed:** 2026-04-12T06:29:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- buildEventFlexCard footer reduced from 2 buttons to 1 "Register" button
- buildRepostFlexCard footer uses context-aware label (Register vs Details) based on event state
- Notification body text added to repost card body for all 5 action types
- All registerLiffUrl references across 4 files updated to drop /register suffix

## Task Commits

Each task was committed atomically:

1. **Task 1: Single CTA button + notification line in Flex card builders** - `748bbe6` (feat)
2. **Task 2: Update repost-card.ts and route files for new URLs and notification text** - `258af64` (feat)

## Files Created/Modified
- `apps/api/src/lib/flex-messages.ts` - Single CTA button in both builders, notification line in repost card body
- `apps/api/src/lib/repost-card.ts` - notificationBodyText computation, URL without /register
- `apps/api/src/routes/events.ts` - registerLiffUrl without /register
- `apps/api/src/routes/cron.ts` - registerLiffUrl without /register
- `apps/api/src/routes/event-templates.ts` - registerLiffUrl without /register

## Decisions Made
- Kept both registerLiffUrl and detailsLiffUrl fields pointing to same URL to minimize interface changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Flex cards ready for single-page event details flow
- Plan 01 (page move + redirect) can proceed independently

---
*Phase: 09-event-details-page*
*Completed: 2026-04-12*
