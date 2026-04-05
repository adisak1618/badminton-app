# Phase 1: Foundation - Research

**Researched:** 2026-04-05
**Domain:** Multi-tenant PostgreSQL schema (Drizzle + Neon), Elysia.js webhook infrastructure, Line signature verification, idempotency, environment variable validation
**Confidence:** HIGH (stack verified against npm registry and official docs)

---

## Summary

Phase 1 builds the lowest-level infrastructure that every subsequent phase depends on: the database schema (with multi-tenant isolation), the Elysia.js API backend in `apps/api`, and the Line webhook endpoint with signature verification and idempotency. None of these can be retrofitted safely once higher-level features exist — the choices made here are permanent architectural constraints.

The project currently has `apps/web` (Next.js) and no `apps/api`. The architecture note in the additional context clarifies that the backend is Elysia.js running as `apps/api` — not Next.js Route Handlers. The prior STACK.md research assumed Next.js Route Handlers for the webhook; that assumption is now overridden by the authoritative architecture decision. The database package (`packages/db`) is also not yet created and must be built from scratch.

The most significant execution risk is Elysia's raw body handling for webhook signature verification. The Line signature algorithm requires the exact raw bytes of the request body before any JSON parsing occurs. Elysia 1.4.x consumes the request stream during its parsing phase; accessing the raw body requires either (a) not declaring a body schema for the route so the body stream is not consumed, then calling `await request.text()` directly, or (b) using the `onParse` lifecycle hook. The confirmed working pattern (from the Stripe webhook article using Elysia 1.4.6) is option (a): omit the body from the route schema and call `await request.text()` inside the handler.

**Primary recommendation:** Create `packages/db` first, define the full Drizzle schema, run one migration against Neon, then build `apps/api` with Elysia. Set up env validation at the start of each app's entry point using `@t3-oss/env-nextjs` for `apps/web` and `@t3-oss/env-core` for `apps/api`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Multi-tenant PostgreSQL schema with club-scoped data isolation | Architecture patterns section: shared-schema multi-tenancy with `club_id` FK; Drizzle schema examples; RLS option documented |
| INFRA-02 | Elysia.js API backend (`apps/api`) with Line webhook endpoint, raw body handling, and signature validation — deployed on Vercel with Bun runtime | Standard Stack section: Elysia 1.4.28, `@line/bot-sdk` 11.0.0; Architecture Pattern 1: Elysia webhook raw body; Vercel deployment config documented |
| INFRA-03 | Webhook idempotency (deduplicate redelivered events) | Don't Hand-Roll section: `idempotency_keys` table; Drizzle `onConflictDoNothing` pattern documented |
| INFRA-04 | Drizzle ORM schema with migrations for all domain tables | Standard Stack section: Drizzle 0.45.2 + drizzle-kit 0.31.10; full schema example with all domain tables |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| elysia | 1.4.28 | HTTP framework for `apps/api` on Bun runtime | Purpose-built for Bun; ergonomic type-safe routing; zero-config Vercel deployment with `bunVersion` |
| @line/bot-sdk | 11.0.0 | `validateSignature()`, webhook types, `MessagingApiClient` | Official SDK; v11 is pure TypeScript, removed axios, smallest footprint; `LineBotClient` replaces deprecated `Client` |
| drizzle-orm | 0.45.2 | Type-safe ORM + schema definition | Serverless-first, no binary, edge-compatible, SQL-transparent; peers with `@neondatabase/serverless >=0.10.0` |
| drizzle-kit | 0.31.10 | Migration generation (`generate`) and execution (`migrate`) | Pairs with drizzle-orm; `drizzle-kit generate` + `drizzle-kit migrate` |
| @neondatabase/serverless | 1.0.2 | Neon PostgreSQL HTTP driver | HTTP driver purpose-built for serverless/Vercel; avoids TCP connection overhead; Vercel Marketplace integration |
| @t3-oss/env-nextjs | 0.13.11 | Type-safe env validation for `apps/web` | Validates `NEXT_PUBLIC_*` and server vars at build time; prevents missing-secret runtime crashes |
| @t3-oss/env-core | 0.13.11 | Type-safe env validation for `apps/api` (Elysia/Bun) | Framework-agnostic; works with Bun's `process.env`; same API as env-nextjs without Next.js assumptions |
| zod | 4.3.6 | Runtime schema validation; required peer dep for t3-oss/env | Used by env validation and for webhook payload parsing |

