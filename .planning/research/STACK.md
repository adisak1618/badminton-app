# Stack Research

**Domain:** Line Bot + LIFF + Badminton Club Management (multi-tenant SaaS on Vercel)
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH (core stack well-verified; Line-specific patterns partially from official docs)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.0 (already installed) | Web app, LIFF pages, webhook Route Handlers | Already in project; App Router Route Handlers handle Line webhook natively; single deploy to Vercel covers all endpoints |
| @line/bot-sdk | ^11.x | Line Messaging API client, signature verification, Flex Messages | Official SDK; v11 is pure TypeScript, removed axios, only `@types/node` dependency — smallest footprint yet; `LineBotClient` replaces deprecated `Client` class |
| @line/liff | ^2.28.x | LIFF SDK for member-facing mini-app pages | Official SDK; TypeScript definitions included; must run client-side only |
| Drizzle ORM | ^0.41.x | Type-safe database queries and schema | Smaller bundle than Prisma (~90% less), no native binary, edge-compatible, SQL-visible queries; critical for Vercel cold-start performance; schema written in TypeScript (no `.prisma` file) |
| @neondatabase/serverless | ^0.10.x | Neon PostgreSQL HTTP driver | Purpose-built for serverless/Vercel; HTTP driver is faster than TCP for single transactions; integrates natively with Vercel Marketplace (billing via Vercel, free tier sufficient for early phase) |
| drizzle-kit | ^0.30.x | Migration generation and running | Pairs with Drizzle ORM; `drizzle-kit generate` + `drizzle-kit migrate` |
| iron-session | ^8.x | Encrypted cookie sessions for server-side identity | Stateless, no DB session table needed; stores verified Line userId in an encrypted cookie after LIFF token verification; works in Next.js App Router with `cookies()` |
| TypeScript | 5.9.2 (already installed) | Type safety across the entire monorepo | Already in project |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest (CLI-installed) | UI component primitives for LIFF pages and web admin | Built on Radix primitives; Tailwind-first; copy-owned components; Tailwind v4 support as of 2025. Use for all UI in the web app and LIFF pages |
| Tailwind CSS | ^4.x | Utility-first styling | Pairs with shadcn/ui; v4 uses `@theme` directive, no separate `tailwind.config.js` needed |
| jose | ^5.x | JWT utilities for Edge Runtime | Used internally by iron-session; also useful if you need to verify Line ID tokens directly on the server without a full auth library |
| zod | ^3.x | Runtime schema validation | Validate webhook event payloads, LIFF API request bodies, and environment variables at startup |
| @t3-oss/env-nextjs | ^0.11.x | Type-safe environment variable validation | Validates all `NEXT_PUBLIC_*` and server env vars at build time; prevents missing-secret runtime crashes |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm workspaces | Monorepo package management | Already configured; use `pnpm --filter web add <pkg>` to add to a specific app |
| Turborepo | Build caching and task orchestration | Already configured at v2.9.3 |
| drizzle-kit studio | Visual DB browser during development | Run `pnpm drizzle-kit studio` — opens a local Drizzle Studio UI |
| Line Developers Console | Channel creation, LIFF app registration | Required to create Messaging API channel, OA, and register LIFF endpoints. Not a code tool |
| Flex Message Simulator | Design Flex Messages visually | Official LINE tool at developers.line.biz; design cards, export JSON, then translate to SDK types |
| ngrok / localtunnel | Local webhook testing | Line requires HTTPS for webhook URL; tunnel localhost during development |

---

## Installation

```bash
# In apps/web — Line SDKs
pnpm --filter web add @line/bot-sdk @line/liff

# In packages/db (create this package) — ORM and driver
pnpm --filter db add drizzle-orm @neondatabase/serverless
pnpm --filter db add -D drizzle-kit

# In apps/web — session + validation
pnpm --filter web add iron-session jose zod @t3-oss/env-nextjs

# UI components (run in apps/web)
pnpm --filter web add -D tailwindcss @tailwindcss/postcss
# Then initialise shadcn: pnpm dlx shadcn@latest init
```

---

## Monorepo Package Structure

