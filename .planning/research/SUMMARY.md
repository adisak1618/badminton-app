# Project Research Summary

**Project:** Badminton Club Management Platform (ก๊วนแบดออนไลน์)
**Domain:** Line Bot + LIFF + Multi-tenant SaaS for Thai casual badminton clubs
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a Line-native multi-tenant SaaS product targeting Thai casual badminton clubs (ก๊วน). The core value proposition is clear: automate the manual text-template registration workflow that Thai club admins run in Line group chats today. The recommended approach is a single Next.js app on Vercel that hosts three surfaces — a Line webhook endpoint, LIFF member-facing pages, and a web admin panel — all sharing a Drizzle ORM + Neon PostgreSQL database layer within the existing Turborepo monorepo. This avoids cross-process RPC, simplifies deployment, and is the right architecture for Phase 1 scale (0–50 clubs).

The recommended stack is highly aligned with the existing project scaffold. Next.js 16 + TypeScript are already installed. The only additions are `@line/bot-sdk` v11 (pure TypeScript, no axios), `@line/liff` v2.28, Drizzle ORM with the Neon serverless driver, and `iron-session` v8 for stateless cookie sessions. This is a proven combination with well-documented patterns and strong TypeScript ergonomics. The project has no need for heavier alternatives like Prisma, NextAuth, or Supabase — each has been evaluated and found to be overkill given Line Login as the single identity provider.

The top risk area is the Line platform itself. Several constraints are non-obvious and will cause architectural rework if discovered late: Flex Messages cannot be edited after sending (the "live count card" UX must be redesigned before Phase 1); `liff.getContext()` no longer returns `groupId` (group linking requires a token-based flow via the join webhook); and the Messaging API `userId` is provider-scoped (Messaging API and LIFF channels must be under the same provider or identity lookup breaks silently). All three must be addressed in Phase 1 setup and design, not retrofitted later.

---

## Key Findings

### Recommended Stack

The stack is fully serverless and edge-compatible, optimised for Vercel cold-start performance. Drizzle ORM is preferred over Prisma for its smaller bundle size (~90% smaller), SQL transparency, and zero native binary. The Neon serverless HTTP driver is faster than TCP for single-transaction serverless workloads and integrates natively with the Vercel Marketplace. Iron-session replaces NextAuth because Line Login is the only identity provider and stateless encrypted cookies are simpler than a managed session DB.

**Core technologies:**
- **Next.js 16.2** (already installed): App Router Route Handlers for webhook + LIFF API routes + admin web
- **@line/bot-sdk ^11.x**: Official Line Messaging API client — use `LineBotClient`, not deprecated `Client`
- **@line/liff ^2.28.x**: LIFF SDK — client-side only, must run inside `"use client"` + `useEffect`
- **Drizzle ORM ^0.41.x + @neondatabase/serverless ^0.10.x**: Type-safe DB, edge-compatible, no binary
- **iron-session ^8.x**: Stateless encrypted cookie sessions for Line-verified identity
- **zod ^3.x + @t3-oss/env-nextjs ^0.11.x**: Runtime validation for webhook payloads and env vars

**Critical version requirements:**
- Use `@line/bot-sdk` v11+ only — `Client` class removed in v11; use `LineBotClient`
- Use `@neondatabase/serverless`, not `@vercel/postgres` (deprecated, migrated to Neon Q1 2025)
- LIFF SDK must use dynamic import inside `useEffect` — module-level import crashes SSR

### Expected Features

The core loop is: admin creates event → bot posts Flex Message card in group → member taps → LIFF opens → one-tap registration. This loop replaces the manual text-post pattern entirely.

