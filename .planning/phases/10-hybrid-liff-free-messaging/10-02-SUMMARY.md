---
phase: 10-hybrid-liff-free-messaging
plan: "02"
subsystem: api
tags: [flex-message, liff, registration, events, messaging-api]
dependency_graph:
  requires: []
  provides: [flexCard-in-response, conditional-pushMessage]
  affects: [apps/api/src/lib/repost-card.ts, apps/api/src/routes/registrations.ts, apps/api/src/routes/events.ts, apps/api/src/routes/event-templates.ts]
tech_stack:
  added: []
  patterns: [header-based conditional push, build-then-push separation]
key_files:
  created: []
  modified:
    - apps/api/src/lib/repost-card.ts
    - apps/api/src/routes/registrations.ts
    - apps/api/src/routes/events.ts
    - apps/api/src/routes/event-templates.ts
decisions:
  - "buildFlexCardData separated from repostFlexCard so routes can get card data without triggering push"
  - "x-liff-context header drives push vs return: absent/external = server push, any other value = return card for client sendMessages"
  - "lineMessageId stays null when card is sent via client sendMessages (no trackable ID from that flow)"
metrics:
  duration: 15min
  completed_date: "2026-04-12"
  tasks_completed: 2
  files_modified: 4
---

# Phase 10 Plan 02: Conditional pushMessage and flexCard in API Responses Summary

API routes now return Flex card JSON in responses and conditionally skip server-side pushMessage based on the `X-Liff-Context` request header, enabling client-side `sendMessages` for in-LINE actions while preserving server push for external browser and cron flows.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add buildFlexCardData to repost-card.ts and return flexCard from registration routes | dc8f5b6 | repost-card.ts, registrations.ts |
| 2 | Return flexCard from event creation and template routes, skip pushMessage when in-LINE | 849a7ec | events.ts, event-templates.ts |

## What Was Built

### repost-card.ts
- Extracted card-building logic into new exported `buildFlexCardData` function that returns `{ card, altText, club: { lineGroupId } } | null`
- `repostFlexCard` refactored to call `buildFlexCardData` internally — no duplication, existing callers unchanged

### registrations.ts
- POST and DELETE handlers now read `x-liff-context` header
- When header is absent or `"external"`: server calls pushMessage (existing behavior)
- When header is any other value (in-LINE): skip pushMessage, return `flexCard` in response body
- Response shapes: `{ id, registeredCount, flexCard }` (POST) and `{ registeredCount, flexCard }` (DELETE)

### events.ts
- POST handler reads `x-liff-context`
- Same conditional: external/absent = push + `flexCard: null` in response; in-LINE = skip push + `flexCard: <card>` in response
- `lineMessageId` remains null when skipping push (card sent via client sendMessages has no trackable server ID)

### event-templates.ts
- `create-now` handler applies same x-liff-context conditional pattern
- Cancel occurrence handler also applies the pattern, returning `flexCard` field in response

### cron.ts
- NOT modified — cron has no user context, always uses pushMessage unconditionally (D-07)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — threat model was reviewed; T-10-04 and T-10-05 both have `accept` dispositions with documented rationale.

## Self-Check: PASSED

- [x] repost-card.ts exports `buildFlexCardData` — confirmed via grep
- [x] registrations.ts reads `x-liff-context` and returns `flexCard` — confirmed via grep
- [x] events.ts reads `x-liff-context` and returns `flexCard` — confirmed via grep
- [x] event-templates.ts reads `x-liff-context` — confirmed via grep
- [x] Commits dc8f5b6 and 849a7ec exist in git log
- [x] No TS errors in modified source files
- [x] cron.ts unmodified