The existing Turborepo scaffold has `packages/ui`. Add one more shared package:

```
packages/
  db/            ← NEW: Drizzle schema, migrations, db client
    src/
      schema/    ← All table definitions (users, clubs, events, registrations)
      index.ts   ← exports db client + all schema types
    drizzle.config.ts
  ui/            ← existing: shared React components
  eslint-config/ ← existing
  typescript-config/ ← existing
apps/
  web/           ← Next.js: web app + LIFF pages + webhook Route Handler
```

The `packages/db` pattern is the standard for Turborepo + Drizzle monorepos (multiple community boilerplates confirm this). It lets `apps/web` import schema types directly: `import { users, clubs } from "@repo/db"`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Drizzle ORM | Prisma | Prisma 7 (late 2025) removed the Rust binary and now works on edge. Choose Prisma if your team is more familiar with it and you value the larger ecosystem of examples. For this project, Drizzle is preferred for cold-start performance and SQL transparency. |
| Neon (serverless) | Supabase PostgreSQL | Supabase bundles more (auth, storage, realtime) — overkill here because Line Login replaces Supabase Auth. Neon's Vercel Marketplace integration is a cleaner fit for a Vercel-deployed app. |
| Neon (serverless) | Railway PostgreSQL | Railway is simpler to reason about (always-on) but costs more at scale and lacks the Vercel-native branching story. Prefer Railway only if scale-to-zero cold start latency is unacceptable in production. |
| iron-session | NextAuth.js / Auth.js | NextAuth is appropriate when you need multiple OAuth providers, email magic links, or a managed session DB table. Here, Line Login is the only identity provider and LIFF provides the token — iron-session with manual token verification is simpler and has fewer moving parts. |
| @line/bot-sdk v11 | Older v9/v10 with `Client` class | Don't pin to v9/v10. The `Client` class was deprecated in v10.8 and removed in v11. Use `LineBotClient` going forward. |
| Route Handler (App Router) | Pages Router `/api` routes | The project uses Next.js 16 with App Router already. Route Handlers use the Web Fetch API (`request.text()` for raw body) which is the correct pattern for Line signature verification without Express middleware. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `line.middleware()` (Express middleware) | Requires Express connect-style `req`/`res`. Not compatible with Next.js App Router Route Handlers which use Web Fetch `Request`/`Response`. | Call `line.validateSignature(rawBody, channelSecret, signature)` manually in your Route Handler, then parse the JSON yourself. |
| Sending `liff.getProfile()` result directly to backend | LINE's own security guidance warns against this. The frontend-supplied userId can be forged. | Send `liff.getAccessToken()` to your backend, verify it server-side with `GET /oauth2/v2.1/verify`, then call `GET /v2/profile` with the verified token. |
| `next-iron-session` (old package) | Deprecated predecessor to `iron-session` v8. | Use `iron-session` v8 which has native App Router support via `getIronSession(cookies(), options)`. |
| TypeORM / Sequelize | Heavy, older ORMs with poor TypeScript inference and no serverless story. | Drizzle ORM. |
| `liff.init()` in a Server Component | LIFF SDK is browser-only. Calling it in a Server Component will fail at build/runtime. | Mark all LIFF-initialising components with `"use client"` and call `liff.init()` inside a `useEffect`. |
| Vercel Postgres (legacy) | Vercel migrated all Vercel Postgres stores to Neon between Q4 2024 and Q1 2025. The `@vercel/postgres` package is now deprecated. | Use `@neondatabase/serverless` with Drizzle directly. |
| `dynamic(() => import("@line/liff"), { ssr: false })` without fallback | LIFF is meaningless outside the Line browser. If you do dynamic import with `ssr: false`, the server render returns nothing useful — plan your loading states explicitly. | Wrap LIFF-dependent UI in a client component that shows a loading skeleton until `liff.ready` resolves. |

---

## Stack Patterns by Variant

**For the Line webhook endpoint (`POST /api/webhook`):**
- Use a Next.js App Router Route Handler at `app/api/webhook/route.ts`
- Call `request.text()` to get raw body string
- Call `line.validateSignature(rawBody, channelSecret, xLineSignature)` before parsing JSON
- Parse with `JSON.parse(rawBody)` and cast to `line.WebhookRequestBody`
- Keep handler thin — dispatch to domain functions, do not write business logic inline

