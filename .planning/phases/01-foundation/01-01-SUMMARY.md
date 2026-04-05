---
phase: 01-foundation
plan: 01
subsystem: database
tags: [drizzle-orm, postgresql, neon, schema, migrations, multi-tenant]

# Dependency graph
requires: []
provides:
  - Complete Drizzle ORM schema for 6 domain tables (clubs, members, club_members, events, registrations, idempotency_keys)
  - Generated SQL migration file for initial database structure
  - @repo/db workspace package with db client and schema exports
  - drizzle-kit config for migration generation and execution
affects: [01-02, 01-03, phase-2, phase-3]

# Tech tracking
tech-stack:
  added: [drizzle-orm 0.45.2, drizzle-kit 0.31.10, "@neondatabase/serverless 1.0.2"]
  patterns: [shared-schema multi-tenancy via club_id FK, barrel exports for schema, uuid primary keys with defaultRandom]

key-files:
  created:
    - packages/db/package.json
    - packages/db/tsconfig.json
    - packages/db/drizzle.config.ts
    - packages/db/src/index.ts
    - packages/db/src/schema/index.ts
    - packages/db/src/schema/clubs.ts
    - packages/db/src/schema/members.ts
    - packages/db/src/schema/club-members.ts
    - packages/db/src/schema/events.ts
    - packages/db/src/schema/registrations.ts
    - packages/db/src/schema/idempotency-keys.ts
    - packages/db/src/__tests__/tenant-isolation.test.ts
    - packages/db/src/__tests__/idempotency.test.ts
    - packages/db/migrations/0000_deep_impossible_man.sql
  modified:
    - turbo.json
    - pnpm-lock.yaml

key-decisions:
  - "Split schema into one file per table for maintainability and clear git blame"
  - "Members table is global (no club_id) — members can belong to multiple clubs via club_members junction"
  - "Idempotency keys use webhook_event_id as primary key for O(1) dedup lookups"

patterns-established:
  - "Pattern: shared-schema multi-tenancy — club-scoped tables have club_id NOT NULL FK to clubs"
  - "Pattern: barrel export in schema/index.ts re-exports all tables and enums"
  - "Pattern: drizzle-kit generate for version-controlled SQL migrations (not push)"

requirements-completed: [INFRA-01, INFRA-04]

# Metrics
duration: 3min
completed: 2026-04-05
---

# Phase 1 Plan 01: Database Schema Summary

**Drizzle ORM schema with 6 domain tables, club_id multi-tenant isolation, and generated SQL migration via drizzle-kit**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T16:37:37Z
- **Completed:** 2026-04-05T16:40:40Z
- **Tasks:** 1
- **Files modified:** 16

## Accomplishments
- Defined all 6 domain tables in Drizzle ORM: clubs, members, club_members, events, registrations, idempotency_keys
- Enforced multi-tenant isolation with club_id NOT NULL FK on all club-scoped tables (events, club_members)
- Generated initial SQL migration file via drizzle-kit generate (0000_deep_impossible_man.sql)
- Added db:generate and db:migrate tasks to turbo.json
- Test stubs for tenant isolation and idempotency pass (to be filled in Plan 03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create packages/db with Drizzle schema, config, and test stubs** - `047578e` (feat)

Note: Task 1 work was committed alongside Plan 01-02 scaffolding in a prior execution session. All files exist and pass verification.

## Files Created/Modified
- `packages/db/package.json` - @repo/db workspace package with drizzle-orm, drizzle-kit, neon driver
- `packages/db/tsconfig.json` - TypeScript config targeting ESNext with bundler resolution
- `packages/db/drizzle.config.ts` - drizzle-kit config pointing to schema and migrations dir
- `packages/db/src/index.ts` - Drizzle client via neon HTTP driver + schema re-exports
- `packages/db/src/schema/index.ts` - Barrel export of all 6 tables and 4 enums
- `packages/db/src/schema/clubs.ts` - Clubs table with default fees and max players
- `packages/db/src/schema/members.ts` - Members table (global, cross-club) with skill level enum
- `packages/db/src/schema/club-members.ts` - Junction table with role enum and unique(clubId, memberId)
- `packages/db/src/schema/events.ts` - Events table with club_id FK, status enum, venue fields
- `packages/db/src/schema/registrations.ts` - Registrations with unique(eventId, memberId)
- `packages/db/src/schema/idempotency-keys.ts` - Webhook dedup table with webhookEventId PK
- `packages/db/src/__tests__/tenant-isolation.test.ts` - Stub for cross-tenant isolation test
- `packages/db/src/__tests__/idempotency.test.ts` - Stub for idempotency key test
- `packages/db/migrations/0000_deep_impossible_man.sql` - Generated SQL migration (66 lines)
- `turbo.json` - Added db:generate and db:migrate tasks
- `pnpm-lock.yaml` - Updated with drizzle-orm, drizzle-kit, neon driver deps

## Decisions Made
- Split schema into one file per table for clear ownership and git blame
- Members table is global (no club_id) since members can belong to multiple clubs via the club_members junction table
- Used webhookEventId as primary key on idempotency_keys for O(1) dedup lookups via onConflictDoNothing
- drizzle-kit generate (not push) for version-controlled SQL migrations committed to git

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| packages/db/src/__tests__/tenant-isolation.test.ts | 5 | Requires DATABASE_URL -- will be implemented in Plan 03 |
| packages/db/src/__tests__/idempotency.test.ts | 5 | Requires DATABASE_URL -- will be implemented in Plan 03 |

These stubs are intentional and documented in the plan. They do not block the plan's goal (schema definition and migration generation).

## Issues Encountered
- Task commit was already present from a prior execution session (047578e included packages/db files alongside 01-02 work). Verified all files match plan requirements exactly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- @repo/db package ready to be imported by apps/api (Plan 02) and used in Plan 03 integration tests
- Migration SQL ready to be applied against Neon database when DATABASE_URL is available (Plan 03)
- Schema exports available for type-safe queries in all consuming packages

---
*Phase: 01-foundation*
*Completed: 2026-04-05*
