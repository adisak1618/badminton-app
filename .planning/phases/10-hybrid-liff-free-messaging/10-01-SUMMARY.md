---
phase: 10-hybrid-liff-free-messaging
plan: "01"
subsystem: liff
tags: [liff, routing, auth, next.js]
dependency_graph:
  requires: []
  provides: [liff-external-browser-login, clean-liff-urls, 301-redirects]
  affects: [apps/web/app, apps/web/components/liff]
tech_stack:
  added: []
  patterns: [next.js-route-groups, liff-external-browser-login, open-redirect-validation]
key_files:
  created:
    - apps/web/app/(liff)/layout.tsx
  modified:
    - apps/web/components/liff/liff-provider.tsx
    - apps/web/app/layout.tsx
    - apps/web/next.config.js
    - apps/web/app/(liff)/events/[id]/page.tsx
    - apps/web/app/(liff)/events/create/page.tsx
    - apps/web/app/(liff)/events/templates/page.tsx
    - apps/web/app/(liff)/events/templates/[id]/edit/page.tsx
    - apps/web/app/(liff)/setup/page.tsx
    - apps/web/app/(liff)/profile/page.tsx
decisions:
  - "Use Next.js (liff) route group to strip /liff prefix without affecting URL paths"
  - "LiffProvider moved to root layout so all pages including non-LIFF benefit from context"
  - "returnTo query param validated as relative path to prevent open redirect (T-10-02)"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-12"
  tasks_completed: 2
  files_changed: 10
---

# Phase 10 Plan 01: LIFF URL Restructure and External Browser Login Summary

LIFF pages moved to clean paths via Next.js (liff) route group with external browser LINE Login OAuth and 301 redirects from old /liff/* paths.

## What Was Built

- **LiffProvider** refactored: adds external browser detection (`!isInClient() && !isLoggedIn()`) that triggers `liff.login()` OAuth instead of showing an error. Exposes `isInClient: boolean` in context for downstream use (Plan 03).
- **Root layout** now wraps all children with `LiffProvider` so LIFF context is universally available.
- **(liff) route group** created at `app/(liff)/` with a minimal layout (no Nav) — pages render without the global navigation bar.
- **All LIFF pages** moved from `app/liff/*` to `app/(liff)/*`, serving at clean paths: `/events/:id`, `/events/create`, `/events/templates`, `/events/templates/:id/edit`, `/setup`, `/profile`.
- **Old `app/liff/` directory** fully removed.
- **7 permanent (301) redirects** configured in `next.config.js` for backward compatibility with existing Flex card links.
- **Open redirect mitigation** (T-10-02): `returnTo` parameter validated to be a relative path before use.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor LiffProvider + move to root layout | 0270c08 | liff-provider.tsx, layout.tsx, (liff)/layout.tsx |
| 2 | Move LIFF pages + configure 301 redirects | febb728 | next.config.js, 7 page files moved |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Added returnTo open-redirect validation**
- **Found during:** Task 1 (threat model T-10-02 marked `mitigate`)
- **Issue:** `returnTo` query param used in redirect without validation — attacker could craft `/setup?returnTo=https://evil.com`
- **Fix:** Added `isRelativePath` check ensuring `returnTo` starts with `/` and does not contain `://`
- **Files modified:** apps/web/components/liff/liff-provider.tsx
- **Commit:** 0270c08

## Known Stubs

None.

## Threat Flags

None — all threat model mitigations applied inline.

## Self-Check: PASSED

- apps/web/components/liff/liff-provider.tsx: FOUND
- apps/web/app/layout.tsx: FOUND
- apps/web/app/(liff)/layout.tsx: FOUND
- apps/web/app/(liff)/events/[id]/page.tsx: FOUND
- apps/web/app/(liff)/setup/page.tsx: FOUND
- apps/web/app/(liff)/profile/page.tsx: FOUND
- app/liff/ directory: REMOVED
- next.config.js: 7 permanent redirects: CONFIRMED
- Commits 0270c08, febb728: FOUND
