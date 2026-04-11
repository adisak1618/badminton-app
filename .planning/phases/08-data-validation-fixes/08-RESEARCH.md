# Phase 8: Data Validation Fixes - Research

**Researched:** 2026-04-11
**Domain:** API validation alignment, Next.js environment access
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Shrink API validation maxLength from 500 to 255 to match DB varchar(255). No DB migration needed.
- **D-02:** Replace `process.env.NEXT_PUBLIC_LIFF_ID` in `apps/web/app/liff/layout.tsx` with import from `apps/web/lib/env.ts` validated env module.

### Claude's Discretion
None — both fixes are fully specified.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVNT-01 | Admin creates a one-time event with date+time, venue name + Google Maps link, shuttlecock fee, court fee, max players | Fix venueName maxLength mismatch so valid API input cannot exceed DB column capacity |
| BOT-01 | Bot posts a Flex Message card with event info, Register/Details CTA | LIFF_ID must come from validated env to ensure the LIFF initialises correctly in the card's CTA |
</phase_requirements>

## Summary

Phase 8 closes two integration gaps found in the v1.0 milestone audit. Both fixes are single-line changes in well-understood files — no new libraries, no DB migration, no architectural decisions.

**Fix 1 — venueName maxLength:** The API TypeBox schema at `apps/api/src/routes/events.ts` line 148 declares `maxLength: 500` for `venueName`, but the DB column `packages/db/src/schema/events.ts` line 13 is `varchar("venue_name", { length: 255 })`. A 256-500 character venue name passes API validation but causes a Postgres truncation error (or silent truncation depending on Postgres mode). The fix is to change the TypeBox constraint to `maxLength: 255`. [VERIFIED: direct codebase read]

**Fix 2 — LIFF_ID env access:** `apps/web/app/liff/layout.tsx` reads `process.env.NEXT_PUBLIC_LIFF_ID` directly (line 5), bypassing the validated env module at `apps/web/lib/env.ts`. If the env var is missing, the layout silently passes an empty string to `LiffProvider`. The validated module throws at startup instead of producing a broken LIFF. The fix is to import `env` from `@/lib/env` and use `env.NEXT_PUBLIC_LIFF_ID`. [VERIFIED: direct codebase read]

**Primary recommendation:** Two targeted one-line edits. No migration, no new dependencies.

## Standard Stack

### Core (relevant to this phase)

| Library | Current Usage | Purpose |
|---------|--------------|---------|
| TypeBox (`@sinclair/typebox`) | API route body schemas | Runtime validation in Elysia routes |
| `@t3-oss/env-nextjs` | `apps/web/lib/env.ts` | Validated env with Zod, throws on missing vars |
| Drizzle ORM | `packages/db/src/schema/events.ts` | DB schema — varchar length is the authoritative limit |

[VERIFIED: direct codebase read]

No new libraries required.

## Architecture Patterns

### Existing Pattern: TypeBox maxLength constraint (API)

```typescript
// apps/api/src/routes/events.ts ~line 148
// BEFORE (mismatched):
venueName: t.String({ minLength: 1, maxLength: 500 }),

// AFTER (aligned with DB):
venueName: t.String({ minLength: 1, maxLength: 255 }),
```

[VERIFIED: codebase read, line 148]

### Existing Pattern: Validated env import (Next.js)

```typescript
// apps/web/app/liff/layout.tsx
// BEFORE (raw process.env):
const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";

// AFTER (validated module):
import { env } from "@/lib/env";
// ...
const liffId = env.NEXT_PUBLIC_LIFF_ID;
```

The `env` object from `@t3-oss/env-nextjs` already exports `NEXT_PUBLIC_LIFF_ID` in the `client` block with `z.string().min(1)`. [VERIFIED: codebase read, apps/web/lib/env.ts line 14]

### Layout file is a Server Component

