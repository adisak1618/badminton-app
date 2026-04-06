---
phase: 02-club-setup
plan: "02"
subsystem: api
tags: [elysia, iron-session, drizzle-orm, rbac, club-management]

requires:
  - phase: 02-club-setup/02-01
    provides: iron-session session cookie, Line Login OAuth, Next.js web layer
  - phase: 01-foundation
    provides: Elysia API scaffold, Drizzle schema (clubs, club_members, members), DB connection

provides:
  - ApiError class with notFound/forbidden/unauthorized factories
  - Global Elysia error handler plugin (errorHandler)
  - Auth middleware using iron-session unsealData (authMiddleware)
  - Club CRUD routes (POST/GET/PUT)
  - Club member management routes (GET list, PUT role)
  - Group linking routes (POST /link, DELETE /:id/link)
  - requireClubRole authorization helper
  - homeCourtLocation column on clubs table (migration 0001)
  - SESSION_SECRET and WEB_BASE_URL env validation

affects: [02-03, 02-04, event-management, registration]

tech-stack:
  added: [iron-session@8.0.4, drizzle-orm (api direct dep)]
  patterns:
    - Elysia named plugins with derive({ as scoped }) for session propagation to sibling plugins
    - Role-based authorization via requireClubRole helper (owner/admin/member tiers)
    - Auto-create member record on first club creation using session lineUserId
    - Error handler catches ApiError, ValidationError, and unexpected errors with structured JSON

key-files:
  created:
    - apps/api/src/lib/errors.ts
    - apps/api/src/lib/error-handler.ts
    - apps/api/src/lib/require-club-role.ts
    - apps/api/src/middleware/auth.ts
    - apps/api/src/routes/clubs.ts
    - apps/api/src/routes/club-members.ts
    - apps/api/src/routes/club-link.ts
    - apps/api/src/__tests__/clubs.test.ts
    - apps/api/src/__tests__/club-members.test.ts
    - packages/db/migrations/0001_smiling_sunspot.sql
  modified:
    - apps/api/src/env.ts
    - apps/api/src/index.ts
    - apps/api/package.json
    - packages/db/src/schema/clubs.ts
    - apps/api/src/__tests__/webhook.test.ts

key-decisions:
  - "derive({ as: 'scoped' }) required in Elysia 1.x for derive to propagate from named plugin to sibling plugins within a group — plain .derive() without as:scoped does not propagate"
  - "drizzle-orm added to api direct dependencies even though it's in @repo/db — bun requires the importing package to have it when route files use eq/and directly"
  - "Webhook test uses env.LINE_CHANNEL_SECRET (imported from cached module) rather than process.env to handle module cache sharing across test files in the same bun worker"

patterns-established:
  - "Pattern: Auth middleware via Elysia named plugin with derive({ as: scoped }) — mount in group before route plugins"
  - "Pattern: ApiError thrown from routes, caught by errorHandler plugin mounted at app root"
  - "Pattern: requireClubRole(clubId, memberId, allowedRoles) called at start of mutation handlers"

requirements-completed: [CLUB-01, CLUB-03, CLUB-04, CLUB-05]

duration: 9min
completed: "2026-04-06"
---

# Phase 02 Plan 02: Club API Routes Summary

**Elysia club management API with iron-session auth middleware, RBAC role enforcement, and club CRUD/member/link routes — 15/15 integration tests passing**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-06T05:26:36Z
- **Completed:** 2026-04-06T05:35:36Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Full club management API: create club (auto-owner insert), list user's clubs, get single club with role, update settings (owner/admin only)
- Member management: list members, promote/demote roles (owner only, no self-change, no owner promotion)
- Group linking: POST /clubs/link sets lineGroupId (owner only, rejects if already linked), DELETE /clubs/:id/link unlinks
- Auth middleware using iron-session unsealData decrypts `badminton-session` cookie, derives `session` object for all club routes
- homeCourtLocation column added to clubs schema with Drizzle migration applied to Neon DB

## Task Commits

1. **Task 1: Error handling, auth middleware, env validation, homeCourtLocation** - `5951d10` (feat)
2. **Task 2: Club CRUD routes and authorization helper** - `cc2490a` (feat)
3. **Task 3: Club member routes, group linking, wire index.ts, integration tests** - `3e2b09a` (feat)

## Files Created/Modified

