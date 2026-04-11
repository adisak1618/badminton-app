---
phase: 07-club-setup-ui-gaps
plan: "01"
subsystem: web-ui
tags: [club, homeCourtLocation, ui, typescript]
dependency_graph:
  requires: []
  provides: [homeCourtLocation-display-in-club-detail, homeCourtLocation-in-settings-submit]
  affects: [apps/web/app/clubs/[id]/page.tsx, apps/web/app/clubs/[id]/settings/page.tsx]
tech_stack:
  added: []
  patterns: [4-card stat grid, null-safe display with fallback]
key_files:
  created: []
  modified:
    - apps/web/app/clubs/[id]/page.tsx
    - apps/web/app/clubs/[id]/settings/page.tsx
decisions:
  - "Used md:grid-cols-2 lg:grid-cols-4 to handle 4 stat cards responsively without breaking mobile layout"
  - "homeCourtLocation?: string (optional) in handleSubmit to match ClubForm output where field may be omitted"
metrics:
  duration: 5min
  completed_date: "2026-04-11"
  tasks_completed: 2
  files_modified: 2
---

# Phase 07 Plan 01: homeCourtLocation Club UI Summary

**One-liner:** Added homeCourtLocation as a 4th stat card in club detail page with null fallback, and fixed TypeScript type mismatch in settings handleSubmit.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add homeCourtLocation card to club detail page | 4f7d459 | apps/web/app/clubs/[id]/page.tsx |
| 2 | Fix settings page handleSubmit type to include homeCourtLocation | 89cf89f | apps/web/app/clubs/[id]/settings/page.tsx |

## What Was Built

- Club detail page now shows 4 stat cards: Max Players, Shuttlecock Fee, Court Fee, Home Court
- Grid changed from `md:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-4` for proper responsive layout
- Null/missing homeCourtLocation displays "Not set" in muted foreground style (per UI-SPEC D-05)
- Settings page `handleSubmit` now includes `homeCourtLocation?: string` — no TypeScript error when ClubForm submits the field

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- apps/web/app/clubs/[id]/page.tsx: FOUND with homeCourtLocation, lg:grid-cols-4, Home Court card, "Not set" fallback
- apps/web/app/clubs/[id]/settings/page.tsx: FOUND with homeCourtLocation?: string in handleSubmit
- Commits 4f7d459 and 89cf89f: exist in git log
- `npx tsc --noEmit`: no errors
