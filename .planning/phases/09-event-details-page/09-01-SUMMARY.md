---
phase: 09-event-details-page
plan: 01
subsystem: ui
tags: [nextjs, liff, react, redirect]

requires:
  - phase: 05-registration-loop
    provides: Registration page component, proxy API routes
provides:
  - Unified event details + registration page at /liff/events/[id]
  - 301 redirect from old /register path
  - Cancelled event state handling
affects: [09-event-details-page]

tech-stack:
  added: []
  patterns: [next.js redirects config for route migration]

key-files:
  created:
    - apps/web/app/liff/events/[id]/page.tsx
  modified:
    - apps/web/next.config.js

key-decisions:
  - "Hide full badge when event is cancelled to avoid showing both badges"

patterns-established:
  - "Route migration pattern: move page, add permanent redirect in next.config.js"

requirements-completed: [BOT-01]

duration: 3min
completed: 2026-04-12
---

# Phase 9 Plan 1: Route Migration and Cancelled State Summary

**Moved register page to /liff/events/[id] with cancelled event badge, disabled button, venue maps link, and 301 redirect from old /register path**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T05:28:00Z
- **Completed:** 2026-04-12T05:31:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Unified event details and registration page at /liff/events/[id]
- Cancelled events display badge and disabled button with correct Thai copy
- Venue Google Maps link shown when venueMapsUrl is present
- Old /register URLs permanently redirect to parent route

## Task Commits

Each task was committed atomically:

1. **Task 1: Move register page to parent route and add cancelled state** - `2ced55b` (feat)
2. **Task 2: Add 301 redirect for old /register path** - `a719e5a` (feat)

## Files Created/Modified
- `apps/web/app/liff/events/[id]/page.tsx` - Unified event details + registration page with cancelled state handling and venue maps link
- `apps/web/next.config.js` - 301 redirect from /liff/events/:id/register to /liff/events/:id

## Decisions Made
- Hide full badge when event is cancelled (avoid showing both "full" and "cancelled" badges simultaneously)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Page route is live, ready for Plan 02 (API integration enhancements)
- Flex Message card URLs will work with both old /register and new parent paths

---
*Phase: 09-event-details-page*
*Completed: 2026-04-12*
