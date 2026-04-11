---
phase: 07-club-setup-ui-gaps
verified: 2026-04-11T00:00:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to /clubs/[id] — verify 4-card grid shows Home Court card; if homeCourtLocation is null verify it shows 'Not set' in muted style"
    expected: "4 stat cards visible: Max Players, Shuttlecock Fee, Court Fee, Home Court. Null location shows 'Not set' in muted foreground color."
    why_human: "Server component rendering and conditional CSS class application cannot be confirmed without a browser"
  - test: "Navigate to /clubs/[id]/settings — link a club that has a LINE group ID, verify Unlink Group button appears below the ClubForm"
    expected: "Unlink Group button (destructive variant) visible only when club has lineGroupId"
    why_human: "Conditional render depends on live API data; cannot verify without running server and real club data"
  - test: "Click Unlink Group button — verify confirmation dialog opens with title 'Unlink LINE Group?' and two buttons: 'Keep Group' and 'Unlink Group'"
    expected: "Dialog appears with warning description about bot notifications stopping"
    why_human: "Dialog interaction flow requires browser"
  - test: "Click Keep Group — verify dialog closes without making API call. Click Unlink Group again, then confirm — verify toast 'LINE Group unlinked' appears and lineGroupId badge updates to 'Not Linked'"
    expected: "Successful unlink: toast shown, club detail badge changes from 'LINE Group Linked' to 'Not Linked'"
    why_human: "Real-time state update and toast display require browser with active API"
---

# Phase 7: Club Setup UI Gaps Verification Report

**Phase Goal:** Close club-setup UI gaps — homeCourtLocation display on detail page, settings type fix, and Unlink Group button with confirmation dialog.
**Verified:** 2026-04-11
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Club detail page shows homeCourtLocation as a 4th card in the stat grid | VERIFIED | `apps/web/app/clubs/[id]/page.tsx` line 58: `md:grid-cols-2 lg:grid-cols-4`; 4th card lines 89-100 with "Home Court" label |
| 2 | When homeCourtLocation is null, the card shows "Not set" | VERIFIED | `page.tsx` line 97: `{club.homeCourtLocation ?? "Not set"}`; conditional muted class line 96 |
| 3 | Settings page form submits homeCourtLocation to the API without TypeScript errors | VERIFIED | `settings/page.tsx` line 50: `homeCourtLocation?: string` in handleSubmit parameter type; defaultValues pass `homeCourtLocation` to ClubForm line 108 |
| 4 | Club settings page shows Unlink Group button when lineGroupId is not null | VERIFIED | `settings/page.tsx` line 113: `{club.lineGroupId && (...)}` conditional block contains Button variant="destructive" |
| 5 | Clicking Unlink Group opens a confirmation dialog with warning text | VERIFIED | Dialog with DialogTitle "Unlink LINE Group?" and DialogDescription about bot notifications (lines 119-145) |
| 6 | Confirming unlink calls DELETE /api/proxy/clubs/:id/link and shows success toast | VERIFIED | `handleUnlink` function lines 72-89: `method: "DELETE"` to `/api/proxy/clubs/${params.id}/link`; `toast.success("LINE Group unlinked")` line 79 |
| 7 | After unlinking, club state refreshes and lineGroupId badge updates | VERIFIED | `settings/page.tsx` lines 81-82: re-fetch club and `setClub(await updated.json())` after successful DELETE |
| 8 | Toaster component renders on web layout pages | VERIFIED | `apps/web/app/layout.tsx` line 3: import; line 23: `<Toaster />` after `<main>` in body |

**Score:** 8/8 truths verified

