# Architecture Research

**Domain:** Line bot + LIFF + Next.js multi-tenant badminton club platform
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         LINE Platform                                │
│  ┌─────────────────┐          ┌──────────────────────────────────┐   │
│  │   Line Group    │          │  LIFF Browser (WebView)          │   │
│  │  (Club channel) │          │  - Member registration UI        │   │
│  │                 │          │  - Admin panel                   │   │
│  │  [Flex Message] │          │  - Profile setup                 │   │
│  │  Register / CTA │          └─────────────┬────────────────────┘   │
│  └────────┬────────┘                        │ HTTPS                  │
└───────────┼─────────────────────────────────┼────────────────────────┘
            │ Webhook (POST)                  │ API calls
            ▼                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Vercel (apps/web — Next.js)                      │
│                                                                      │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐  │
│  │   Webhook Handler   │    │          LIFF Pages                 │  │
│  │  /api/webhook/line  │    │  /liff/register/[eventId]           │  │
│  │                     │    │  /liff/profile                      │  │
│  │  1. Validate sig    │    │  /liff/admin/[eventId]              │  │
│  │  2. Route events    │    │                                     │  │
│  │  3. Return 200      │    │  Client components only             │  │
│  └──────────┬──────────┘    │  liff.init() in useEffect          │  │
│             │               └──────────────┬──────────────────────┘  │
│             ▼                              │                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Service Layer                             │    │
│  │  EventService  |  RegistrationService  |  ClubService        │    │
│  │  MemberService |  FlexMessageBuilder   |  BotCommandRouter   │    │
│  └──────────────────────────────┬───────────────────────────────┘    │
│                                 │                                    │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                       Admin Web App                          │   │
│  │  /admin/clubs/[clubId]/setup                                 │   │
│  │  /admin/events                                               │   │
│  │  Session auth (NextAuth + Line Login)                        │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                 │                                    │
└─────────────────────────────────┼────────────────────────────────────┘
                                  │ Drizzle ORM
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Neon / Railway)                        │
│  clubs | members | club_members | events | registrations             │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Webhook Handler | Receive Line events, validate signature, dispatch to handlers | Next.js Route Handler at `/api/webhook/line`, Node.js runtime |
| Bot Command Router | Parse text commands from group chat, map to service calls | Switch on event.type + message.text prefix |
| Flex Message Builder | Construct typed Flex Message JSON for event cards | Pure functions returning `FlexMessage` objects |
| LIFF Pages | Member-facing registration UI, profile setup, admin panel | Next.js App Router client components with `liff.init()` in useEffect |
| Admin Web App | Club onboarding, event creation, club config | Next.js App Router server + client components, NextAuth session |
| Service Layer | Business logic — events, registrations, club management | Server-side TypeScript modules, called from both webhook handlers and API routes |
| Database Layer | Persistence via Drizzle ORM + PostgreSQL | Drizzle schema, migrations, typed queries |

---

## Recommended Project Structure

The existing Turborepo monorepo maps directly to this architecture. The current `apps/web` becomes the main application hosting all surfaces.

```
apps/
├── web/                         # Main Next.js app (all surfaces)
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/
│   │   │   │   └── line/
│   │   │   │       └── route.ts     # Line webhook endpoint
│   │   │   └── liff/
│   │   │       ├── events/
│   │   │       │   └── [eventId]/
│   │   │       │       └── route.ts # LIFF API: register/cancel
│   │   │       └── profile/
│   │   │           └── route.ts     # LIFF API: member profile
│   │   ├── liff/                    # LIFF page routes (client-only)
│   │   │   ├── register/
│   │   │   │   └── [eventId]/
│   │   │   │       └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   └── admin/
│   │   │       └── [eventId]/
│   │   │           └── page.tsx
│   │   ├── admin/                   # Admin web app (NextAuth protected)
│   │   │   ├── clubs/
│   │   │   │   └── [clubId]/
│   │   │   │       └── page.tsx
│   │   │   └── events/
│   │   │       └── page.tsx
│   │   └── (public)/                # Public marketing / onboarding
│   │       └── page.tsx
│   └── src/
│       ├── bot/
│       │   ├── commands/            # Text command handlers
│       │   │   ├── create-event.ts
│       │   │   └── close-registration.ts
│       │   ├── events/              # Webhook event handlers
│       │   │   ├── join.ts          # Bot joined group
│       │   │   ├── message.ts       # Incoming messages
│       │   │   └── postback.ts      # Button taps
│       │   └── flex/                # Flex Message builders
│       │       └── event-card.ts
│       ├── services/
│       │   ├── clubs.ts
│       │   ├── events.ts
│       │   ├── members.ts
│       │   └── registrations.ts
│       ├── db/
│       │   ├── schema.ts            # Drizzle schema
│       │   ├── index.ts             # DB connection
│       │   └── migrations/
│       └── lib/
│           ├── line-client.ts       # @line/bot-sdk client singleton
│           └── liff-provider.tsx    # LIFF context provider
packages/
├── ui/                              # Shared React components (existing)
├── typescript-config/               # Shared TS config (existing)
└── eslint-config/                   # Shared ESLint config (existing)
```