**Must have (table stakes):**
- Multi-tenant data model with `clubId` scoping on all tables — prerequisite for everything else
- Club setup on website: create club, configure defaults, link Line group via bot join event
- Admin creates one-time event (bot command or LIFF admin panel)
- Bot posts Flex Message event card to group (venue, time, cost, count/max, Register CTA)
- Member registration via LIFF (one-time profile on first visit, one-tap thereafter)
- Live registration count visible in LIFF (not on the card — Line messages are immutable)
- Full/closed state disables registration in LIFF
- Member self-cancellation via LIFF
- Admin remove member from LIFF admin panel
- Admin early-close via bot command

**Should have (differentiators):**
- Recurring event templates (weekly sessions, same court — eliminates the #1 admin pain)
- Configurable registration open window (opens N hours before event, auto-posts card)
- Per-occurrence overrides on recurring events (cancel, venue change, fee adjustment)
- Skill level on member profile (low-cost data collection; enables future matchmaking)
- Registration list visible to members in LIFF (social signal that drives registration)

**Defer (v2+):**
- Public club pages and event discovery
- Payment tracking or fee collection
- Automated waitlist with auto-promotion
- Matchmaking and Elo ratings
- Website-based member registration (Line-first is the core constraint)

### Architecture Approach

All surfaces (webhook, LIFF pages, admin web) live in `apps/web` as a single Next.js deployment. A new `packages/db` package holds the Drizzle schema, migrations, and database client — importable from all apps. Bot logic is isolated in `src/bot/` (commands, event handlers, Flex builders) with no coupling to business services. Services in `src/services/` are pure functions: they receive typed input, return typed output, and are called identically from webhook handlers, LIFF API routes, and admin routes.

**Major components:**
1. **Webhook Route Handler** (`/api/webhook/line`) — validates `X-Line-Signature` manually with raw body, returns 200 immediately, dispatches events asynchronously
2. **LIFF Pages** (`/liff/register`, `/liff/profile`, `/liff/admin`) — client-only components with `LiffProvider` context; all data fetching happens after `liff.init()` resolves
3. **Service Layer** (`src/services/`) — pure business logic: EventService, RegistrationService, ClubService, MemberService; no HTTP context; independently testable
4. **Flex Message Builder** (`src/bot/flex/`) — pure functions producing typed `FlexMessage` objects; cards are static snapshots, LIFF is the live view
5. **Admin Web** (`/admin/`) — Next.js App Router Server Components + iron-session for club onboarding, event management, club configuration
6. **Database Layer** (`packages/db`) — Drizzle schema as single source of truth; all queries scoped by `clubId`; global `members` table keyed by `line_user_id`

**Key architectural decision confirmed by research:** The Line Messaging API has no message-edit endpoint. The Flex Message card is sent once as a snapshot. The LIFF page shows live registration count and list. The bot sends a new card only when status changes meaningfully (event full, registration closed). This is not a limitation — it is the correct design.

### Critical Pitfalls

1. **userId cross-provider mismatch** — Messaging API and LIFF/Line Login channels must be registered under the same provider in the Line Developers Console. If they are not, LIFF users and bot webhook users produce different `userId` values for the same person. Recovery is a full re-onboarding. Fix: verify before writing any identity-lookup code.

2. **Flex Message immutability** — There is no `updateMessage` endpoint. Planning documents that describe "updating the card" must be corrected before Phase 1 implementation begins. The card is a static snapshot; LIFF is the live view.

3. **Webhook redelivery without idempotency** — Line redelivers webhooks on failure. Without a `webhookEventId` uniqueness check and a `UNIQUE (event_id, member_id)` constraint on registrations, the same member can be registered twice and the event can overbook. Add idempotency key table in the first migration.

4. **LIFF init must precede routing** — Next.js routing can strip the `liff.*` query parameters before `liff.init()` resolves, causing infinite redirect loops. Call `liff.init()` as the first action in the LIFF entry component, before any state management or routing. Use LIFF SDK v2.11+ which strips credentials from the URL after init.

5. **Multi-tenant data leakage** — Every query that returns events, registrations, or members must include a `WHERE club_id = ?` clause. One missed clause exposes Club A's data to Club B's admin. Enforce via repository functions that mandate a `clubId` parameter, or PostgreSQL RLS policies. Add an integration test in Phase 1 that verifies cross-tenant isolation.

6. **Line OA free tier: 300 push messages/month** — One push to a group of 20 members counts as 20 messages. A club with 20 members and 4 weekly events exhausts the free quota in one week. Design bot to use `reply` messages (quota-exempt, triggered by user action) wherever possible. Reserve `push` for proactive event card posting only. Document this constraint for club owners.

7. **replyToken expires in 30 seconds** — The webhook handler must return HTTP 200 immediately and process events asynchronously. Any DB write or external call before the reply will burn the reply token. Use fire-and-forget for all business logic; use `push` (not `reply`) for async responses.

---

## Implications for Roadmap

Based on research, the component dependency graph from ARCHITECTURE.md defines a clear build order. Each phase depends on the previous one having been completed.

### Phase 1: Foundation and Infrastructure
**Rationale:** Everything depends on the database schema, environment configuration, and the Drizzle + Neon connection being correct. Multi-tenancy must be built in from the first migration — it cannot be retrofitted. Idempotency constraints and webhook signature verification must also be established here before any handler processes real events.
**Delivers:** `packages/db` with full schema and migrations; environment variable validation with `@t3-oss/env-nextjs`; Line client singleton; webhook skeleton returning 200 with signature validation; idempotency key table; cross-tenant isolation verified by integration test.
**Addresses:** Multi-tenant data model (FEATURES.md P1 prerequisite)
**Avoids:** Multi-tenant data leakage (Pitfall 7), webhook signature bypass (Pitfall 9), duplicate webhook processing (Pitfall 3)

### Phase 2: Club Setup and Bot Onboarding
**Rationale:** Before events can be created, a club must exist and the Line group must be linked to it. The group-to-club linking flow uses the `join` webhook event (the only place `groupId` is available) and a short-lived token. This must be correct before any event flow is built.
**Delivers:** Club creation web UI; club settings and defaults; bot `join` event handler that sends LIFF setup link with one-time token; club-to-group linking via LIFF token resolution; admin role assignment.
**Addresses:** Club setup on website (FEATURES.md table stake), admin role in group (FEATURES.md table stake)
**Avoids:** `liff.getContext()` groupId misconception (Architecture Anti-Pattern 2 — groupId discontinued Feb 2023), userId cross-provider mismatch (Pitfall 1 — verify provider setup before this phase)

### Phase 3: Member Identity and Profile
**Rationale:** Registrations require a member record. Member identity is established via Line Login through LIFF — the `line_user_id` is the global cross-club identifier. This phase builds the LIFF bootstrap pattern (LiffProvider, isInClient guard, init-before-routing) that all subsequent LIFF pages inherit.
**Delivers:** LIFF bootstrap infrastructure (LiffProvider, isInClient guard, liff.init before routing); Line ID token server-side verification; member profile creation on first LIFF open (display name, skill level); iron-session cookie set after verification.
**Addresses:** One-time member profile (FEATURES.md table stake), global member profile across clubs (FEATURES.md differentiator)
**Avoids:** LIFF init before routing (Pitfall 6), LIFF external browser failures (Pitfall 5), trusting client-sent userId (Security)

### Phase 4: Event Creation and Flex Message Card
**Rationale:** With clubs and members in place, the core event loop can be built. The Flex Message card is static by design — this must be established as a deliberate architectural constraint, not a limitation to work around. Admin event creation via bot command and/or LIFF admin panel are both needed.
**Delivers:** Event creation (bot command `/event` + LIFF admin panel); Flex Message builder producing typed event cards; bot posts card to group on event creation; event record stores `line_message_id` as reference metadata only; card shows venue, time, cost, count/max (snapshot), Register + Details CTA buttons.
**Addresses:** Bot posts event card in group (FEATURES.md table stake), event fields (FEATURES.md table stake), admin creates one-time event (FEATURES.md table stake)
**Avoids:** Flex Message immutability misconception (Pitfall 4) — card is designed as snapshot from day 1; replyToken expiry (Pitfall 2) — event creation uses push, not reply

### Phase 5: Registration Loop (Core Value Delivery)
**Rationale:** This is the phase where the product delivers its primary value: a member taps the Flex Message card, LIFF opens, and they register without leaving Line. This phase also includes cancellation and admin management — all needed to make the loop complete for real club use.
**Delivers:** LIFF registration page with live count from API; registration service with idempotency (UNIQUE constraint on event+member); member self-cancellation via LIFF; admin remove-member from LIFF admin panel; admin early-close bot command; full/closed state shown in LIFF.
**Addresses:** Registration via LIFF, live count in LIFF, full/closed state, member cancellation, admin remove member, admin early-close (all FEATURES.md P1 table stakes)
**Avoids:** Duplicate registrations from webhook redelivery (Pitfall 3 — idempotency already in schema from Phase 1), LIFF blank loading screen UX pitfall (show skeleton immediately), chat noise from count updates (use LIFF as live view, not bot messages)

### Phase 6: Recurring Events and Scheduling
**Rationale:** Recurring events are the #1 admin pain point (manual weekly re-creation) and the most technically complex differentiator. Scheduler infrastructure must be built correctly with Asia/Bangkok timezone handling from day one — retrofitting timezone logic after data exists is costly.
**Delivers:** Recurring event template creation (day-of-week, time, defaults, registration open window); cron/scheduler that auto-creates event records and posts Flex Message cards at the configured local time; per-occurrence override (cancel, venue change, fee adjustment); lazy occurrence generation (rolling window, not eager bulk creation).
**Addresses:** Recurring event templates (FEATURES.md P2 differentiator), configurable registration open window (FEATURES.md P2), per-occurrence overrides (FEATURES.md P2)
**Avoids:** Timezone UTC/Bangkok mismatch (Pitfall 10), eager occurrence generation performance trap (PITFALLS.md), Line OA message quota exhaustion (Pitfall 8 — one push per event, not per registration)

### Phase Ordering Rationale

- **Schema first:** Every feature requires the database to exist and be correctly scoped. Multi-tenancy is a schema property, not a feature layer — it must be in from Migration 0.
- **Identity before registrations:** The `members` table and Line Login verification must exist before any registration can be created. Building the LIFF bootstrap pattern in Phase 3 means Phases 5 and 6 inherit correct, tested infrastructure.
- **Event creation before registration:** The registration flow requires an existing event record and a posted Flex Message to link to. Phases 4 and 5 cannot be swapped.
- **Core loop before recurring:** Phase 5 (the core registration loop) must be validated with real clubs before investing in the complexity of recurring event scheduling. Once admins validate the basic flow, Phase 6 eliminates their remaining manual work.
- **Three Line platform constraints shape the entire design:** Flex Message immutability (Phase 4), groupId discontinuation (Phase 2), and userId provider scoping (Phase 2 pre-check) must all be understood before implementation begins — not discovered mid-phase.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Recurring Events):** Vercel cron scheduling options, date-fns-tz vs Temporal API for Asia/Bangkok arithmetic, lazy occurrence generation strategy. The scheduling infrastructure is well-understood conceptually but implementation details need validation.
- **Phase 2 (Bot Onboarding):** Short-lived token flow for group-to-club linking has limited community documentation. The one-time token + LIFF URL approach is architecturally sound but the exact implementation (token storage, expiry, race conditions) may benefit from a focused research pass.

