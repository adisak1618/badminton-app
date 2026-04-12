---
phase: 11-club-hub-events-list
plan: "01"
subsystem: api + web
tags: [events, club-hub, event-templates, drizzle, next.js]
dependency_graph:
  requires: []
  provides: [GET /events list endpoint, club hub page with schedule and events]
  affects: [apps/api/src/routes/events.ts, apps/api/src/routes/event-templates.ts, apps/web/app/clubs/[id]/page.tsx]
tech_stack:
  added: []
  patterns: [parallel Promise.all data fetching, Drizzle leftJoin with count, requireClubRole role expansion]
key_files:
  created: []
  modified:
    - apps/api/src/routes/events.ts
    - apps/api/src/routes/event-templates.ts
    - apps/web/app/clubs/[id]/page.tsx
decisions:
  - All club members (owner/admin/member) can view events and templates — per D-06
  - Quick-links for Members and Settings are admin/owner only; Events and Schedule links are visible to all members
metrics:
  duration: ~5min
  completed: 2026-04-12
  tasks_completed: 2
  files_modified: 3
---

# Phase 11 Plan 01: Club Hub Events List Summary

**One-liner:** Added GET /events list endpoint with registeredCount and transformed club hub page into a schedule + events dashboard with quick-links navigation.

## What Was Built

### Task 1: API changes

**`apps/api/src/routes/events.ts`** — Added new GET `/` handler before `/club-defaults`:
- Accepts `clubId` (uuid) query param
- Calls `requireClubRole` with `["owner", "admin", "member"]` (all club members)
- Queries upcoming open events (`status = "open"`, `eventDate >= now`) with `registeredCount` via `leftJoin(registrations)` + `count(registrations.id)`
- Results ordered by `eventDate` ascending
- Added `and, gte, asc` imports from drizzle-orm

**`apps/api/src/routes/event-templates.ts`** — Relaxed GET `/` access:
- Changed `["owner", "admin"]` to `["owner", "admin", "member"]` on the GET handler

### Task 2: Web hub page

**`apps/web/app/clubs/[id]/page.tsx`** — Complete rewrite:
- Parallel `Promise.all` fetch for club, events list, and templates
- Club header with name (`text-[28px]`), role Badge, LINE link status Badge
- Quick-links navigation row: Events and Schedule (all members), Members and Settings (admin/owner only)
- Weekly schedule section (`ตารางซ้อม`) hidden when no active templates; shows day/time/venue per template sorted by `eventDayOfWeek`
- Upcoming events grid (`md:grid-cols-2`) with progress bar, fee info, registeredCount/maxPlayers, and Register/Full button
- Empty state: "ยังไม่มีอีเวนต์" when no upcoming events
- Removed old defaults cards (Max Players, Shuttlecock Fee, Court Fee, Home Court) and "Club Defaults" card

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired to live API calls.

## Threat Flags

None — threat model mitigations T-11-01, T-11-02, T-11-03 implemented as specified:
- `requireClubRole` on GET /events enforces club membership
- `requireClubRole` on GET /event-templates still blocks non-members
- `t.String({ format: "uuid" })` validates clubId format

## Commits

- `ad84683` — feat(11-01): add GET /events list endpoint and relax template member access
- `500b9bf` — feat(11-01): transform club hub page with schedule, events, and quick-links

## Self-Check: PASSED

- apps/api/src/routes/events.ts — modified with GET / handler
- apps/api/src/routes/event-templates.ts — modified with member role
- apps/web/app/clubs/[id]/page.tsx — rewritten with hub layout
- Both commits exist in git log