### Structure Rationale

- **All surfaces in `apps/web`:** Line webhook, LIFF pages, and admin UI all share the same database layer and service modules. A single Next.js app avoids cross-app RPC and simplifies Vercel deployment (one URL, one env config).
- **`src/bot/`:** Isolates all Line-specific logic (command parsing, Flex builders, event handlers) from business services. Services have no Line dependency — they can be called from webhooks, LIFF API routes, and admin routes alike.
- **`src/services/`:** Pure business logic with no HTTP context. Receives typed input, returns typed output, throws typed errors. Tested independently.
- **`src/db/`:** Drizzle schema as the single source of truth. All services import from here.
- **`app/liff/`:** All LIFF routes are client-component-only pages. They must not use Next.js SSR for the page itself, since `liff.init()` requires the browser environment. API data fetching happens client-side after LIFF initializes.

---

## Architectural Patterns

### Pattern 1: Webhook Route Handler with Manual Signature Validation

**What:** A Next.js Route Handler that reads the raw body as text, validates the Line signature manually, then dispatches to typed event handlers.

**When to use:** Any Line Messaging API webhook endpoint.

**Trade-offs:** Requires `export const runtime = "nodejs"` — cannot run on Edge Runtime. Raw body must be read with `request.text()` before any JSON parsing.

**Example:**
```typescript
// app/api/webhook/line/route.ts
export const runtime = "nodejs";

import { validateSignature } from "@line/bot-sdk";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(body);
  // Dispatch events asynchronously — return 200 immediately
  void handleEvents(payload.events);
  return new Response("OK", { status: 200 });
}
```

Key: return 200 immediately, process events asynchronously. Line retries if the response is delayed or fails.

### Pattern 2: LIFF as Client-Only Pages with LiffProvider

**What:** A React context provider that runs `liff.init()` in a `useEffect` and exposes the initialized `liff` object and `userId` to child components.

**When to use:** All pages under `app/liff/`.

**Trade-offs:** No server-side data fetching for LIFF pages — all data calls happen after `liff.init()` resolves. Use loading states. Cannot use Next.js metadata in these routes for SEO purposes (but LIFF pages are accessed inside Line, so SEO is irrelevant).

**Example:**
```typescript
// src/lib/liff-provider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

type LiffContextValue = { liff: typeof import("@line/liff") | null; userId: string | null };
const LiffContext = createContext<LiffContextValue>({ liff: null, userId: null });

export function LiffProvider({ liffId, children }: { liffId: string; children: React.ReactNode }) {
  const [liff, setLiff] = useState<typeof import("@line/liff") | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    import("@line/liff").then((liffModule) => {
      liffModule.default.init({ liffId }).then(() => {
        setLiff(liffModule.default);
        setUserId(liffModule.default.getContext()?.userId ?? null);
      });
    });
  }, [liffId]);

  return <LiffContext.Provider value={{ liff, userId }}>{children}</LiffContext.Provider>;
}

export const useLiff = () => useContext(LiffContext);
```

### Pattern 3: Group-to-Club Linking via Join Event + URL Parameter

**What:** When the bot joins a Line group (via the `join` webhook event), the bot sends a setup message containing a LIFF URL with a `?clubToken=<token>` query parameter. The club owner taps this link to bind the group to their club account.

**When to use:** Initial club setup — linking a Line group to a club record.

**Critical context:** `liff.getContext()` no longer returns `groupId` (discontinued February 2023). The groupId is only available via webhook events. The approach is:
1. Bot receives `join` event — `source.groupId` is available in the webhook payload.
2. Bot stores the `groupId` temporarily with a short-lived token.
3. Bot sends a LIFF link with `?token=<one-time-token>` to the group.
4. Owner taps → LIFF resolves the token → links `clubId` to `groupId` in the database.

