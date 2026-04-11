---
phase: 07-club-setup-ui-gaps
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - apps/web/app/clubs/[id]/page.tsx
  - apps/web/app/clubs/[id]/settings/page.tsx
  - apps/web/app/layout.tsx
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files were reviewed: the club detail page (server component), the club settings page (client component), and the root layout. The code is generally well-structured. The main concerns are unhandled API errors that will cause unhandled exceptions surfacing to the user, a missing authorization guard on the settings page, and a type mismatch between the two `Club` interface definitions for `homeCourtLocation`.

## Warnings

### WR-01: Unhandled fetch error in club detail page — exception propagates uncaught

**File:** `apps/web/app/clubs/[id]/page.tsx:26`
**Issue:** `apiClient.get<Club>(...)` is awaited without any try/catch. If the API returns a non-200 response (e.g., 404 for unknown club ID, 403 for unauthorized access, or network failure), the error will propagate up and Next.js will render its default error boundary, leaking internal error details to the user.
**Fix:**
```tsx
let club: Club;
try {
  club = await apiClient.get<Club>(`/api/clubs/${id}`);
} catch {
  notFound(); // or redirect, depending on desired UX
}
```

### WR-02: No authorization check in settings page — any authenticated user can access the route

**File:** `apps/web/app/clubs/[id]/settings/page.tsx:29-46`
**Issue:** The settings page loads and renders the `ClubForm` for any authenticated user who navigates to `/clubs/:id/settings`. The detail page conditionally renders the Settings button only for `owner`/`admin` roles (line 44 of `page.tsx`), but this is UI-only enforcement. The server (API) presumably rejects unauthorized `PUT` requests, but the settings page itself — including the unlink button — is fully rendered and accessible client-side to any member who knows the URL.
**Fix:** After fetching the club in `loadClub`, check the `role` field and redirect non-admin/non-owner users:
```tsx
if (res.ok) {
  const data = await res.json();
  if (data.role !== "owner" && data.role !== "admin") {
    router.replace(`/clubs/${params.id}`);
    return;
  }
  setClub(data);
}
```
Note: The `Club` interface in `settings/page.tsx` would also need a `role` field added to support this check.

### WR-03: Type mismatch — `homeCourtLocation` is non-nullable in settings but nullable in detail page

**File:** `apps/web/app/clubs/[id]/settings/page.tsx:23`
**Issue:** The `Club` interface in `settings/page.tsx` declares `homeCourtLocation: string` (non-nullable), while the same field in `clubs/[id]/page.tsx:12` is `homeCourtLocation: string | null`. The API presumably returns `null` when unset. Passing a `null` value into `ClubForm` via `defaultValues.homeCourtLocation` where a `string` is expected may cause subtle form initialization bugs.
**Fix:** Align the `settings/page.tsx` interface to match reality:
```ts
homeCourtLocation: string | null;
```
And guard the `defaultValues` prop:
```tsx
homeCourtLocation: club.homeCourtLocation ?? "",
```

### WR-04: Missing error handling in `loadClub` — silent failure on non-ok response

**File:** `apps/web/app/clubs/[id]/settings/page.tsx:39-44`
**Issue:** When `res.ok` is false (e.g., 404, 500), the function silently sets `loading = false` and `club` remains `null`. The component then renders the generic "Club not found" message with no way for the user to distinguish a network error from a legitimately missing club, and no retry mechanism.
**Fix:** At minimum, surface a distinct error state for non-ok responses:
```tsx
if (!res.ok) {
  setError(res.status === 404 ? "Club not found" : "Failed to load club settings");
  setLoading(false);
  return;
}
```

## Info

### IN-01: Duplicate `Club` interface across two files

**File:** `apps/web/app/clubs/[id]/page.tsx:8-18` and `apps/web/app/clubs/[id]/settings/page.tsx:19-27`
**Issue:** Two separate `Club` interface definitions exist for the same resource. They have drifted (note `role` field present in `page.tsx` but absent in `settings/page.tsx`, and the `homeCourtLocation` nullability difference noted in WR-03). This will continue to drift as the API evolves.
**Fix:** Extract a shared `Club` type into a shared types file (e.g., `apps/web/types/club.ts` or `@repo/types`) and import it in both pages.

### IN-02: `font-medium` omitted from Home Court card title — inconsistent with sibling cards

**File:** `apps/web/app/clubs/[id]/page.tsx:92`
**Issue:** The "Home Court" `CardTitle` uses `text-sm text-muted-foreground` (line 92) while the other three stat cards use `text-sm font-medium text-muted-foreground` (lines 61, 71, 81). This is a minor visual inconsistency.
**Fix:**
```tsx
<CardTitle className="text-sm font-medium text-muted-foreground">
  Home Court
</CardTitle>
```

---

_Reviewed: 2026-04-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
