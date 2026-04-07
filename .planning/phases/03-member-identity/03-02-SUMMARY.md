---
phase: 03-member-identity
plan: 02
subsystem: liff-ui
tags: [liff, profile, forms, ui, react]
dependency_graph:
  requires:
    - apps/web/components/liff/liff-provider.tsx
    - apps/web/app/api/auth/liff/route.ts (from plan 01)
    - apps/api/src/routes/liff-profile.ts (from plan 01)
  provides:
    - apps/web/app/liff/layout.tsx
    - apps/web/app/liff/page.tsx
    - apps/web/app/liff/setup/page.tsx
    - apps/web/app/liff/profile/page.tsx
    - apps/web/components/liff/profile-form.tsx
  affects:
    - apps/web/package.json (added lucide-react dependency)
    - pnpm-lock.yaml
tech_stack:
  added:
    - "lucide-react@^0.511.0 — Loader2 spinner icon for loading states"
  patterns:
    - "ProfileForm shared component with Zod v4 schema validation and react-hook-form"
    - "Profile gate via client-side fetch in entry page (avoids redirect loop — Pitfall 5)"
    - "Pre-fill display name from liff.getDecodedIDToken().name (D-05)"
    - "Immediate save with no confirmation dialog on profile edit (D-08)"
key_files:
  created:
    - apps/web/app/liff/layout.tsx
    - apps/web/app/liff/page.tsx
    - apps/web/app/liff/setup/page.tsx
    - apps/web/app/liff/profile/page.tsx
    - apps/web/components/liff/profile-form.tsx
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "Zod v4 uses `error:` not `required_error:` for enum and number validation messages — updated schema accordingly"
  - "lucide-react added to web package.json — it was only in packages/ui previously, but web imports it directly"
  - "Profile gate implemented in /liff entry page via API fetch (not middleware or layout redirect) to prevent redirect loop on /liff/setup"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 03 Plan 02: LIFF UI Pages Summary

One-liner: LIFF entry page with profile gate routing, shared ProfileForm with Zod v4 validation and accessibility, first-time setup screen pre-filling from LINE ID token, and profile edit screen with immediate-save UX.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | LIFF layout, entry page, profile gate, and shared ProfileForm | 07f5346 | Complete |
| 2 | Profile setup and edit pages | ac4c594 | Complete |
| 3 | Verify LIFF UI in development | — | PENDING (human-verify checkpoint) |

## What Was Built

### LIFF Layout (`apps/web/app/liff/layout.tsx`)
Server component wrapping all `/liff/*` routes:
- Wraps children in `LiffProvider` with `NEXT_PUBLIC_LIFF_ID`
- Includes `Toaster` for sonner notifications
- `min-h-screen bg-background` container

### LIFF Entry Page (`apps/web/app/liff/page.tsx`)
Client component providing:
- Full-screen `Loader2` spinner during LIFF init
- On `liffError`: centered Card with "Unable to Sign In" heading and "Please close this page and open it again from LINE." body
- Profile gate: after auth, fetches `/api/proxy/liff/profile` — routes to `/liff/setup` (404) or `/liff/profile` (200)
- Safety: catch block always falls back to `/liff/setup`

### ProfileForm (`apps/web/components/liff/profile-form.tsx`)
Shared form component used by both setup and edit pages:
- Zod v4 schema with `error:` key (updated from deprecated `required_error:`)
- Three fields: Display Name (Input), Skill Level (shadcn Select), Years Playing (Input type=number)
- `aria-describedby` on each input linked to error message `id`
- `min-h-[44px]` on Button for mobile touch target
- `valueAsNumber: true` on yearsPlaying
- Exact validation error messages per UI-SPEC Copywriting Contract

### Profile Setup Page (`apps/web/app/liff/setup/page.tsx`)
First-time member flow:
- Pre-fills display name from `liff.getDecodedIDToken().name` (D-05)
- POSTs to `/api/proxy/liff/profile`
- On success: toast "Profile saved", redirects to `/liff/profile`
- On error: toast error message from API response
- Heading "Set Up Your Profile", subheading "This only takes a moment."

### Profile Edit Page (`apps/web/app/liff/profile/page.tsx`)
Returning member profile management:
- Fetches current profile via GET `/api/proxy/liff/profile` on mount
- If 404: redirects to `/liff/setup` (safety fallback for D-04)
- PUTs to `/api/proxy/liff/profile` on save (D-08 — no confirmation dialog)
- On success: toast "Profile updated", stays on page
- On error: toast "Could not save. Please try again."
- All three fields pre-filled with current values

## Checkpoint Pending

**Task 3 (human-verify)** is pending orchestrator handoff. The human verification steps are:

1. `npx tsc --noEmit -p apps/web/tsconfig.json` (automated — passes as of this plan)
2. `cd apps/api && bun test src/__tests__/liff-auth.test.ts src/__tests__/liff-profile.test.ts`
3. Start dev: `pnpm dev`
4. Visit http://localhost:3000/liff — expect loading spinner then "Unable to Sign In" card
5. Visit http://localhost:3000/liff/setup — form page renders
6. Visit http://localhost:3000/liff/profile — page renders
7. Check browser console for JavaScript errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod v4 API compatibility — `required_error` replaced with `error`**
- **Found during:** Task 1 TypeScript check
- **Issue:** Plan's ProfileForm template used `required_error:` in `z.enum()` and `z.number()` params. Zod v4 removed this property name — the key is now `error:`.
- **Fix:** Updated `required_error:` to `error:` in both `z.enum()` and `z.number()` calls in `profileSchema`
- **Files modified:** apps/web/components/liff/profile-form.tsx
- **Commit:** 07f5346

**2. [Rule 2 - Missing dependency] Added `lucide-react` to web app package.json**
- **Found during:** Task 1 TypeScript check
- **Issue:** `apps/web/app/liff/page.tsx` and `apps/web/app/liff/setup/page.tsx` import `Loader2` from `lucide-react`. The package was only declared in `packages/ui`, not in `apps/web` directly — causing TS2307 module-not-found error.
- **Fix:** Added `lucide-react: ^0.511.0` to `apps/web/package.json` dependencies; ran `pnpm install --filter web`
- **Files modified:** apps/web/package.json, pnpm-lock.yaml
- **Commit:** 07f5346

## Threat Surface Scan

All new client components use the existing proxy at `/api/proxy/liff/profile`. No new network endpoints or auth paths introduced. Threat model coverage from plan's `<threat_model>`:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-03-08 (Spoofing) | Form submits through proxy to Elysia API with authMiddleware |
| T-03-09 (Elevation) | PUT route enforces session.lineUserId match server-side |
| T-03-10 (Tampering) | Client Zod validation is UX only; Elysia t.Object enforces server side |
| T-03-11 (Info Disclosure) | Error card shows "Unable to Sign In" — no token/session data |
| T-03-12 (DoS/redirect loop) | Entry page uses API fetch for gate, not layout redirect; /liff/setup always accessible |

## Self-Check: PASSED

All 5 key files exist in worktree and main project. Both task commits (07f5346, ac4c594) found in git log.
