---
phase: 06-recurring-events
plan: "03"
subsystem: frontend
tags: [liff, recurring-events, form, shadcn, switch, select]
dependency_graph:
  requires: ["06-01"]
  provides: [recurring_toggle_form, template_create_ui]
  affects: [apps/web/app/liff/events/create/page.tsx, apps/web/lib/validations/event.ts]
tech_stack:
  added: [shadcn/switch]
  patterns: [react-hook-form, zod-validation, conditional-rendering, shadcn-select]
key_files:
  created:
    - packages/ui/src/components/switch.tsx
  modified:
    - apps/web/app/liff/events/create/page.tsx
    - apps/web/lib/validations/event.ts
decisions:
  - "Used local useState for recurring fields (eventDayOfWeek, eventTime etc.) instead of react-hook-form register, since Select component value is not a native input"
  - "Conditional rendering (not hidden) for eventDate field — shown only when isRecurring is false, recurring fields shown only when true"
  - "Validation splits into two paths: eventCreateSchema for one-time, templateCreateSchema.safeParse for recurring with inline error toast"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-11"
  tasks_completed: 1
  files_changed: 3
---

# Phase 6 Plan 03: Recurring Toggle on Event Creation Form Summary

LIFF event creation form extended with a recurring toggle (Switch) that reveals day-of-week + time schedule fields and routes submit to POST /api/proxy/event-templates.

## What Was Built

### Task 1: Install Switch component + extend event creation form with recurring toggle

- **Switch shadcn component** installed to `packages/ui/src/components/switch.tsx` via `npx shadcn@latest add switch`
- **`isRecurring` state** added to `LiffEventCreateForm` — default OFF
- **Recurring toggle UI** added after title field: Switch with label "สร้างซ้ำทุกสัปดาห์" and helper text "ระบบจะสร้างอีเวนท์ทุกสัปดาห์โดยอัตโนมัติ"
- **`eventDate` field** conditionally rendered — hidden when `isRecurring` is true, shown when false (one-time path unchanged)
- **4 recurring schedule fields** rendered when `isRecurring` is true:
  - Event day of week: Select with Thai labels Monday-first (วันจันทร์…วันอาทิตย์, value 0-6)
  - Event time: Input type="time"
  - Registration open day: Select with same Thai options
  - Registration open time: Input type="time"
- **Submit handler** branched: recurring path validates with `templateCreateSchema.safeParse`, POSTs to `/api/proxy/event-templates`; one-time path unchanged
- **`templateCreateSchema`** and `TemplateCreateFormData` type added to `apps/web/lib/validations/event.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — form validates `eventDayOfWeek` and `openDayOfWeek` as integer 0-6 via `templateCreateSchema` before submit, satisfying T-6-05 mitigation.

## Self-Check

### Files Exist
- apps/web/app/liff/events/create/page.tsx: FOUND
- apps/web/lib/validations/event.ts: FOUND
- packages/ui/src/components/switch.tsx: FOUND
- packages/ui/src/components/select.tsx: FOUND

### Commits
- d14633c: feat(06-03): extend event creation form with recurring toggle

## Self-Check: PASSED