- `apps/api/src/lib/errors.ts` - ApiError class with notFound/forbidden/unauthorized factories
- `apps/api/src/lib/error-handler.ts` - Global Elysia onError plugin for structured JSON error responses
- `apps/api/src/lib/require-club-role.ts` - RBAC helper: queries club_members, throws forbidden if role not allowed
- `apps/api/src/middleware/auth.ts` - Auth derive plugin using unsealData from iron-session
- `apps/api/src/routes/clubs.ts` - Club CRUD: POST (create+owner), GET list, GET /:id, PUT (owner/admin)
- `apps/api/src/routes/club-members.ts` - GET /:id/members, PUT /:id/members/:memberId/role (owner only)
- `apps/api/src/routes/club-link.ts` - POST /link, DELETE /:id/link (owner only)
- `apps/api/src/index.ts` - Wired: errorHandler -> lineWebhook -> authMiddleware -> club routes
- `apps/api/src/env.ts` - Added SESSION_SECRET (min 32) and WEB_BASE_URL validation
- `apps/api/package.json` - Added iron-session@8.0.4 and drizzle-orm direct deps
- `packages/db/src/schema/clubs.ts` - Added homeCourtLocation varchar(500) column
- `packages/db/migrations/0001_smiling_sunspot.sql` - Migration for homeCourtLocation column
- `apps/api/src/__tests__/clubs.test.ts` - Integration tests: POST creates club+owner, GET list, PUT 403 for member, 401 no session
- `apps/api/src/__tests__/club-members.test.ts` - Integration tests: GET members, PUT role promote/demote, 403 non-owner, POST link
- `apps/api/src/__tests__/webhook.test.ts` - Fixed: added SESSION_SECRET/WEB_BASE_URL, use cached env secret for signature

## Decisions Made

- `derive({ as: 'scoped' })` is required in Elysia 1.x for derive to propagate from a named plugin to sibling plugins within a `.group()`. Without `as: 'scoped'`, the derive only applies to routes defined on the same plugin instance.
- Added `drizzle-orm` directly to api's `package.json` because bun requires each package importing a module to have it in its own dependencies, even if it's transitively available via `@repo/db`.
- Webhook test updated to use `env.LINE_CHANNEL_SECRET` from the cached module to avoid signature mismatch when bun shares the module cache across test files in the same worker process.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added drizzle-orm to api direct dependencies**
- **Found during:** Task 3 (running integration tests)
- **Issue:** `Cannot find package "drizzle-orm"` — route files import `eq`, `and` from drizzle-orm directly, but it was only in `@repo/db`'s deps
- **Fix:** `pnpm add drizzle-orm -F api`
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Verification:** Tests ran successfully after adding dep
- **Committed in:** 3e2b09a (Task 3 commit)

**2. [Rule 1 - Bug] Fixed Elysia derive scope: added `{ as: 'scoped' }` to authMiddleware**
- **Found during:** Task 3 (integration tests returned 500 instead of 401/200)
- **Issue:** `derive()` without `as: 'scoped'` doesn't propagate session to sibling plugins within the group — routes executed without session, erroring on `session.lineUserId`
- **Fix:** Changed `.derive(async ({ cookie }) =>` to `.derive({ as: 'scoped' }, async ({ cookie }) =>`
- **Files modified:** apps/api/src/middleware/auth.ts
- **Verification:** 401 returned for missing cookie, 200 returned with valid session
- **Committed in:** 3e2b09a (Task 3 commit)

**3. [Rule 1 - Bug] Fixed webhook test module cache signature mismatch**
- **Found during:** Task 3 (webhook "valid signature" test failed when run with all tests together)
- **Issue:** When bun shares module cache, env.LINE_CHANNEL_SECRET was loaded with value from clubs.test.ts; webhook test signed with TEST_SECRET but app used different cached value
- **Fix:** Import `env` from `../env` in beforeAll and use `env.LINE_CHANNEL_SECRET` to sign — matches whatever the app actually has cached
- **Files modified:** apps/api/src/__tests__/webhook.test.ts
- **Verification:** All 15 tests pass when run together
- **Committed in:** 3e2b09a (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking dep, 2 bugs)
**Impact on plan:** All fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## Known Stubs

None — all routes are fully implemented with real DB queries.

## Threat Flags

No new threat surface beyond what's documented in the plan's threat model. All STRIDE mitigations (T-02-07 through T-02-12) are implemented.

## Next Phase Readiness

- Club API is ready for the web dashboard (02-03) to call
- Auth middleware provides `session.lineUserId` and `session.memberId` for all club routes
- requireClubRole helper available for event management routes in Phase 4
- homeCourtLocation column is live in Neon DB

---
*Phase: 02-club-setup*
*Completed: 2026-04-06*