**For LIFF pages (member registration, profile):**
- Create pages under `app/liff/[page]/page.tsx`
- Mark with `"use client"` at the top of the component tree
- `liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID })` inside `useEffect` with a loading gate
- After init, call `liff.getAccessToken()`, POST it to your own API route for server-side verification
- Use `iron-session` to store the verified `lineUserId` in an encrypted cookie for subsequent API calls

**For the club admin web pages:**
- Standard Next.js App Router Server Components + Route Handlers
- Session from `iron-session` cookie — no separate admin auth library needed in Phase 1
- Use `packages/db` schema types for full-stack type safety

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @line/bot-sdk ^11.x | Node.js >=18 | Project already requires Node >=18. v11 removed axios entirely. |
| @line/liff ^2.28.x | React 19, Next.js 16 | LIFF SDK must run client-side only; no SSR support. `"use client"` required. |
| drizzle-orm ^0.41.x | @neondatabase/serverless ^0.10.x | Use `drizzle-orm/neon-http` import path with the neon HTTP driver. |
| iron-session ^8.x | Next.js 16 App Router | v8 API: `getIronSession(await cookies(), sessionOptions)` in Server Components / Route Handlers. |
| Tailwind CSS ^4.x | shadcn/ui (2025 versions) | shadcn updated all components for Tailwind v4 in 2025. Pin shadcn init to the Tailwind v4 path. |
| Next.js 16.2.0 | React 19.2.x | Already aligned in current `package.json`. |

---

## Key Configuration Notes

**Environment variables to define (use `@t3-oss/env-nextjs` to validate):**
```
# Line Messaging API
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

# LIFF
NEXT_PUBLIC_LIFF_ID=

# Database
DATABASE_URL=           # Neon connection string (pooled)

# Session
SESSION_SECRET=         # iron-session — must be >=32 chars random string

# App
NEXT_PUBLIC_APP_URL=    # https://yourdomain.vercel.app
```

**Drizzle config (`packages/db/drizzle.config.ts`):**
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**Neon client (`packages/db/src/index.ts`):**
```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export * from "./schema";
```

---

## Sources

- [@line/bot-sdk releases (GitHub)](https://github.com/line/line-bot-sdk-nodejs/releases) — v11.0.0 breaking changes confirmed (removed `Client` class, removed axios) — HIGH confidence
- [line-bot-sdk-nodejs basic usage docs](https://line.github.io/line-bot-sdk-nodejs/getting-started/basic-usage.html) — `LineBotClient` pattern — HIGH confidence
- [LINE Developers: Using user data in LIFF](https://developers.line.biz/en/docs/liff/using-user-profile/) — Security guidance: send `getAccessToken()` not profile data to backend — HIGH confidence
- [LINE Developers: Developing LIFF apps](https://developers.line.biz/en/docs/liff/developing-liff-apps/) — `liff.init()` requirements, browser-only constraint — HIGH confidence
- [Drizzle ORM: Connect Neon](https://orm.drizzle.team/docs/connect-neon) — neon-http driver setup — HIGH confidence
- [Neon Vercel integration](https://vercel.com/integrations/neon) — Vercel Postgres migrated to Neon Q4 2024–Q1 2025 — HIGH confidence
- [makerkit.dev: Drizzle vs Prisma 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — Prisma 7 pure-TS, Drizzle bundle size, cold-start comparison — MEDIUM confidence (community blog, corroborated by multiple sources)
- [iron-session npm](https://www.npmjs.com/package/iron-session) — v8 App Router API — HIGH confidence
- [shadcn/ui docs](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 support — HIGH confidence
- [@line/liff npm](https://www.npmjs.com/package/@line/liff) — v2.28.x current version — MEDIUM confidence (npm 403 on direct fetch; version from WebSearch results)

---

*Stack research for: Line Bot + LIFF + Badminton Club Management Platform*
*Researched: 2026-04-05*