Phases with standard patterns (skip research):
- **Phase 1 (Foundation):** Drizzle + Neon setup is extremely well-documented with official docs. Standard monorepo pattern.
- **Phase 3 (Member Identity):** Line ID token verification and iron-session are both official, well-documented APIs.
- **Phase 4 (Flex Messages):** Flex Message builder is a pure TypeScript concern with an official simulator tool. No unknown patterns.
- **Phase 5 (Registration Loop):** Standard CRUD with idempotency constraints. Well-documented patterns throughout.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack (Next.js, Drizzle, Neon, iron-session) verified against official docs. `@line/bot-sdk` v11 breaking changes confirmed from GitHub releases. LIFF version MEDIUM (npm 403 on direct fetch; inferred from search results). |
| Features | MEDIUM | LINE platform capabilities are HIGH confidence from official docs. Thailand-specific club behavior and competitor analysis are MEDIUM — community sources, plausible but not firsthand. Anti-features rationale is sound. |
| Architecture | MEDIUM-HIGH | System design follows official Line Developers guidance. The Flex Message immutability finding and groupId discontinuation are HIGH confidence from official docs. Component boundaries and build order are well-reasoned from dependency analysis. |
| Pitfalls | HIGH | Critical pitfalls are documented from official Line API docs. Quota limits confirmed from official pricing page. Operational patterns (idempotency, async webhook) are community-corroborated with multiple independent sources. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **LIFF version pinning:** `@line/liff` exact latest version could not be confirmed via npm directly. Verify `^2.28.x` at install time. Run `pnpm info @line/liff version` before installing.
- **`updateMessage` absence confirmation:** Research confirms there is no message-edit endpoint, but the Flex Message update strategy (one card per event, LIFF as live view) should be validated as acceptable UX with actual club admins before Phase 5 is finalized. The alternative (new push message on each registration change) is technically possible but creates chat noise.
- **Vercel cron for Phase 6:** Vercel Cron Jobs have limitations on the Hobby plan (daily granularity). If clubs need sub-daily scheduling precision (e.g., "opens 2 hours before"), a paid plan or alternative scheduler (e.g., Inngest, Trigger.dev) may be needed. Evaluate during Phase 6 planning.
- **Per-club Line OA onboarding UX:** Each club must create its own Line Official Account and provide channel credentials to the platform. This is an onboarding friction point with no technical solution. The admin web onboarding flow should include clear instructions for this step.
- **Vercel region for Thai latency:** Deploying to `hnd1` (Tokyo) vs default US East is documented as ~30ms vs ~200ms RTT to Thailand. Set this explicitly in `vercel.json` before first production deployment.

