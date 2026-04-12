---
phase: 11-club-hub-events-list
plan: "02"
subsystem: web
tags: [liff, club-hub, events, next.js, client-component]
dependency_graph:
  requires: [11-01]
  provides: [LIFF club hub page at /(liff)/clubs/[id]]
  affects: [apps/web/app/(liff)/clubs/[id]/page.tsx]
tech_stack:
  added: []
  patterns: [useLiff auth gate, parallel Promise.all proxy fetch, Suspense + inner component pattern]
key_files:
  created:
    - apps/web/app/(liff)/clubs/[id]/page.tsx
  modified: []
decisions:
  - Register button links to /events/[id] (route group (liff) omits "liff" from URL path)
  - No quick-link navigation buttons in LIFF version — LIFF users have no admin navigation need
metrics:
  duration: ~5min
  completed: 2026-04-12
  tasks_completed: 1
  files_modified: 1
---

# Phase 11 Plan 02: LIFF Club Hub Summary

**One-liner:** Created LIFF club hub client component at /(liff)/clubs/[id] that fetches club data, schedule, and events via proxy API and renders an identical visual layout to the website hub without admin navigation.

## What Was Built

### Task 1: LIFF club hub client component

**`apps/web/app/(liff)/clubs/[id]/page.tsx`** — New "use client" file:
- `LiffClubHubPage` export wraps inner component in `<Suspense>` with centered `<Loader2>` fallback, matching `/(liff)/events/[id]/page.tsx` pattern
- `LiffClubHubInner` gated on `isReady && isLoggedIn` from `useLiff()`
- `useParams<{ id: string }>()` extracts `clubId`
- `useCallback` + `useEffect` fetches club, events, and event-templates in parallel via `Promise.all`
- Proxy URLs: `/api/proxy/clubs/${clubId}`, `/api/proxy/events?clubId=${clubId}`, `/api/proxy/event-templates?clubId=${clubId}`
- Loading/not-ready state: full-screen centered `Loader2` spinner
- Error state: "โหลดข้อมูลไม่สำเร็จ" heading + "ไม่สามารถโหลดอีเวนต์ได้ กรุณาลองใหม่อีกครั้ง" body
- Club header: name at `text-[28px] font-semibold`, role `Badge`, LINE link `Badge`
- `Separator` below header
- Weekly schedule section (hidden when no active templates): Card with "ตารางซ้อม" title, templates sorted by `eventDayOfWeek`, THAI_DAYS mapping
- Events section: "อีเวนต์ที่กำลังจะมาถึง" heading, `grid gap-4 md:grid-cols-2` layout
- Event cards: formatted date title, venue, h-2 rounded-full progress bar, fees row, register Button or "เต็มแล้ว" Badge
- Empty state: "ยังไม่มีอีเวนต์" when no events
- Register button `href="/events/${event.id}"` (LIFF route group, no "liff" in URL)
- No admin quick-link buttons (Members/Settings) — LIFF users don't need admin navigation

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired to live API proxy calls.

## Threat Flags

None — threat model mitigations T-11-04 and T-11-05 implemented as specified:
- All data fetched via `/api/proxy/*` which forwards session cookie
- `useLiff()` gates rendering on `isReady && isLoggedIn`; no data fetched until authenticated

## Commits

- `d0dc3d3` — feat(11-02): create LIFF club hub client component

## Self-Check: PASSED

- apps/web/app/(liff)/clubs/[id]/page.tsx — created with "use client", useLiff(), proxy fetches
- Commit d0dc3d3 exists
- `bun run check-types` passed (turbo reported 2 tasks successful)