**Trade-offs:** Adds a linking flow. The token must be short-lived (15–30 minutes) to prevent link sharing attacks.

### Pattern 4: Shared-Schema Multi-Tenancy with `club_id` Foreign Key

**What:** All tenant-specific tables carry a `club_id` foreign key. Every query scopes to a single club. A `members` table is global (cross-club, keyed by `line_user_id`).

**When to use:** Always — multi-tenancy must be in from Phase 1.

**Trade-offs:** Every query must include `WHERE club_id = ?`. Easy to forget in ad-hoc queries. Prefer service functions that always receive and enforce `clubId` as a parameter.

**Example schema sketch:**
```typescript
// src/db/schema.ts (Drizzle)
export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  lineGroupId: varchar("line_group_id", { length: 100 }).unique(),
  // ...defaults: maxPlayers, shuttlecockFee, courtFee
});

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineUserId: varchar("line_user_id", { length: 100 }).unique().notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  skillLevel: skillLevelEnum("skill_level").notNull(),
  // Global — not per-club
});

export const clubMembers = pgTable("club_members", {
  clubId: uuid("club_id").references(() => clubs.id).notNull(),
  memberId: uuid("member_id").references(() => members.id).notNull(),
  role: clubRoleEnum("role").notNull().default("member"),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").references(() => clubs.id).notNull(), // always scoped
  // ...
  lineMessageId: varchar("line_message_id", { length: 100 }), // stored for reference
});

export const registrations = pgTable("registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  memberId: uuid("member_id").references(() => members.id).notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});
```

---

## Data Flow

### Registration Card Flow (Critical Path)

The Line Messaging API does NOT support editing messages after they are sent. There is no `updateMessage` endpoint. The architecture must account for this.

```
Admin creates event
        ↓
Service creates event record in DB
        ↓
Bot sends Flex Message to group → Line returns messageId
        ↓
Store messageId on event record (for reference only)
        ↓
Member taps "Register" button in Flex Message
        ↓
LIFF opens with ?eventId=<id>
        ↓
liff.init() runs → userId obtained from liff.getContext()
        ↓
LIFF page loads current registrations from /api/liff/events/[eventId]
        ↓
Member taps "Register" in LIFF UI
        ↓
POST /api/liff/events/[eventId]/register (with Line access token for auth)
        ↓
Service adds registration record
        ↓
Bot pushes NEW Flex Message to group with updated count
  (cannot update the old message — push is the only option)
```

**Implication:** The group will accumulate Flex Messages as counts update. Two mitigation options:
1. Accept this — send a new card only when count changes significantly (e.g., on registration and cancellation).
2. Keep the LIFF page as the authoritative live count view; only send one card per event (no count updates pushed to group).

Option 2 is cleaner for Phase 1: the Flex Message card is static (sent once), and the LIFF page shows the live list.

### Webhook Event Dispatch Flow

```
Line Platform → POST /api/webhook/line
        ↓
Validate X-Line-Signature (validateSignature with raw body)
        ↓
Return 200 immediately
        ↓ (async)
Parse events array
        ↓
For each event:
  join → GroupJoinHandler (store groupId, send setup LIFF link)
  message → MessageHandler (parse commands: /event, /close)
  follow → FollowHandler (welcome message)
```

### LIFF Authentication Flow

```
Member opens LIFF URL (from Flex Message button)
        ↓
liff.init({ liffId }) runs in useEffect
        ↓
In Line browser: auto-authenticated (no login prompt)
In external browser: liff.login() redirects to Line Login
        ↓
liff.getContext() returns { userId, type: "group" }
        ↓
LIFF page calls backend API with liff.getAccessToken()
        ↓
Backend validates token with Line Login API
  OR decodes ID token (liff.getDecodedIDToken()) — server-side verify
        ↓
Backend identifies member by lineUserId
```

---

## Data Model Design

### Core Tables

