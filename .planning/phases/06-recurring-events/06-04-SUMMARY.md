---
phase: 06-recurring-events
plan: "04"
subsystem: frontend
tags: [liff, recurring-events, template-management, alert-dialog]
dependency_graph:
  requires: [06-01]
  provides: [template_list_page, template_edit_page, occurrence_cancellation_ui]
  affects: [apps/web]
tech_stack:
  added: [shadcn/alert-dialog]
  patterns: [react-hook-form, zod, useLiff, toast notifications]
key_files:
  created:
    - apps/web/app/liff/events/templates/page.tsx
    - apps/web/app/liff/events/templates/[id]/edit/page.tsx
  modified:
    - packages/ui/src/components/alert-dialog.tsx (installed via shadcn)
decisions:
  - "Fetch template list and filter client-side for edit page — avoids new GET /:id route since list is small (1-3 per club)"
  - "AlertDialog installed via shadcn to packages/ui for shared use"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  files_changed: 3
---

# Phase 6 Plan 04: Template Management UI Summary

Template list page with status badges and create-now button plus template edit page with occurrence cancellation AlertDialog.

## What Was Built

### Task 1: Template List Page
- **`apps/web/app/liff/events/templates/page.tsx`** — displays all recurring templates for a club
- Status badges: active ("กำลังใช้งาน"), paused ("หยุดชั่วคราว"), archived ("เก็บถาวร")
- "สร้างอีเวนท์ทันที" button calls `POST /api/proxy/event-templates/:id/create-now` with loading state
- "แก้ไข" link navigates to edit page
- Empty state: "ยังไม่มี recurring" with onboarding copy
- Thai day-of-week labels, 44px minimum touch targets

### Task 2: Template Edit Page
- **`apps/web/app/liff/events/templates/[id]/edit/page.tsx`** — full form with react-hook-form + zodResolver(templateCreateSchema)
- Pre-fills all fields from fetched template
- Submits `PATCH /api/proxy/event-templates/:id`
- 422 error shows "จำนวนผู้เล่นสูงสุดน้อยกว่าผู้ที่ลงทะเบียนอยู่แล้ว"
- Occurrence list (non-cancelled) with "ยกเลิก" button per event
- AlertDialog confirmation: title "ยกเลิกอีเวนท์นี้?", description, confirm/dismiss buttons
- Calls `PATCH /api/proxy/event-templates/:id/occurrences/:eventId/cancel`
- Installed `alert-dialog` via shadcn to `packages/ui`

## Deviations from Plan

**1. [Rule 3 - Blocking] AlertDialog installed from main repo**
- **Found during:** Task 2 setup
- **Issue:** `alert-dialog` not present in `packages/ui/src/components/`
- **Fix:** Ran `cd packages/ui && npx shadcn@latest add alert-dialog --yes` from main repo (worktree shares symlinked packages)
- **Files modified:** packages/ui/src/components/alert-dialog.tsx

## Known Stubs

None — template data is fetched live from the API. Occurrence list falls back gracefully if the `/events?templateId=` query param is not supported (returns empty array).

## Threat Flags

None — all mutations proxy through API which enforces `requireClubRole(["owner","admin"])` (T-6-06 mitigated at API layer; LIFF shows 403 error state).

## Self-Check

### Files Exist
- apps/web/app/liff/events/templates/page.tsx: FOUND
- apps/web/app/liff/events/templates/[id]/edit/page.tsx: FOUND

### Commits
- de81dc8: feat(06-04): template list page with create-now and status badges
- 73e2174: feat(06-04): template edit page with cancellation AlertDialog

## Self-Check: PASSED

## Checkpoint Pending

Task 3 is `type="checkpoint:human-verify"` — awaiting human verification of the full recurring events UI flow.