**Version verification:** All versions confirmed against npm registry on 2026-04-05.
[VERIFIED: npm registry]

### Supporting (Phase 1 scope only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @elysiajs/node | 1.4.5 | Node.js adapter for Elysia (if Node runtime preferred over Bun on Vercel) | Only needed if the Bun Vercel runtime causes issues; default is Bun |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@t3-oss/env-core` for Elysia | `elysia-env` plugin (yolk-oss) | `elysia-env` is a thin Elysia plugin wrapper; `env-core` is framework-agnostic with broader community trust and same maintenance team as env-nextjs |
| Drizzle ORM | Prisma 7 | Prisma 7 (late 2025) dropped the Rust binary and now works on edge; Drizzle is still preferred for cold-start performance and SQL transparency here |

**Installation:**
```bash
# Create packages/db
mkdir -p packages/db/src/schema packages/db/migrations
pnpm --filter db add drizzle-orm @neondatabase/serverless
pnpm --filter db add -D drizzle-kit typescript

# Create apps/api (Elysia backend)
# (directory must be created manually first)
pnpm --filter api add elysia @line/bot-sdk zod @t3-oss/env-core
pnpm --filter api add @repo/db

# apps/web env validation
pnpm --filter web add @t3-oss/env-nextjs zod
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 additions)

```
packages/
  db/                      # NEW — shared database package
    src/
      schema/
        clubs.ts           # clubs table
        members.ts         # members table (global, cross-club)
        club-members.ts    # junction: club membership + roles
        events.ts          # events table (club-scoped)
        registrations.ts   # registrations table
        idempotency-keys.ts # webhook deduplication
        index.ts           # barrel export
      index.ts             # db client + schema re-exports
    migrations/            # generated SQL migration files
    drizzle.config.ts
    package.json           # name: "@repo/db"

apps/
  api/                     # NEW — Elysia.js backend
    src/
      index.ts             # Elysia app entry point (default export)
      env.ts               # @t3-oss/env-core validation
      webhook/
        line.ts            # Line webhook route handler
        handlers/
          message.ts       # message event handler
          join.ts          # bot join event handler
      lib/
        line-client.ts     # MessagingApiClient singleton
    package.json           # name: "api", "type": "module"
    vercel.json            # { "bunVersion": "1.x", "regions": ["hnd1"] }

  web/                     # EXISTING — add env.ts
    src/
      env.ts               # @t3-oss/env-nextjs validation
```

### Pattern 1: Elysia Webhook with Raw Body Signature Verification

**What:** A Elysia route handler for `POST /webhook/line` that reads the raw body as text before any JSON parsing, validates the Line HMAC-SHA256 signature, then dispatches to typed event handlers.

**When to use:** Line Messaging API webhook endpoint in `apps/api`.

**Key insight:** Do NOT declare a `body` in the Elysia route schema for this route. If a body schema is declared, Elysia's parsing phase consumes the readable stream before the handler runs, making `request.text()` fail. With no body schema, the stream is untouched and `request.text()` works. [VERIFIED: Elysia 1.4.6 Stripe webhook pattern from haxiom.io, confirmed consistent with Elysia issue #1511]

**Example:**
```typescript
// apps/api/src/webhook/line.ts
// Source: Elysia 1.4.x raw body pattern (haxiom.io) + LINE validateSignature docs
import { Elysia } from "elysia";
import { validateSignature } from "@line/bot-sdk";
import type { WebhookRequestBody } from "@line/bot-sdk";
import { env } from "../env";