`liff/layout.tsx` has no `"use client"` directive, so it is a Next.js Server Component. [VERIFIED: codebase read] The `env` import from `@/lib/env` works in both server and client contexts because `@t3-oss/env-nextjs` exports a merged object — client vars are safe to read on the server. The `NEXT_PUBLIC_LIFF_ID` is in the `client` block, which means it is also bundled into the client bundle.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Env validation | Manual `if (!process.env.X) throw` guards | `@t3-oss/env-nextjs` — already in place |
| API input length cap | Custom middleware | TypeBox `maxLength` constraint — already in use |

## Common Pitfalls

### Pitfall 1: Forgetting `minLength` when editing `maxLength`
**What goes wrong:** Developer touches the `venueName` constraint and accidentally removes `minLength: 1`.
**How to avoid:** Edit only the `maxLength` value; leave `minLength: 1` intact.

### Pitfall 2: Adding `"use client"` unnecessarily to layout
**What goes wrong:** Thinking the env import requires client context and adding the directive, which forces the entire layout subtree to be client-rendered.
**How to avoid:** `@t3-oss/env-nextjs` client vars are accessible on the server. No directive change needed.

### Pitfall 3: Keeping the `|| ""` fallback
**What goes wrong:** Leaving `env.NEXT_PUBLIC_LIFF_ID || ""` loses the validation benefit — the module already guarantees non-empty.
**How to avoid:** Use `env.NEXT_PUBLIC_LIFF_ID` directly without a fallback.

## Code Examples

### Verified: env.ts client block
```typescript
// apps/web/lib/env.ts (verified)
client: {
  NEXT_PUBLIC_LIFF_ID: z.string().min(1),
},
experimental__runtimeEnv: {
  ...process.env,
  NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID,
},
```
[VERIFIED: codebase read]

### Verified: DB column (authoritative limit)
```typescript
// packages/db/src/schema/events.ts line 13 (verified)
venueName: varchar("venue_name", { length: 255 }),
```
[VERIFIED: codebase read]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | To be confirmed — check for existing test config |
| Quick run command | `bun test` or per-package test script |
| Full suite command | Same |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| EVNT-01 | venueName > 255 chars rejected at API layer | unit | Test TypeBox schema rejects length 256 |
| EVNT-01 | venueName = 255 chars accepted | unit | Boundary: exactly 255 should pass |
| BOT-01 | LIFF layout renders with env.NEXT_PUBLIC_LIFF_ID | smoke/manual | Next.js Server Component; env validated at startup |

### Wave 0 Gaps
- Confirm test runner setup for `apps/api` (bun test, vitest, or jest)
- Add test case for venueName maxLength boundary if not already present

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js layout.tsx is a Server Component (no "use client" directive) | Architecture Patterns | If client component, env import still works but confirms no directive needed |

## Open Questions

1. **Test runner for apps/api**
   - What we know: TypeBox validation is in events.ts; no test file was checked
   - What's unclear: Whether a unit test for the schema constraint already exists
   - Recommendation: Check `apps/api/src/routes/events.test.ts` or similar in Wave 0; add boundary test if absent

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code edits; no external service or CLI dependencies.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | TypeBox maxLength on API body — aligning to DB reality |
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized input bypassing validation and causing DB error/truncation | Tampering | Set maxLength = DB column length in API schema |

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `apps/api/src/routes/events.ts` line 148 — venueName maxLength: 500 confirmed
- Direct codebase read: `packages/db/src/schema/events.ts` line 13 — varchar(255) confirmed
- Direct codebase read: `apps/web/lib/env.ts` — NEXT_PUBLIC_LIFF_ID in client block confirmed
- Direct codebase read: `apps/web/app/liff/layout.tsx` line 5 — raw process.env usage confirmed

## Metadata

**Confidence breakdown:**
- What to change: HIGH — both locations verified by direct file read
- How to change: HIGH — patterns already established in codebase
- Test impact: MEDIUM — test runner for apps/api not checked in this session

**Research date:** 2026-04-11
**Valid until:** Until codebase changes (stable — no external dependencies)