---

## Sources

### Primary (HIGH confidence)
- LINE Developers Official Docs — webhook receiving, LIFF developing, getContext API reference, group chats, channel access tokens, pricing — https://developers.line.biz/en/
- @line/bot-sdk v11 GitHub releases — breaking changes, LineBotClient — https://github.com/line/line-bot-sdk-nodejs/releases
- Drizzle ORM: Connect Neon — neon-http driver setup — https://orm.drizzle.team/docs/connect-neon
- iron-session v8 npm — App Router API — https://www.npmjs.com/package/iron-session
- Neon Vercel integration — Vercel Postgres migration to Neon — https://vercel.com/integrations/neon
- shadcn/ui Tailwind v4 docs — https://ui.shadcn.com/docs/tailwind-v4

### Secondary (MEDIUM confidence)
- makerkit.dev: Drizzle vs Prisma 2026 — bundle size, cold-start — community blog, corroborated
- LINE Developers Thailand community (Mikkipastel, LINE Dev TH Medium) — LIFF + bot patterns in Thai ecosystem
- PAiMo and HelloClub — competitor feature analysis
- Webhooks.cc Next.js App Router webhook handler guide — raw body pattern
- Zenn + Qiita articles — Next.js App Router + LIFF TypeScript implementation patterns

### Tertiary (LOW confidence)
- @line/liff version (^2.28.x) — inferred from search results, npm direct fetch failed with 403

---

*Research completed: 2026-04-05*
*Ready for roadmap: yes*