```
clubs
  id (uuid, PK)
  name
  line_group_id (unique, nullable until linked)
  line_channel_access_token
  default_max_players
  default_shuttlecock_fee
  default_court_fee
  created_at

members  [global — cross-club]
  id (uuid, PK)
  line_user_id (unique, not null)
  display_name
  skill_level (enum: beginner | intermediate | advanced | competitive)
  years_playing (int)
  created_at
  updated_at

club_members  [junction — club membership + roles]
  club_id (FK → clubs)
  member_id (FK → members)
  role (enum: owner | admin | member)
  joined_at
  PRIMARY KEY (club_id, member_id)

events
  id (uuid, PK)
  club_id (FK → clubs, NOT NULL)
  title
  event_date (timestamptz)
  venue_name
  venue_maps_url
  shuttlecock_fee
  court_fee
  max_players
  status (enum: draft | open | closed | cancelled)
  line_message_id (varchar, nullable — set when Flex Message posted)
  recurring_rule_id (FK → recurring_rules, nullable)
  created_by (FK → members)
  created_at

registrations
  id (uuid, PK)
  event_id (FK → events, NOT NULL)
  member_id (FK → members, NOT NULL)
  registered_at
  UNIQUE (event_id, member_id)

recurring_rules
  id (uuid, PK)
  club_id (FK → clubs)
  day_of_week (0-6)
  time_of_day (time)
  registration_open_hours_before (int)
  is_active (bool)
```

### Multi-Tenancy Enforcement

Every service function receives `clubId` as an explicit parameter. Queries always include `WHERE club_id = $clubId`. The `members` table is the single global exception — members span clubs, keyed by `line_user_id`.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Line Messaging API | `@line/bot-sdk` client, called from service layer | One client instance per club (each club has its own channel access token) |
| Line Login (LIFF auth) | ID token verification via `liff.getDecodedIDToken()` or server-side JWKS verify | Validates `lineUserId` on each LIFF API request |
| LIFF SDK | `@line/liff` npm package, client-side dynamic import | Must init in `useEffect`, cannot SSR |
| PostgreSQL (Neon) | Drizzle ORM with connection pooling | Use `@neondatabase/serverless` driver for Vercel serverless compatibility |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Webhook Handler ↔ Service Layer | Direct function call (same process) | Handlers are thin — they parse events and call services |
| LIFF API Routes ↔ Service Layer | Direct function call (same process) | API routes validate Line token, then call service |
| Admin Web ↔ Service Layer | Direct function call (same process) | Admin routes validate NextAuth session |
| Bot Logic ↔ Line Client | `@line/bot-sdk` MessagingApiClient | Client initialized with per-club access token |
| Service Layer ↔ DB | Drizzle ORM queries | All queries scoped by clubId |

---

## Build Order (Phase Dependencies)

The component dependencies dictate this build order:

```
1. Database schema + Drizzle setup
        ↓ (everything depends on DB)
2. Club model + basic admin web (club creation, Line channel config)
        ↓ (need clubId before anything else)
3. Webhook handler skeleton (signature validation, join event → group linking)
        ↓ (need groupId stored to send messages)
4. Member profile (Line Login auth, LIFF profile setup page, member record creation)
        ↓ (need members before registrations)
5. Event creation (admin web + bot command)
        ↓ (need events before registrations)
6. Flex Message builder + event card posting
        ↓ (need flex message before LIFF registration)
7. LIFF registration page + registration service
        ↓ (core value delivery — can now register inside Line)
8. Recurring events (extends event service)
9. Admin LIFF panel (extends existing LIFF + registration service)
```

---

## How Turborepo Monorepo Fits

The existing structure (`apps/web`, `packages/ui`, shared configs) maps cleanly:

| Existing | Becomes |
|----------|---------|
| `apps/web` | Main app: webhook endpoint + LIFF pages + admin web (all in one) |
| `apps/docs` | Remove or repurpose as internal docs |
| `packages/ui` | Shared UI components (admin web + LIFF pages share Button, Card, etc.) |
| `packages/typescript-config` | Keep — strict TypeScript for all |
| `packages/eslint-config` | Keep — consistent linting |

New packages to add:

| New Package | Purpose |
|-------------|---------|
| `packages/db` | Drizzle schema, migrations, db client — shared between apps if a second app is ever added |
| `packages/line-types` | Shared TypeScript types for Line webhook event shapes and Flex Message builders |

Keeping all surfaces in `apps/web` avoids cross-process calls in Phase 1. If the webhook handler needs to scale independently in later phases, it can be extracted to `apps/bot` — Turborepo makes that refactor low-risk.

---

## Anti-Patterns

### Anti-Pattern 1: Calling `liff.init()` at Module Level (SSR Crash)

