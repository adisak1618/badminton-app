---
phase: 07-club-setup-ui-gaps
plan: 02
subsystem: web-ui
tags: [club-settings, line-group, dialog, toast]
dependency_graph:
  requires: [07-01]
  provides: [unlink-group-ui, toaster-web]
  affects: [apps/web/app/layout.tsx, apps/web/app/clubs/[id]/settings/page.tsx]
tech_stack:
  added: [sonner toast, shadcn Dialog]
  patterns: [controlled dialog with async confirm, fetch DELETE with toast feedback]
key_files:
  created: []
  modified:
    - apps/web/app/layout.tsx
    - apps/web/app/clubs/[id]/settings/page.tsx
decisions:
  - Toaster placed in root layout after main so it renders on all web pages
  - Dialog controlled via dialogOpen state to allow programmatic close after unlink
  - State refresh via re-fetch after successful unlink rather than optimistic update
metrics:
  duration: ~10m
  completed: 2026-04-11
---

# Phase 7 Plan 02: Unlink Group UI Summary

One-liner: Destructive Unlink Group flow with Dialog confirmation and sonner toast added to club settings; Toaster wired into root web layout.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Add Toaster to root layout and Unlink Group to settings page | e9f30d0 | Done |
| 2 | Human verify Phase 7 UI changes | — | Checkpoint (pending) |

## What Was Built

- `apps/web/app/layout.tsx`: Added `import { Toaster } from "@repo/ui/components/sonner"` and `<Toaster />` after `<main>` in body. Toast notifications now render on all web layout pages.
- `apps/web/app/clubs/[id]/settings/page.tsx`:
  - Added `lineGroupId: string | null` to Club interface
  - Added Dialog import from `@repo/ui/components/dialog`
  - Added `toast` from sonner
  - Added `unlinking` and `dialogOpen` state
  - Added `handleUnlink` async function: calls DELETE `/api/proxy/clubs/:id/link`, shows success/error toast, closes dialog, refreshes club state
  - Added conditional Unlink Group section below ClubForm — only renders when `club.lineGroupId` is truthy
  - Dialog has "Keep Group" (outline, closes dialog) and "Unlink Group" (destructive, triggers handleUnlink) buttons

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — Unlink Group button is conditionally rendered based on real `lineGroupId` data from API.

## Threat Flags

None — T-7-01 (elevation of privilege) is mitigated server-side via `requireClubRole` in club-link.ts. T-7-02 (CSRF) accepted per plan.

## Self-Check: PASSED

- apps/web/app/layout.tsx: contains Toaster import and component
- apps/web/app/clubs/[id]/settings/page.tsx: contains Unlink Group, DialogTitle, Keep Group, DELETE, toast.success
- Commit e9f30d0 exists
