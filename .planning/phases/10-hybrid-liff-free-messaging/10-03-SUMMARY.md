---
phase: 10-hybrid-liff-free-messaging
plan: "03"
subsystem: liff
tags: [liff, sendMessages, flex-message, registration, events]
dependency_graph:
  requires: [10-01, 10-02]
  provides: [client-sendMessages, liff-context-header]
  affects:
    - apps/web/lib/liff-messaging.ts
    - apps/web/app/(liff)/events/[id]/page.tsx
    - apps/web/app/(liff)/events/create/page.tsx
    - apps/web/app/(liff)/events/templates/[id]/edit/page.tsx
tech_stack:
  added: []
  patterns: [liff-sendMessages, liff-context-header, silent-failure]
key_files:
  created:
    - apps/web/lib/liff-messaging.ts
  modified:
    - apps/web/app/(liff)/events/[id]/page.tsx
    - apps/web/app/(liff)/events/create/page.tsx
    - apps/web/app/(liff)/events/templates/[id]/edit/page.tsx
decisions:
  - "trySendMessages helper centralises all sendMessages logic including context detection and silent failure"
  - "getLiffContextHeader sends X-Liff-Context: in-line for group/room/utou contexts, external otherwise"
  - "Admin remove (handleRemoveMember) also gets sendMessages integration — same pattern as cancel"
metrics:
  duration: 15min
  completed_date: "2026-04-12"
  tasks_completed: 2
  files_modified: 4
---

# Phase 10 Plan 03: Client-side sendMessages Integration Summary

Wired client-side `liff.sendMessages()` via shared helper into all user-initiated LIFF actions (register, cancel, admin remove, create event, cancel occurrence) so Flex cards are sent for free inside LINE. External browser sends `X-Liff-Context: external` header so server falls back to pushMessage.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add sendMessages to register/cancel actions on event page | 6057f70 | liff-messaging.ts, events/[id]/page.tsx |
| 2 | Add sendMessages to event creation and template pages | 9b0f731 | events/create/page.tsx, templates/[id]/edit/page.tsx |

## What Was Built

### apps/web/lib/liff-messaging.ts (new)
- `getLiffContextHeader(liff)`: returns `{ "X-Liff-Context": "in-line" }` for group/room/utou contexts, `{ "X-Liff-Context": "external" }` otherwise
- `trySendMessages(liff, flexCard)`: checks context, calls `liff.sendMessages([flexCard])` only inside LINE, silently catches errors with `console.error("sendMessages failed:", err)`

### apps/web/app/(liff)/events/[id]/page.tsx
- Register (POST /registrations): adds `getLiffContextHeader`, parses `flexCard` from 201 response, calls `trySendMessages`
- Cancel (DELETE /registrations/:id): same pattern
- Admin remove (DELETE /registrations/:id): same pattern

### apps/web/app/(liff)/events/create/page.tsx
- Event creation (POST /events): adds `getLiffContextHeader`, parses `flexCard` from response, calls `trySendMessages` before `closeWindow`

### apps/web/app/(liff)/events/templates/[id]/edit/page.tsx
- Cancel occurrence (PATCH .../cancel): adds `getLiffContextHeader`, parses `flexCard` from response, calls `trySendMessages`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing coverage] Admin remove handler also wired**
- **Found during:** Task 1
- **Issue:** Plan listed "modify admin remove handler if present" — it is present in handleRemoveMember
- **Fix:** Applied same getLiffContextHeader + trySendMessages pattern to handleRemoveMember
- **Files modified:** apps/web/app/(liff)/events/[id]/page.tsx
- **Commit:** 6057f70

## Known Stubs

None.

## Threat Flags

None — T-10-06 and T-10-07 both have `accept` dispositions; no new threat surface introduced.

## Self-Check: PASSED

- [x] apps/web/lib/liff-messaging.ts: FOUND
- [x] events/[id]/page.tsx contains trySendMessages (4 occurrences): CONFIRMED
- [x] events/[id]/page.tsx contains getLiffContextHeader: CONFIRMED
- [x] events/create/page.tsx contains trySendMessages: CONFIRMED
- [x] events/templates/[id]/edit/page.tsx contains trySendMessages: CONFIRMED
- [x] Commits 6057f70 and 9b0f731: FOUND
- [x] Task 3 is checkpoint:human-verify — stopped correctly
