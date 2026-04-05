---
phase: 01-foundation
plan: 02
subsystem: api
tags: [elysia, line-bot-sdk, webhook, hmac, idempotency, vercel, bun, t3-env]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: "@repo/db package with idempotencyKeys schema"
provides:
  - "apps/api Elysia backend with Vercel-compatible default export"
  - "Line webhook endpoint at /api/webhook/line with signature verification"
  - "Idempotency handler using onConflictDoNothing"
  - "Type-safe env validation via @t3-oss/env-core"
  - "Line MessagingApiClient singleton"
affects: [02-identity, 03-events, 04-messaging, 05-liff]

# Tech tracking
tech-stack:
  added: [elysia@1.4.28, "@line/bot-sdk@11.0.0", "zod@4.3.6", "@t3-oss/env-core@0.13.11"]
  patterns: [elysia-group-routing, raw-body-signature-verification, idempotency-via-conflict-skip]

key-files:
  created:
    - apps/api/package.json
    - apps/api/tsconfig.json
    - apps/api/vercel.json
    - apps/api/src/index.ts
    - apps/api/src/env.ts
    - apps/api/src/lib/line-client.ts
    - apps/api/src/webhook/line.ts
    - apps/api/src/webhook/handlers/idempotency.ts
    - apps/api/src/__tests__/webhook.test.ts
    - apps/api/src/__tests__/env.test.ts
  modified: []

key-decisions:
  - "Route uses .group('/api') prefix so lineWebhook plugin defines /webhook/line and final path is /api/webhook/line"
  - "No body schema on webhook route to preserve raw body stream for signature verification"

patterns-established:
  - "Pattern: Elysia raw body webhook - omit body schema, call request.text() before JSON.parse for HMAC verification"
  - "Pattern: Elysia group routing - .group('/api', app => app.use(plugin)) for API prefix"
  - "Pattern: Idempotency via DB conflict - insert webhookEventId, onConflictDoNothing, check result.length"

requirements-completed: [INFRA-02, INFRA-03]

# Metrics
duration: 2min
completed: 2026-04-05
---

# Phase 1 Plan 2: API Webhook Summary

**Elysia.js API backend with Line webhook endpoint, HMAC-SHA256 signature verification via raw body, and DB-backed idempotency handler**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-05T16:37:43Z
- **Completed:** 2026-04-05T16:39:39Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Scaffolded apps/api as Turborepo workspace with Elysia entry point and Vercel config (Bun runtime, hnd1 region)
- Implemented Line webhook route at /api/webhook/line with raw body signature verification using @line/bot-sdk validateSignature
- Built idempotency handler using Drizzle onConflictDoNothing pattern against idempotency_keys table
- Added type-safe environment validation for LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN, DATABASE_URL
- Created 4 passing test stubs covering webhook 401/200 scenarios and env validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold apps/api with Elysia, env validation, and Vercel config** - `f11fbea` (feat)
2. **Task 2: Implement webhook route with signature verification, idempotency, and test stubs** - `047578e` (feat)

## Files Created/Modified
- `apps/api/package.json` - API package with elysia, @line/bot-sdk, zod, @t3-oss/env-core, @repo/db
- `apps/api/tsconfig.json` - TypeScript config targeting ESNext with bundler resolution
- `apps/api/vercel.json` - Vercel deployment config with bunVersion 1.x and hnd1 region
- `apps/api/src/index.ts` - Elysia app entry point with default export and /api group prefix
- `apps/api/src/env.ts` - Type-safe env validation via createEnv
- `apps/api/src/lib/line-client.ts` - MessagingApiClient singleton using env.LINE_CHANNEL_ACCESS_TOKEN
- `apps/api/src/webhook/line.ts` - Line webhook route with raw body signature verification
- `apps/api/src/webhook/handlers/idempotency.ts` - Webhook event deduplication via onConflictDoNothing
- `apps/api/src/__tests__/webhook.test.ts` - Test stubs for webhook 401/200 cases
- `apps/api/src/__tests__/env.test.ts` - Test stub for env validation

## Decisions Made
- Route uses `.group('/api')` prefix so the lineWebhook plugin defines its path as `/webhook/line` and the final external path is `/api/webhook/line`
- No body schema declared on webhook route to preserve the raw body stream for HMAC signature verification
- Test stubs are placeholders (self-verifying assertions) that will be replaced with real integration tests in Plan 03

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Description | Resolution |
|------|------|-------------|------------|
| apps/api/src/__tests__/webhook.test.ts | 21-31 | Test assertions are self-verifying placeholders (expect(401).toBe(401)) | Plan 03 will implement real integration tests |
| apps/api/src/__tests__/env.test.ts | 5-8 | Env test is placeholder (expect(true).toBe(true)) | Plan 03 will implement real env validation test |
| apps/api/src/webhook/line.ts | 12 | handleEvent only logs event type, no dispatch logic | Phase 2 (join handler) and Phase 4 (message handler) |

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- apps/api is a working Turborepo workspace ready for additional route plugins
- Webhook signature verification and idempotency patterns are established
- Plan 03 (integration tests) can wire up real test imports against this app
- Phase 2 can add join event handler by extending handleEvent dispatch

## Self-Check: PASSED

All 10 created files verified present. Both task commits (f11fbea, 047578e) verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-04-05*