export const lineWebhook = new Elysia()
  .post("/webhook/line", async ({ request, set }) => {
    // MUST call request.text() BEFORE any JSON parsing
    // Do NOT declare body schema on this route — it would consume the stream
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") ?? "";

    if (!validateSignature(rawBody, env.LINE_CHANNEL_SECRET, signature)) {
      set.status = 401;
      return "Unauthorized";
    }

    const payload = JSON.parse(rawBody) as WebhookRequestBody;

    // Return 200 immediately — process events asynchronously
    void handleEvents(payload.events);
    return "OK";
  });
```

**Critical:** Return 200 immediately. Line retries if the response is delayed or fails. Never do synchronous DB writes before returning from the webhook handler.

### Pattern 2: Drizzle Schema with Multi-Tenant Isolation

**What:** All club-scoped tables carry a `club_id` NOT NULL foreign key. Every service function receives `clubId` as a mandatory parameter. The `members` table is the one global exception — keyed by `line_user_id`, shared across clubs.

**When to use:** Every table in the schema except `members` and `idempotency_keys`.

**Example:**
```typescript
// packages/db/src/schema/index.ts
// Source: Drizzle ORM docs (orm.drizzle.team) + project architecture research
import { pgTable, uuid, varchar, timestamp, integer, pgEnum, unique } from "drizzle-orm/pg-core";

export const skillLevelEnum = pgEnum("skill_level", [
  "beginner", "intermediate", "advanced", "competitive"
]);
export const clubRoleEnum = pgEnum("club_role", ["owner", "admin", "member"]);
export const eventStatusEnum = pgEnum("event_status", [
  "draft", "open", "closed", "cancelled"
]);

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  lineGroupId: varchar("line_group_id", { length: 100 }).unique(),
  defaultMaxPlayers: integer("default_max_players").notNull().default(20),
  defaultShuttlecockFee: integer("default_shuttlecock_fee").notNull().default(0),
  defaultCourtFee: integer("default_court_fee").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Global — not per-club, keyed by Line userId
export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineUserId: varchar("line_user_id", { length: 100 }).unique().notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  skillLevel: skillLevelEnum("skill_level").notNull(),
  yearsPlaying: integer("years_playing").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clubMembers = pgTable("club_members", {
  clubId: uuid("club_id").references(() => clubs.id).notNull(),
  memberId: uuid("member_id").references(() => members.id).notNull(),
  role: clubRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.clubId, t.memberId),
]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").references(() => clubs.id).notNull(), // always club-scoped
  title: varchar("title", { length: 255 }).notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  venueName: varchar("venue_name", { length: 255 }),
  venueMapsUrl: varchar("venue_maps_url", { length: 500 }),
  shuttlecockFee: integer("shuttlecock_fee").notNull().default(0),
  courtFee: integer("court_fee").notNull().default(0),
  maxPlayers: integer("max_players").notNull().default(20),
  status: eventStatusEnum("status").notNull().default("draft"),
  lineMessageId: varchar("line_message_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const registrations = pgTable("registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  memberId: uuid("member_id").references(() => members.id).notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.eventId, t.memberId), // prevents duplicate registration
]);

