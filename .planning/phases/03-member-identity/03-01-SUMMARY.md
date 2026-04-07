---
phase: 03-member-identity
plan: 01
subsystem: liff-auth
tags: [liff, auth, session, member-profile, api]
dependency_graph:
  requires:
    - packages/db/src/schema/members.ts
    - apps/web/lib/session.ts
    - apps/api/src/middleware/auth.ts
  provides:
    - apps/web/app/api/auth/liff/route.ts
    - apps/api/src/routes/liff-profile.ts
    - apps/web/components/liff/liff-provider.tsx
  affects:
    - apps/api/src/index.ts
    - apps/web/lib/env.ts
    - apps/api/src/env.ts
tech_stack:
  added:
    - "@line/liff@2.28.0 — LINE LIFF SDK for web"
    - "@repo/db added to web app dependencies"
    - "drizzle-orm added directly to web app dependencies"
  patterns:
    - "Dynamic import of @line/liff inside useEffect (SSR-safe)"
    - "ID token verified server-side via LINE /oauth2/v2.1/verify before session is set"
    - "lineUserId extracted only from verified profile.sub — never from client body"
    - "Elysia t.Object validation on all profile mutation endpoints"
key_files:
  created:
    - apps/web/app/api/auth/liff/route.ts
    - apps/api/src/routes/liff-profile.ts
    - apps/web/components/liff/liff-provider.tsx
    - apps/api/src/__tests__/liff-auth.test.ts
    - apps/api/src/__tests__/liff-profile.test.ts
  modified:
    - apps/web/lib/env.ts
    - apps/api/src/env.ts
    - apps/api/src/index.ts
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "DB queried directly in Next.js route handler (apps/web/app/api/auth/liff) via @repo/db workspace package — avoids circular dependency with Elysia API"
  - "export default app added to apps/api/src/index.ts to enable integration tests (existing tests were broken without it)"
  - "NEXT_PUBLIC_LIFF_ID added to both client section and experimental__runtimeEnv in web env.ts for @t3-oss/env-nextjs compatibility"
metrics:
  duration: "~9 minutes"
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_created: 5
  files_modified: 5
---

# Phase 03 Plan 01: LIFF Auth + Profile API Summary

One-liner: LIFF auth endpoint verifying LINE ID tokens via server-side /oauth2/v2.1/verify, global member profile CRUD (GET/POST/PUT) keyed by session lineUserId, and LiffProvider React context with dynamic import for SSR safety.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 (RED) | Failing integration tests | 9b4dbd0 | Complete |
| 1 (GREEN) | LIFF auth endpoint + profile API routes + env updates | b934db7 | Complete |
| 2 | LiffProvider client component + install @line/liff | 1d6bb9c | Complete |

## What Was Built

### LIFF Auth Endpoint (`apps/web/app/api/auth/liff/route.ts`)
POST /api/auth/liff Next.js route handler:
- Parses `{ idToken }` from request body
- Verifies token server-side via `https://api.line.me/oauth2/v2.1/verify` with `client_id`
- Extracts `lineUserId = profile.sub` from LINE-verified response — never from client body (T-03-01)
- Checks for existing member record via `@repo/db` (direct DB query — no circular RPC dependency)
- Sets iron-session: lineUserId, displayName, pictureUrl, isLoggedIn=true, memberId if member exists
- Returns `{ ok: true, needsSetup: boolean, displayName: string }`
- Rejects invalid/missing tokens with 401

### Profile API Routes (`apps/api/src/routes/liff-profile.ts`)
Elysia plugin mounted at `/liff/profile`, requires authMiddleware (sealed session cookie):
- `GET /liff/profile` — returns `{ id, displayName, skillLevel, yearsPlaying }` for session.lineUserId; 404 if no record
- `POST /liff/profile` — creates member with validated body `{ displayName, skillLevel, yearsPlaying }`; returns 201 with created member
- `PUT /liff/profile` — partial update of own profile only (session.lineUserId); returns 200 with updated member; 404 if no record
- All routes: lineUserId comes from sealed session, never from request body (T-03-03, T-03-06)
- All routes: Elysia t.Object schema validation, returns 422 on invalid input (T-03-04)
- Response never includes lineUserId (T-03-05)
- No club_id anywhere — profile is global (MEMB-03)

### LiffProvider (`apps/web/components/liff/liff-provider.tsx`)
React context provider + useLiff hook:
- `"use client"` directive for Next.js
- Dynamic `import("@line/liff")` inside useEffect — prevents SSR crash (RESEARCH.md Pitfall 1)
- Calls `liff.init({ liffId })` then `liff.getIDToken()`
- POSTs ID token to `/api/auth/liff` (same-origin Next.js route, not through proxy)
- `isReady` flag indicates both LIFF init AND server auth completed
- No LINE environment = error message (no browser fallback per D-03)
- Exports `LiffProvider` and `useLiff` hook

## Test Coverage

| File | Tests | Assertions |
|------|-------|-----------|
| liff-auth.test.ts | 5 | auth guard + session-keyed access |
| liff-profile.test.ts | 11 | POST/GET/PUT CRUD, validation, T-03-06 elevation prevention |
| **Total** | **16** | **41 expect() calls** |

All 16 tests pass against real Neon database.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `export default app` to apps/api/src/index.ts**
- **Found during:** Task 1 (TDD RED — testing)
- **Issue:** Test files do `const mod = await import("../index"); app = mod.default` but index.ts had no default export. All integration tests (including pre-existing clubs/club-members tests) would have `app` as undefined.
- **Fix:** Added `export default app;` at the bottom of index.ts
- **Files modified:** apps/api/src/index.ts
- **Commit:** b934db7

**2. [Rule 3 - Blocking] Added `@repo/db` and `drizzle-orm` to web app dependencies**
- **Found during:** Task 1 TypeScript check
- **Issue:** `apps/web/app/api/auth/liff/route.ts` imports from `@repo/db` and `drizzle-orm` but neither was in web's package.json
- **Fix:** Added `@repo/db: workspace:*` and `drizzle-orm: ^0.45.2` to apps/web/package.json
- **Files modified:** apps/web/package.json, pnpm-lock.yaml
- **Commit:** 1d6bb9c

**3. [Rule 3 - Blocking] Fixed `experimental__runtimeEnv` for NEXT_PUBLIC_LIFF_ID**
- **Found during:** Task 1 TypeScript check
- **Issue:** `@t3-oss/env-nextjs` requires client env vars (NEXT_PUBLIC_*) to be explicitly listed in `experimental__runtimeEnv`, not just in the `client` section
- **Fix:** Changed `experimental__runtimeEnv: process.env` to explicit object with `NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID`
- **Files modified:** apps/web/lib/env.ts
- **Commit:** 1d6bb9c

### Pre-existing Issues (Deferred — Not Caused by This Plan)
- webhook.test.ts and join-event.test.ts: 3 tests fail in both main project and worktree — unrelated to LIFF auth work. The `export default app` fix (deviation 1 above) actually improved those tests from 5 failures to 3. Logged to deferred-items.

## Threat Surface Scan

All new endpoints are within the plan's threat model:
- POST /api/auth/liff — T-03-01 and T-03-02 mitigations implemented (token verified server-side, lineUserId from profile.sub only)
- GET/POST/PUT /api/liff/profile — T-03-03 through T-03-06 mitigations implemented (authMiddleware, input validation, no data leakage, own-profile-only updates)

No new unplanned threat surface introduced.

## Self-Check: PASSED

All 5 key files exist. All 3 task commits found in git log.