**What people do:** Import `@line/liff` at the top of a Next.js page and call `liff.init()` outside of `useEffect`.

**Why it's wrong:** `@line/liff` accesses `window` on import. Next.js App Router runs the module on the server during SSR, causing `window is not defined` runtime errors.

**Do this instead:** Dynamic import inside `useEffect` with `"use client"` directive. Use a `LiffProvider` that wraps all LIFF pages.

### Anti-Pattern 2: Assuming `liff.getContext()` Returns `groupId`

**What people do:** Try to identify which club/group the LIFF was opened from by reading `liff.getContext().groupId`.

**Why it's wrong:** LINE discontinued `groupId`, `roomId`, and `utouId` from `liff.getContext()` return values in February 2023. The value is always undefined.

**Do this instead:** Pass the context via the LIFF URL query parameter: `https://liff.line.me/{liffId}?eventId=<id>`. The bot constructs these URLs when building Flex Message buttons. The `eventId` (or a short token) encodes all needed context.

### Anti-Pattern 3: Editing Messages After Sending

**What people do:** Store the `messageId` of the sent Flex Message and try to update it when the registration count changes.

**Why it's wrong:** LINE Messaging API has no endpoint to edit a message after it has been sent. The `messageId` is read-only reference metadata.

**Do this instead:** Design the Flex Message card as static — it links to the LIFF page which shows live data. If the group needs count updates, send a new push message (accepting that old cards remain in chat). For Phase 1, the LIFF page is the authoritative registration view.

### Anti-Pattern 4: Single Line Channel for All Clubs

**What people do:** Use one Line Official Account (OA) for all clubs to reduce setup cost.

**Why it's wrong:** Each Line OA can only be in one group at a time. Multi-tenant clubs each need their own OA so they can each be in their own Line group.

**Do this instead:** Each club owner creates their own Line OA during onboarding and provides the channel credentials (channel ID, channel secret, access token) to the platform. Store per-club Line credentials in the `clubs` table.

### Anti-Pattern 5: Parsing Webhook Body as JSON Before Signature Validation

**What people do:** Use `request.json()` to parse the body, then pass the re-serialized string to `validateSignature()`.

**Why it's wrong:** JSON re-serialization can alter whitespace, key order, or Unicode escaping. The signature is computed against the exact original bytes. Re-serialized JSON will fail signature validation.

**Do this instead:** `const body = await request.text()` first. Validate signature against this raw string. Then `JSON.parse(body)` for processing.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–50 clubs | Single Next.js app on Vercel, shared DB. No changes needed. |
| 50–500 clubs | Add DB connection pooling (Neon serverless already handles this). Add job queue for async webhook processing (avoid Vercel function timeouts on heavy events). |
| 500+ clubs | Extract webhook handler to a dedicated worker. Add Redis for idempotency checks on webhook redelivery. Consider per-region deployment for latency. |

### Scaling Priorities

1. **First bottleneck:** Database connections — Vercel serverless creates many short-lived connections. Neon serverless driver + connection pooler (PgBouncer or Neon's built-in pooler) solves this before it becomes a problem.
2. **Second bottleneck:** Line API rate limits — Line limits message sends per OA. Multi-OA (one per club) naturally distributes this load.

---

## Sources

- LINE Developers: Webhook receiving messages — https://developers.line.biz/en/docs/messaging-api/receiving-messages/
- LINE Developers: LIFF developing apps — https://developers.line.biz/en/docs/liff/developing-liff-apps/
- LIFF v2 API reference (getContext, groupId discontinuation) — https://developers.line.biz/en/reference/liff/#get-context
- LINE Developers: Group chats — https://developers.line.biz/en/docs/messaging-api/group-chats/
- line-bot-sdk-nodejs webhook guide — https://line.github.io/line-bot-sdk-nodejs/guide/webhook.html
- Next.js App Router webhook handler guide (raw body pattern) — https://webhooks.cc/blog/nextjs-app-router-webhook-handler
- Drizzle ORM RLS docs — https://orm.drizzle.team/docs/rls
- LIFF + Next.js App Router (Zenn, Japanese) — https://zenn.dev/yu_ta_9/articles/d7ae415d776391
- Qiita: Next.js App Router LIFF TypeScript start — https://qiita.com/teck-neighbor/items/f7ca9cf703d5040fdb46

---

*Architecture research for: Line bot + LIFF + Next.js multi-tenant badminton club platform*
*Researched: 2026-04-05*