export const idempotencyKeys = pgTable("idempotency_keys", {
  webhookEventId: varchar("webhook_event_id", { length: 100 }).primaryKey(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});
```

### Pattern 3: Idempotency via `onConflictDoNothing`

**What:** Before processing any webhook event, attempt to insert the `webhookEventId` into `idempotency_keys`. If the insert succeeds, process the event. If it conflicts (duplicate delivery), skip processing silently.

**When to use:** At the start of every webhook event handler in `apps/api`.

**Example:**
```typescript
// Source: Drizzle ORM docs (orm.drizzle.team/docs/insert)
import { db, idempotencyKeys } from "@repo/db";

async function processWithIdempotency(
  webhookEventId: string,
  handler: () => Promise<void>
): Promise<void> {
  const result = await db
    .insert(idempotencyKeys)
    .values({ webhookEventId })
    .onConflictDoNothing()
    .returning();

  // result is empty array if conflict (already processed)
  if (result.length === 0) {
    return; // duplicate — skip silently
  }

  await handler();
}
```

[VERIFIED: Drizzle ORM docs — `onConflictDoNothing()` returns empty array on conflict]

### Pattern 4: Elysia Entry Point for Vercel (Bun Runtime)

**What:** Elysia app exported as a default export (not using `.listen()`), with `vercel.json` specifying the Bun runtime and Tokyo region.

**Example:**
```typescript
// apps/api/src/index.ts
// Source: Vercel Elysia docs (vercel.com/docs/frameworks/backend/elysia)
import { Elysia } from "elysia";
import { lineWebhook } from "./webhook/line";

const app = new Elysia()
  .use(lineWebhook)
  .get("/health", () => ({ status: "ok" }));

// Must use default export — NOT app.listen() — for Vercel
export default app;
```

```json
// apps/api/vercel.json
// Source: Vercel Elysia docs + STATE.md (hnd1 Tokyo region decision)
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "bunVersion": "1.x",
  "regions": ["hnd1"]
}
```

[VERIFIED: vercel.com/docs/frameworks/backend/elysia]

### Pattern 5: Environment Validation at Startup

**What:** Validate all required environment variables at module import time. A missing variable crashes the process with a descriptive error at startup — not silently at runtime when the variable is first accessed.

**For `apps/api` (Elysia/Bun) — use `@t3-oss/env-core`:**
```typescript
// apps/api/src/env.ts
// Source: env.t3.gg/docs/core
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    LINE_CHANNEL_SECRET: z.string().min(1),
    LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
    DATABASE_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
