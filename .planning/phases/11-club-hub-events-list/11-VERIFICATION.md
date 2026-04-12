---
phase: 11-club-hub-events-list
verified: 2026-04-12T00:00:00Z
status: human_needed
score: 9/9
overrides_applied: 0
human_verification:
  - test: "Open /clubs/[id] in browser as a member — confirm weekly schedule section appears above events list and quick-links row renders Events, Schedule, Members (admin only), Settings (admin only)"
    expected: "Schedule section visible with Thai day names, time, venue. Quick-links navigation row with min-h-[44px] buttons. Members and Settings only visible to owner/admin roles."
    why_human: "Role-conditional rendering and visual layout cannot be confirmed via static analysis"
  - test: "Open /(liff)/clubs/[id] inside LINE app (LIFF webview) — confirm page loads without white screen, schedule and events render, register button opens /(liff)/events/[id]"
    expected: "Spinner shown during load. Club name, role badge, schedule section, event cards with progress bars. Register taps open correct LIFF event page."
    why_human: "LIFF isReady/isLoggedIn auth gate and LINE webview behavior require live environment testing"
---

# Phase 11: Club Hub & Events List — Verification Report

**Phase Goal:** Create a club hub page as the central navigation point and an events list page showing both upcoming events and recurring weekly schedule from active templates
**Verified:** 2026-04-12T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A club hub page exists with links to events, members, and settings | VERIFIED | `apps/web/app/clubs/[id]/page.tsx` lines 88-105: quick-links row with `#events`, `#schedule`, `/clubs/${id}/members`, `/clubs/${id}/settings` — admin links gated on `isAdminOrOwner` |
| 2 | Events list shows all upcoming events sorted by date | VERIFIED | `events.ts` lines 42-50: Drizzle query with `eq(events.status, "open")`, `gte(events.eventDate, new Date())`, `orderBy(asc(events.eventDate))` |
| 3 | Events list page displays a weekly schedule section from active templates | VERIFIED | Both hub pages filter `templates.filter(t => t.status === "active")` and render `ตารางซ้อม` card with THAI_DAYS mapping sorted by `eventDayOfWeek` |
| 4 | Members can see the full recurring schedule even if events haven't been generated yet | VERIFIED | `event-templates.ts` line 50: `requireClubRole(query.clubId, member.id, ["owner", "admin", "member"])` — members can now fetch templates directly |
| 5 | GET /events?clubId=X returns upcoming open events with registeredCount | VERIFIED | `events.ts` lines 15-54: full endpoint with `leftJoin(registrations)`, `count(registrations.id)` as `registeredCount`, `Number(r.registeredCount)` conversion |
| 6 | Club hub shows quick-links navigation per D-01 | VERIFIED | Lines 88-105 of hub page: `flex flex-wrap gap-2` with 4 buttons, `min-h-[44px]`, admin-gated Members + Settings |
| 7 | Club defaults cards removed from hub | VERIFIED | No `defaultMaxPlayers` or "Club Defaults" rendered; old defaults grid absent from hub page |
| 8 | LIFF hub at /(liff)/clubs/[id] exists as client component | VERIFIED | File created, line 1: `"use client"`, wraps `LiffClubHubInner` in `<Suspense>`, uses `useLiff()`, fetches via `/api/proxy/*` |
| 9 | Register button on LIFF event cards navigates to /(liff)/events/[id] | VERIFIED | Line 212: `href={`/events/${event.id}`}` — correct path for LIFF route group (no "liff" prefix in URL per Next.js route groups) |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/routes/events.ts` | GET / list endpoint for upcoming events | VERIFIED | Contains `.get("/",` at line 15, substantive implementation, wired via proxy |
| `apps/web/app/clubs/[id]/page.tsx` | Transformed club hub page | VERIFIED | Contains `ตารางซ้อม` at line 114, `Promise.all` at line 61, full event card rendering |
| `apps/web/app/(liff)/clubs/[id]/page.tsx` | LIFF club hub client component | VERIFIED | Contains `"use client"` at line 1, `useLiff` at line 6 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/app/clubs/[id]/page.tsx` | `/api/events?clubId=` | `apiClient.get` | VERIFIED | Line 63: `apiClient.get<EventListItem[]>(`/api/events?clubId=${id}`)` |
| `apps/web/app/clubs/[id]/page.tsx` | `/api/event-templates?clubId=` | `apiClient.get` | VERIFIED | Line 64: `apiClient.get<EventTemplate[]>(`/api/event-templates?clubId=${id}`)` |
| `apps/web/app/(liff)/clubs/[id]/page.tsx` | `/api/proxy/events?clubId=` | `fetch` | VERIFIED | Line 88: `fetch(`/api/proxy/events?clubId=${clubId}`)` |
| `apps/web/app/(liff)/clubs/[id]/page.tsx` | `/(liff)/events/[id]` | Link href | VERIFIED | Line 212: `href={`/events/${event.id}`}` — (liff) route group omits "liff" prefix |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `apps/web/app/clubs/[id]/page.tsx` | `eventsList` | `apiClient.get` → `GET /api/events?clubId=` → Drizzle query | Yes — DB query with `leftJoin`, `count`, `where` filters | FLOWING |
| `apps/web/app/clubs/[id]/page.tsx` | `templates` | `apiClient.get` → `GET /api/event-templates?clubId=` → Drizzle `select from eventTemplates` | Yes — full DB select | FLOWING |
| `apps/web/app/(liff)/clubs/[id]/page.tsx` | `events`, `templates` | `/api/proxy/*` → same API routes | Yes — proxied to same DB-backed endpoints | FLOWING |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HUB-01 | 11-01, 11-02 | Not defined in REQUIREMENTS.md | ORPHANED | ID referenced in both plans but absent from REQUIREMENTS.md traceability table |
| HUB-02 | 11-01, 11-02 | Not defined in REQUIREMENTS.md | ORPHANED | Same |
| HUB-03 | 11-01, 11-02 | Not defined in REQUIREMENTS.md | ORPHANED | Same |
| HUB-04 | 11-01, 11-02 | Not defined in REQUIREMENTS.md | ORPHANED | Same |

**Note:** HUB-01 through HUB-04 are referenced in both plan frontmatter `requirements:` fields but do not appear anywhere in `.planning/REQUIREMENTS.md`. This is a documentation gap — the goal has been achieved in code but the requirement IDs are untracked. The REQUIREMENTS.md traceability table should be updated to add these four IDs mapped to Phase 11.

### Anti-Patterns Found

No anti-patterns detected. All verified files contain substantive implementations with live data wiring. No TODO/FIXME/placeholder comments, no hardcoded empty arrays as final data sources, no stub handlers.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| events.ts GET / handler exists before GET /club-defaults | File read — `.get("/",` at line 15, `.get("/club-defaults"` at line 56 | Confirmed ordering | PASS |
| event-templates.ts GET handler allows members | File read — line 50 contains `["owner", "admin", "member"]` | Role includes member | PASS |
| LIFF hub "use client" directive | File read — line 1 | Present | PASS |
| API fetch via proxy | File read — lines 86-90 | All three proxy calls present | PASS |

### Human Verification Required

#### 1. Website Hub Visual Layout and Role-Conditional Links

**Test:** Log in as a member (non-admin) and visit `/clubs/[id]`. Then log in as owner/admin and visit the same page.
**Expected:** As member — schedule section visible, event cards visible, NO Members or Settings quick-links. As admin/owner — all four quick-links visible (Events, Schedule, Members, Settings).
**Why human:** Role-conditional rendering requires a live session with actual club role data; static analysis confirms the conditional logic exists but cannot confirm correct role values are returned from the API.

#### 2. LIFF Club Hub in LINE Webview

**Test:** Open the LIFF URL pointing to `/(liff)/clubs/[id]` inside LINE.
**Expected:** Spinner shown during auth init, then club name renders with role badge, schedule section appears (if active templates exist), event cards render with progress bars and register buttons. Tapping register navigates to `/(liff)/events/[id]`.
**Why human:** `useLiff()` `isReady` + `isLoggedIn` gating, LIFF initialization, and LINE webview navigation behavior can only be tested in a live LINE environment.

### Gaps Summary

No functional gaps found. All must-haves verified at all four levels (exists, substantive, wired, data-flowing).

The only issue is a **documentation gap**: requirement IDs HUB-01, HUB-02, HUB-03, HUB-04 are referenced in plan frontmatter but are not defined or tracked in `.planning/REQUIREMENTS.md`. This does not affect code functionality but should be resolved by adding these IDs to REQUIREMENTS.md.

---

_Verified: 2026-04-12T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