### Roadmap Success Criteria

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| SC-1 | ClubForm includes homeCourtLocation text field — creating or editing submits value to API | VERIFIED | `apps/web/components/club-form.tsx` lines 13, 70-81: field in zod schema and rendered Input with `register("homeCourtLocation")` |
| SC-2 | Club detail/settings page displays homeCourtLocation value | VERIFIED | Detail page: 4th card renders `{club.homeCourtLocation ?? "Not set"}`; settings page: defaultValues passes `homeCourtLocation: club.homeCourtLocation` |
| SC-3 | Settings page has Unlink Group button calling DELETE /api/clubs/:id/link | VERIFIED | `handleUnlink` calls DELETE to `/api/proxy/clubs/${params.id}/link` |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/app/clubs/[id]/page.tsx` | homeCourtLocation card in detail grid | VERIFIED | Contains interface field, lg:grid-cols-4, Home Court card, "Not set" fallback |
| `apps/web/app/clubs/[id]/settings/page.tsx` | Fixed handleSubmit type + Unlink Group dialog | VERIFIED | `homeCourtLocation?: string` in handleSubmit; full Dialog with DELETE handler |
| `apps/web/app/layout.tsx` | Toaster component for web pages | VERIFIED | Imports Toaster from `@repo/ui/components/sonner`; renders `<Toaster />` |
| `apps/web/components/club-form.tsx` | homeCourtLocation text field | VERIFIED | Field in zod schema, Label + Input rendered, included in form submission |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/app/clubs/[id]/page.tsx` | `/api/proxy/clubs/:id` | `apiClient.get` with `homeCourtLocation` | VERIFIED | Line 26: `apiClient.get<Club>(`/api/clubs/${id}`)` — interface includes homeCourtLocation |
| `apps/web/app/clubs/[id]/settings/page.tsx` | `/api/proxy/clubs/:id/link` | `fetch DELETE` | VERIFIED | Line 75-77: `fetch(`/api/proxy/clubs/${params.id}/link`, { method: "DELETE" })` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `settings/page.tsx` | `club` state | `fetch(/api/proxy/clubs/${params.id})` in `useEffect` | Yes — API proxy to real DB | FLOWING |
| `page.tsx` | `club` prop | `apiClient.get<Club>(`/api/clubs/${id}`)` server-side | Yes — server component fetches real DB | FLOWING |
| `settings/page.tsx` | `club` state post-unlink | Re-fetch `/api/proxy/clubs/${params.id}` after DELETE | Yes — re-fetches from DB | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — UI components require a running browser; no CLI-testable entry points for these React components.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CLUB-01 | 07-01-PLAN.md | Club owner creates club with homeCourtLocation | SATISFIED | ClubForm has homeCourtLocation field; detail page shows it; settings page submits it |
| CLUB-02 | 07-02-PLAN.md | Owner can unlink Line group via settings | SATISFIED | Unlink Group button, DELETE call, dialog confirmation, toast feedback all implemented |

No orphaned requirements — REQUIREMENTS.md maps only CLUB-01 and CLUB-02 to Phase 7.

### Anti-Patterns Found

No blockers or warnings found. Scanned for TODO/FIXME, empty returns, hardcoded empty data, and stub patterns across all modified files — none detected. The `loading` and `club not found` guard returns are legitimate control flow, not stubs.

### Human Verification Required

**1. Home Court card visual rendering**

**Test:** Navigate to `/clubs/[id]` with a club that has a null homeCourtLocation.
**Expected:** 4-card grid shows "Not set" in muted foreground color on the Home Court card. No layout breakage on mobile (2-col) or desktop (4-col).
**Why human:** CSS class application and responsive layout cannot be confirmed without a browser.

**2. Unlink Group button conditional display**

**Test:** Navigate to `/clubs/[id]/settings` for a club with a linked LINE group (lineGroupId is set). Then navigate to a club without a linked group.
**Expected:** Button appears only for the linked club; absent for the unlinked club.
**Why human:** Depends on real API data and conditional React render.

**3. Confirmation dialog interaction**

**Test:** Click "Unlink Group". Verify dialog opens with title "Unlink LINE Group?" and buttons "Keep Group" and "Unlink Group". Click "Keep Group" — dialog closes, no API call. Open again, click "Unlink Group" (confirm).
**Expected:** Dialog closes without action on Keep Group. On confirm: loading state shown, DELETE fires, dialog closes, toast "LINE Group unlinked" appears.
**Why human:** Interactive dialog flow and toast display require browser.

**4. Post-unlink state update**

**Test:** After confirming unlink, observe the club state on the settings page and navigate to detail page.
**Expected:** The lineGroupId badge on the detail page changes from "LINE Group Linked" to "Not Linked". The Unlink Group section disappears from settings.
**Why human:** Requires live API call and reactive state update verification.

### Gaps Summary

No gaps. All 8 observable truths verified against the codebase. All 3 roadmap success criteria satisfied. Both requirement IDs (CLUB-01, CLUB-02) fully covered.

The phase is blocked at `human_needed` — automated checks pass completely but the UI interaction flows (dialog open/close, toast display, conditional rendering with real data, responsive grid layout) require browser verification before the phase can be marked passed.

---

_Verified: 2026-04-11_
_Verifier: Claude (gsd-verifier)_