```

**For `apps/web` (Next.js) — use `@t3-oss/env-nextjs`:**
```typescript
// apps/web/src/env.ts
// Source: env.t3.gg/docs/nextjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
  },
  client: {
    NEXT_PUBLIC_LIFF_ID: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

### Pattern 6: Drizzle Config and DB Client

**What:** `packages/db/drizzle.config.ts` for migration tooling; `packages/db/src/index.ts` for the runtime DB client exported to consuming apps.

**Example:**
```typescript
// packages/db/drizzle.config.ts
// Source: STACK.md (verified against Drizzle docs)
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

```typescript
// packages/db/src/index.ts
// Source: STACK.md (verified against orm.drizzle.team/docs/connect-neon)
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export * from "./schema";
export * from "./schema/index"; // ensure all types exported
```

### Pattern 7: Cross-Tenant Isolation Integration Test

**What:** A test that attempts to read Club B's events while authenticated as Club A, asserting that the result is empty. This verifies that `club_id` scoping is enforced.

**When to use:** As a phase gate test for INFRA-01.

**Example structure (Bun test):**
```typescript
// packages/db/src/__tests__/tenant-isolation.test.ts
// Framework: Bun test runner (built-in, no install needed)
import { describe, it, expect, beforeAll } from "bun:test";

describe("cross-tenant isolation", () => {
  it("club A events are not visible to club B query scope", async () => {
    // seed club A with an event
    // query events WHERE club_id = clubB.id
    // expect result to be empty
  });
});
```

### Anti-Patterns to Avoid

- **Declaring a body schema on the Line webhook route:** Causes Elysia to consume the request stream before the handler runs; `request.text()` returns empty string; signature verification always fails.
- **Using `app.listen()` in `apps/api/src/index.ts`:** Vercel requires a default export of the Elysia app instance. `listen()` is for standalone servers; it breaks Vercel Functions deployment.
- **Hardcoding `clubId` in queries:** Every data query must receive and enforce `clubId` as a parameter. Hardcoding it is a multi-tenancy violation waiting to leak to production.
- **Calling `JSON.parse` before `validateSignature`:** The HMAC signature is computed against exact raw bytes. Any transformation (re-serialization, whitespace changes) invalidates the signature.
- **Skipping idempotency for "simple" events:** Line's own documentation states webhooks may be redelivered. Without the `idempotency_keys` table, any cold-start delay or transient DB error triggers a duplicate. Build idempotency in Phase 1, not as a retrofit.
- **Using `@vercel/postgres` package:** Deprecated — Vercel migrated all Vercel Postgres stores to Neon between Q4 2024–Q1 2025. Use `@neondatabase/serverless` directly. [VERIFIED: STACK.md + Neon Vercel integration docs]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line signature verification | Custom HMAC-SHA256 implementation | `validateSignature()` from `@line/bot-sdk` | Handles timing-safe comparison; uses correct UTF-8 encoding; maintained by LINE |
| Env validation at startup | Custom `if (!process.env.X) throw` checks | `@t3-oss/env-core` / `@t3-oss/env-nextjs` | Type-safe schema, descriptive error messages, build-time validation for Next.js, zero maintenance |
| Webhook idempotency table | Custom lock table + application-level deduplication | `idempotency_keys` table + `onConflictDoNothing()` | PostgreSQL unique constraint is atomic; handles concurrent deliveries that application-level checks cannot |
| Database migrations | Manual SQL files | `drizzle-kit generate` + `drizzle-kit migrate` | Type-safe, version-controlled, repeatable; handles destructive change detection |
| Neon connection pooling | Custom connection pool | `@neondatabase/serverless` HTTP driver | HTTP is stateless; TCP pools are wrong for serverless where each invocation creates a new process |

**Key insight:** The webhook signature verification and idempotency patterns look simple but have critical edge cases (timing attacks on string comparison, race conditions on concurrent delivery). Both are already solved correctly in battle-tested libraries.

---

## Common Pitfalls

### Pitfall 1: Elysia Consumes Request Stream When Body Schema Is Declared

**What goes wrong:** Developer declares `body: t.Any()` or similar in the Elysia route definition for the webhook route. Elysia's parse phase reads and consumes the stream. `await request.text()` inside the handler returns an empty string. `validateSignature()` is called with empty string, always returns false. Every webhook returns 401.

**Why it happens:** Elysia's type system encourages declaring body schemas for all routes. The webhook route is the one exception where body must NOT be schema-declared. [VERIFIED: Elysia issue #1511, haxiom.io Stripe webhook article for Elysia 1.4.6]

**How to avoid:** Do not declare `body` in the route config for the webhook endpoint. Access body only via `request.text()`.

**Warning signs:** All webhook requests return 401; local testing with `curl -H "X-Line-Signature: ..."` also fails.

### Pitfall 2: `app.listen()` Breaks Vercel Deployment

**What goes wrong:** Developer calls `app.listen(3000)` in `apps/api/src/index.ts`. Vercel detects the entry point but the app fails to respond because Vercel Functions require a request handler, not a long-running process.

**Why it happens:** Elysia local development uses `.listen(port)`. The Vercel deployment pattern is different — export the app as default.

**How to avoid:** Use `export default app` only. For local development, create a separate `dev.ts` that calls `app.listen(3000)`, not imported in production. [VERIFIED: vercel.com/docs/frameworks/backend/elysia]

**Warning signs:** Vercel deployment succeeds (build passes) but all requests return 500 or timeout.

### Pitfall 3: Missing `club_id` Filter in Queries (Cross-Tenant Leak)

**What goes wrong:** A query like `db.select().from(events)` without `.where(eq(events.clubId, clubId))` returns events from all clubs. An admin sees data from other clubs. [CITED: PITFALLS.md from project research]

**Why it happens:** Early prototyping with a single club in the database; missing filter has no visible effect until a second club is seeded.

**How to avoid:** Write the cross-tenant isolation test (Pattern 7) before any event query function is written. The test forces all query functions to accept and enforce `clubId`.

**Warning signs:** `db.select().from(events)` or similar without a `clubId` WHERE clause anywhere in the codebase.

### Pitfall 4: `onConflictDoNothing` Returns Empty Array — Don't Treat It as an Error

**What goes wrong:** Developer checks `if (!result)` after an idempotency insert and throws an error. On duplicate delivery, the empty array result triggers the error check, and the handler throws instead of returning 200 gracefully.

**Why it happens:** Drizzle's `onConflictDoNothing().returning()` intentionally returns `[]` on conflict, not null. Developers unfamiliar with this behavior write defensive checks that misinterpret the empty array. [VERIFIED: Drizzle ORM docs, issue #2474]

**How to avoid:** Check `result.length === 0` to detect a duplicate. Return 200 silently. Log it if desired but never throw.

### Pitfall 5: Neon `DATABASE_URL` Must Be the Pooled Connection String

**What goes wrong:** Developer uses the direct (non-pooled) Neon connection string. Under serverless load, each function invocation opens a new TCP connection. Neon limits direct connections; the app starts rejecting connections under moderate load.

**Why it happens:** Neon provides both pooled and direct connection strings. The direct string is labeled as the "primary" string in the dashboard.

**How to avoid:** Use the pooled connection string (contains `pooler.` in the hostname) for `DATABASE_URL` in production. The `@neondatabase/serverless` HTTP driver also bypasses TCP entirely for single transactions — this is the preferred pattern for serverless. [ASSUMED]

**Warning signs:** `too many connections` PostgreSQL errors under load; connection limit errors in Vercel function logs.

---

## Runtime State Inventory

Step 2.5 SKIPPED — Phase 1 is greenfield. No existing data, no stored runtime state, no rename/refactor actions.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `apps/web` build, pnpm scripts | Yes | v25.8.2 | — |
| Bun | `apps/api` runtime, `bun test` | Yes | 1.1.29 | Node.js + @elysiajs/node adapter |
| pnpm | Monorepo package management | Yes | 9.14.2 | — |
| Neon PostgreSQL | Database layer | Not verified locally | — | Local PostgreSQL (docker) for dev/test |
| Vercel CLI | Deployment | Not checked | — | Push to git + Vercel GitHub integration |

**Note on Neon:** `DATABASE_URL` must be configured in `.env.local` before migration commands can run. The migration step in the plan must include provisioning the Neon database or providing a local PostgreSQL fallback for development. [ASSUMED: Neon account and project not pre-created]

**Missing dependencies with no fallback:** None that block Phase 1 implementation. A Neon database URL is required before running migrations, but this is a configuration step, not a tooling gap.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in, no install) |
| Config file | None — Bun discovers `*.test.ts` files automatically |
| Quick run command | `bun test --filter packages/db` |
| Full suite command | `bun test` |

**Rationale:** Bun 1.1.29 is available and has a built-in test runner compatible with the Jest API (`describe`, `it`, `expect`, `beforeAll`). No separate test framework install is needed. `vitest` is an acceptable alternative if cross-runtime compatibility is needed, but Bun test is zero-config for this stack.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INFRA-01 | Club A `clubId` filter excludes Club B events | Integration | `bun test packages/db/src/__tests__/tenant-isolation.test.ts` | No — Wave 0 |
| INFRA-02 | POST with invalid signature returns 401 | Integration | `bun test apps/api/src/__tests__/webhook.test.ts` | No — Wave 0 |
| INFRA-02 | POST with valid signature returns 200 | Integration | `bun test apps/api/src/__tests__/webhook.test.ts` | No — Wave 0 |
| INFRA-03 | Duplicate `webhookEventId` does not create second DB row | Integration | `bun test packages/db/src/__tests__/idempotency.test.ts` | No — Wave 0 |
| INFRA-04 | Migration runs against Neon and all tables exist | Smoke | Manual (`drizzle-kit migrate` + schema introspection) | No — Wave 0 |
| ENV | Missing `LINE_CHANNEL_SECRET` causes startup error | Unit | `bun test apps/api/src/__tests__/env.test.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `bun test --filter {changed_package}`
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `packages/db/src/__tests__/tenant-isolation.test.ts` — REQ INFRA-01
- [ ] `packages/db/src/__tests__/idempotency.test.ts` — REQ INFRA-03
- [ ] `apps/api/src/__tests__/webhook.test.ts` — REQ INFRA-02
- [ ] `apps/api/src/__tests__/env.test.ts` — ENV startup validation
- [ ] `packages/db/package.json` test script — `"test": "bun test"`
- [ ] `apps/api/package.json` test script — `"test": "bun test"`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase 1 has no user auth (webhook signature only) |
| V3 Session Management | No | No sessions in Phase 1 |
| V4 Access Control | Yes (multi-tenancy) | `club_id` mandatory FK + query filter; integration test as gate |
| V5 Input Validation | Yes | `validateSignature` guards webhook; `@t3-oss/env-core` validates env; `JSON.parse` after signature check |
| V6 Cryptography | Yes | `validateSignature()` from `@line/bot-sdk` — HMAC-SHA256 with timing-safe comparison; never hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged webhook events | Spoofing | `validateSignature()` before any processing; return 401 on failure |
| Cross-tenant data read | Information Disclosure | `club_id` WHERE clause on every club-scoped query; integration test |
| Webhook replay / duplicate processing | Tampering | `idempotency_keys` table + `onConflictDoNothing()` |
| Missing env vars at startup | Denial of Service (silent misconfiguration) | `@t3-oss/env-core` / `@t3-oss/env-nextjs` — crashes loudly at startup |
| Request body altered before signature check | Tampering | Call `request.text()` first; never parse body before `validateSignature` |

---

## Code Examples

### Drizzle `packages/db` — package.json

```json
{
  "name": "@repo/db",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "test": "bun test"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.2",
    "@neondatabase/serverless": "^1.0.2"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.10",
    "typescript": "^5.9.2"
  }
}
```

### Elysia `apps/api` — package.json

```json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist",
    "test": "bun test"
  },
  "dependencies": {
    "elysia": "^1.4.28",
    "@line/bot-sdk": "^11.0.0",
    "zod": "^4.3.6",
    "@t3-oss/env-core": "^0.13.11",
    "@repo/db": "workspace:*"
  }
}
```

### Turborepo `turbo.json` — add `db:migrate` task

```json
{
  "tasks": {
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/postgres` package | `@neondatabase/serverless` direct | Q4 2024–Q1 2025 | `@vercel/postgres` is deprecated; do not use |
| `Client` class from `@line/bot-sdk` | `LineBotClient` / `MessagingApiClient` | v10.8 deprecated, removed v11 | Use new class names; `Client` will throw at import |
| `line.middleware()` (Express) | Manual `validateSignature()` call | N/A — architecture change | Express middleware is incompatible with Elysia/Bun |
| Next.js Route Handlers for webhook | Elysia.js in `apps/api` | Phase 1 architecture decision | Separate API service; different raw body pattern |

**Deprecated/outdated:**
- `@vercel/postgres`: Replaced by `@neondatabase/serverless`. Using it will break.
- `@line/bot-sdk` v9/v10 `Client` class: Removed in v11. Do not install `<11.x`.
- `next-iron-session`: Use `iron-session` v8 (relevant for `apps/web`, not Phase 1 API).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Neon database has not been provisioned yet; `DATABASE_URL` is not in `.env` | Environment Availability | Low risk: if Neon is already set up, the migration task is easier, not harder |
| A2 | The pooled Neon connection string is required in production | Common Pitfalls (Pitfall 5) | Medium: if non-pooled works fine at Phase 1 scale (single club dev), no immediate impact; becomes critical at scale |
| A3 | `apps/api` directory does not yet exist and must be scaffolded | Architecture | Low: confirmed by `ls apps/` showing only `web` and `docs` |
| A4 | Elysia's `request.text()` pattern (no body schema on webhook route) works in Bun 1.1.29 + Elysia 1.4.28 | Pattern 1 | High: if this pattern breaks in newer Elysia, the entire webhook verification approach needs revision. Verified for 1.4.6 (Stripe article), assumed compatible with 1.4.28 |

---

## Open Questions

1. **Elysia raw body: confirm `request.text()` works in Elysia 1.4.28 on Bun**
   - What we know: The pattern works in Elysia 1.4.6 (Stripe webhook article). Elysia 1.4.28 is the current version (March 2026). No breaking change found in changelog between 1.4.6 and 1.4.28 affecting body stream handling.
   - What's unclear: Whether a minor Elysia update between 1.4.6 and 1.4.28 altered stream consumption behavior.
   - Recommendation: Write a smoke test as the first task: `POST /webhook/line` with a known-good body and signature, assert `validateSignature` succeeds. Fail fast if body is empty.

2. **Should `packages/db` use the HTTP driver or `ws` (WebSocket) driver for local development?**
   - What we know: `@neondatabase/serverless` supports both HTTP (`neon(url)`) and WebSocket (`Pool`) modes. HTTP is stateless and correct for serverless functions. WebSocket maintains a persistent connection, which is better for long-running processes (not applicable here).
   - What's unclear: For `drizzle-kit migrate` (a CLI command, not a serverless function), whether the HTTP driver introduces any limitations.
   - Recommendation: Use HTTP driver (`drizzle-orm/neon-http`) for consistency. `drizzle-kit` uses the connection string directly and bypasses the driver choice.

3. **`apps/api` Turborepo build pipeline: what outputs does it produce?**
   - What we know: Elysia on Vercel uses a default export and does not need a compile step — Vercel handles TypeScript via Bun's built-in transpiler. For local dev, `bun run src/index.ts` runs without compilation.
   - What's unclear: Whether `turbo.json` needs an `outputs` entry for `apps/api` (Vercel does not use `.next/**` for Elysia).
   - Recommendation: Add `api` build task to `turbo.json` with no outputs (or `dist/**`) and `cache: false`.

---

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view` commands) — all package versions verified 2026-04-05
- [vercel.com/docs/frameworks/backend/elysia](https://vercel.com/docs/frameworks/backend/elysia) — Elysia Vercel deployment, `bunVersion`, default export requirement, `app.listen()` limitation
- [developers.line.biz/en/docs/messaging-api/verify-webhook-signature/](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/) — LINE HMAC-SHA256 signature algorithm and raw body requirement
- [orm.drizzle.team/docs/indexes-constraints](https://orm.drizzle.team/docs/indexes-constraints) — unique constraint syntax, composite unique on multiple columns
- [env.t3.gg/docs/core](https://env.t3.gg/docs/core) — `@t3-oss/env-core` usage for non-Next.js frameworks

### Secondary (MEDIUM confidence)
- [pages.haxiom.io — Handling Stripe Webhooks in Elysia](https://pages.haxiom.io/@zeon256/Handling-Stripe-Webhooks-in-Elysia) — Elysia 1.4.6 raw body pattern: omit body schema, use `request.text()` [cross-referenced with Elysia issue #1511]
- [elysiajs.com/integrations/vercel](https://elysiajs.com/integrations/vercel) — `vercel.json` `bunVersion` config
- [github.com/elysiajs/elysia/issues/1511](https://github.com/elysiajs/elysia/issues/1511) — confirmed body stream consumption behavior in Elysia parse phase
- Project STACK.md, ARCHITECTURE.md, PITFALLS.md — prior research

### Tertiary (LOW confidence)
- [github.com/mugencraft/turbobun](https://github.com/mugencraft/turbobun) — Turborepo + Bun + Elysia monorepo structure reference (community boilerplate)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all versions verified against npm registry 2026-04-05; APIs verified against official docs
- Architecture (Elysia Vercel deploy): HIGH — official Vercel docs confirm default export pattern
- Elysia raw body pattern: MEDIUM-HIGH — verified for Elysia 1.4.6 (Stripe); assumed compatible with 1.4.28 (no breaking changes found); smoke test recommended to confirm
- Drizzle schema patterns: HIGH — official Drizzle docs
- Idempotency (`onConflictDoNothing`): HIGH — official Drizzle docs + known PostgreSQL behavior
- Pitfalls: HIGH — combination of official LINE docs, Elysia GitHub issues, and prior project research

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable stack; Elysia minor versions release frequently but raw body behavior is unlikely to change)
