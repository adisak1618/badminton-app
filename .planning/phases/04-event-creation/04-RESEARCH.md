# Phase 4: Event Creation - Research

**Researched:** 2026-04-08
**Domain:** LINE Messaging API (Flex Message + pushMessage), Elysia.js route plugin, Next.js LIFF form page, webhook text command handler
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bot Command Design**
- D-01: Bot command triggers LIFF form — typing `/create` (or any alias) in the group replies with a LIFF link to the event creation form. The LIFF page checks the member's role server-side; admins see the form, non-admins see an error.
- D-02: Multiple command aliases: `/create`, `/new`, `สร้าง`, `สร้างอีเวนท์`. All trigger the same flow.
- D-03: Non-admin users typing a create command are silently ignored — bot does not reply. Keeps group chat clean.
- D-04: Bot must look up the sender's `lineUserId` in `club_members` (via the group's linked `clubId`) to check role. Only `owner` or `admin` roles trigger the LIFF link reply.

**LIFF Admin Panel**
- D-05: Single page form — all fields on one scrollable page.
- D-06: Club defaults pre-fill all applicable fields (EVNT-02): venue name, venue maps URL, shuttlecock fee, court fee, max players. Admin can override.
- D-07: Event title auto-generated from date + venue (`แบด {day} {month} - {venue}`). Admin can edit.
- D-08: Required fields: date/time, venue name. Optional: venue maps URL, title override. Fees and max players pre-filled from club defaults.

**Flex Message Card Design**
- D-09: Card displays: date + time, venue name + tappable Google Maps link, fees as `ลูกขน {n}฿ / สนาม {n}฿`, spots count (0/max).
- D-10: Two CTA buttons: "ลงทะเบียน" (Register) opens LIFF registration page, "รายละเอียด" (Details) opens LIFF event detail page.
- D-11: Fee format: `ลูกขน {shuttlecockFee}฿ / สนาม {courtFee}฿`.

**Event Lifecycle**
- D-12: Event goes directly to `open` status on creation — no draft workflow.
- D-13: Card is posted once. `lineMessageId` stored as reference metadata. No repost or edit in Phase 4.
- D-14: Flow: admin creates event via LIFF → API saves event record with status=open → API calls LINE Messaging API pushMessage → stores returned messageId in `events.lineMessageId`.

### Claude's Discretion
- Flex Message JSON structure and styling (colors, spacing, font sizes)
- How the LIFF event creation page communicates with the API (direct or through proxy)
- Date/time picker component choice for the LIFF form
- Error handling for LINE API push message failures
- Thai date formatting approach (e.g., Buddhist Era vs CE)

### Deferred Ideas (OUT OF SCOPE)
- Event editing after creation
- Draft/scheduled posting workflow
- Rich menu integration for admin commands
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVNT-01 | Admin creates a one-time event with date+time, venue name + Google Maps link, shuttlecock fee, court fee, max players | Elysia route plugin + Drizzle insert into `events` table; LIFF form with react-hook-form + zod |
| EVNT-02 | Event fields default from club settings but can be overridden per event | API GET endpoint returns club defaults; LIFF form pre-fills from club record before submission |
| BOT-01 | Bot posts a Flex Message card in the LINE group with event info, current/max count, "Register" CTA, "Details" CTA | `lineClient.pushMessage()` returns `PushMessageResponse.sentMessages[0].id`; store in `events.lineMessageId` |
| BOT-03 | Bot responds to text commands (`/create`, `/close`, `สร้างอีเวนต์`) | New `message` event type handler in webhook router alongside existing `join` handler |
</phase_requirements>

---

## Summary

Phase 4 adds two delivery paths for event creation and one output path for card posting. The API path adds (1) a new Elysia route plugin for event CRUD and (2) a new webhook text-message handler for command parsing. The frontend adds one LIFF page at `/liff/events/create`. The three paths connect at the POST `/api/events` endpoint: the LIFF form POSTs to it, which saves the event to Postgres, calls `lineClient.pushMessage()` to post the Flex Message card to the group, then stores the returned `sentMessages[0].id` in `events.lineMessageId`.

All the infrastructure already exists and is battle-tested: the `lineClient` singleton (`apps/api/src/lib/line-client.ts`), the `authMiddleware` and `requireClubRole` helpers, the LIFF proxy pattern (`/api/proxy/[...path]`), the `LiffProvider`/`useLiff` hook, and the `ProfileForm` pattern (react-hook-form + zod + shadcn). The `events` table schema is already migrated with all required fields including `lineMessageId`. The webhook router handles `join` events today and just needs a new `message` case.

The two highest-risk items are: (1) the webhook text-message handler must resolve `groupId → clubId → memberId → role` before replying, which requires multiple DB lookups in the hot path — this needs to be efficient; (2) the LIFF form needs a date/time input that works inside LINE's mobile webview — the native HTML `<input type="datetime-local">` is the only safe choice since no date-picker library is currently installed.

**Primary recommendation:** Follow the established Elysia plugin + LIFF proxy pattern exactly. Add a text-message webhook handler, a new `events.ts` route plugin, and one LIFF page. Do not introduce new libraries for date picking — use `<input type="datetime-local">`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@line/bot-sdk` | 11.0.0 | `lineClient.pushMessage()` to post Flex Message card to group | Already installed; `messagingApi.MessagingApiClient` singleton in `line-client.ts` |
| `@line/liff` | 2.28.0 | LIFF SDK init + auth on event creation page | Already installed; `LiffProvider` wraps all `/liff/*` pages |
| `drizzle-orm` | (monorepo) | Insert event record, query club defaults | Already installed; `events` table schema exists |
| `react-hook-form` | 7.72.1 | Event creation form state | Already used in `ProfileForm` — identical pattern |
| `zod` | 4.3.6 | Form + API body validation schema | Already used throughout API and web |
| `elysia` | (monorepo) | New `eventRoutes` plugin | Pattern established; all routes are Elysia plugins |

[VERIFIED: package.json in apps/api and apps/web]
[VERIFIED: npm registry — @line/bot-sdk@11.0.0, @line/liff@2.28.0 are current]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `iron-session` | (monorepo) | Session cookie parsing in `authMiddleware` | Already handles all auth; no changes needed |
| `sonner` | (monorepo) | Toast notifications in LIFF page | Already in `LiffLayout` via `<Toaster />` |
| shadcn `Input`, `Button`, `Card`, `Label`, `Select` | (monorepo) | Event form UI components | Already in `packages/ui/src/components/` |

[VERIFIED: packages/ui/src/components/ directory listing]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<input type="datetime-local">` (native HTML) | `react-datepicker`, `@radix-ui/react-calendar` | No calendar library is installed. Native datetime-local works in LINE's mobile webview and requires zero new dependencies. Calendar libraries need installation and may have SSR issues inside LIFF. Use native. |
| Proxy pattern (`/api/proxy/[...path]`) | Direct LIFF-to-API fetch | Proxy is the established pattern for LIFF pages; it handles session cookie forwarding. Use proxy. |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
apps/api/src/
├── routes/events.ts                     # New Elysia plugin — POST /events, GET /events/:id
├── webhook/handlers/
│   └── text-message.ts                  # New — handles message events, command parsing

apps/web/app/liff/events/create/
└── page.tsx                             # New LIFF event creation form page
```

No new directories needed elsewhere. All existing directories already exist.

### Pattern 1: Elysia Route Plugin

The established pattern from `apps/api/src/routes/clubs.ts` and `liff-profile.ts`:

```typescript
// apps/api/src/routes/events.ts
// Source: existing pattern in apps/api/src/routes/liff-profile.ts
import { Elysia, t } from "elysia";
import { db, events, clubs, members, clubMembers } from "@repo/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireClubRole } from "../lib/require-club-role";

export const eventRoutes = new Elysia({ prefix: "/events" })
  .use(authMiddleware)
  .post("/", async ({ body, session }) => {
    // 1. Look up member from session
    // 2. requireClubRole(body.clubId, member.id, ["owner", "admin"])
    // 3. db.insert(events).values({ ...body, status: "open" })
    // 4. lineClient.pushMessage({ to: club.lineGroupId, messages: [flexCard] })
    // 5. store sentMessages[0].id in events.lineMessageId
  }, { body: t.Object({ ... }) });
```

Register in `apps/api/src/index.ts` alongside existing plugins:
```typescript
import { eventRoutes } from "./routes/events";
// ...
app.group("/api", (app) => app.use(eventRoutes))
```

[VERIFIED: apps/api/src/index.ts shows this exact registration pattern]

### Pattern 2: pushMessage and Storing lineMessageId

`lineClient.pushMessage()` returns `PushMessageResponse` with `sentMessages: Array<SentMessage>`. Each `SentMessage` has `id: string`.

```typescript
// Source: node_modules/@line/bot-sdk/dist/messaging-api/model/pushMessageResponse.d.ts
// Source: node_modules/@line/bot-sdk/dist/messaging-api/model/sentMessage.d.ts
const response = await lineClient.pushMessage({
  to: club.lineGroupId!,          // groupId stored in clubs.lineGroupId
  messages: [flexMessage],
});
const lineMessageId = response.sentMessages[0]?.id ?? null;
// Then update the event record:
await db.update(events)
  .set({ lineMessageId })
  .where(eq(events.id, newEvent.id));
```

[VERIFIED: type definitions in local node_modules]

### Pattern 3: Webhook Text-Message Handler

The webhook router in `apps/api/src/webhook/line.ts` uses a switch on `event.type`. Add a `message` case:

```typescript
// apps/api/src/webhook/handlers/text-message.ts
import { webhook } from "@line/bot-sdk";
import { lineClient } from "../../lib/line-client";
import { env } from "../../env";
import { db, clubs, clubMembers, members } from "@repo/db";
import { eq, and } from "drizzle-orm";

const CREATE_COMMANDS = ["/create", "/new", "สร้าง", "สร้างอีเวนท์"];

export async function handleTextMessage(event: webhook.MessageEvent): Promise<void> {
  if (event.message.type !== "text") return;
  const source = event.source;
  if (!source || source.type !== "group") return;

  const text = (event.message as webhook.TextMessageContent).text.trim();
  if (!CREATE_COMMANDS.includes(text)) return;

  const groupId = (source as webhook.GroupSource).groupId;
  const lineUserId = (source as webhook.GroupSource).userId;
  if (!groupId || !lineUserId) return;

  // Resolve group → club
  const [club] = await db.select().from(clubs).where(eq(clubs.lineGroupId, groupId));
  if (!club) return; // D-03: silently ignore if group not linked

  // Resolve lineUserId → member → role
  const [member] = await db.select().from(members).where(eq(members.lineUserId, lineUserId));
  if (!member) return; // D-03: silently ignore

  const [membership] = await db.select({ role: clubMembers.role })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.memberId, member.id)));

  if (!membership || !["owner", "admin"].includes(membership.role)) return; // D-03

  // Admin confirmed — reply with LIFF link
  const liffUrl = `https://liff.line.me/${env.LIFF_ID}?path=/liff/events/create&clubId=${club.id}`;
  await lineClient.replyMessage({
    replyToken: event.replyToken!,
    messages: [{ type: "text", text: `สร้างอีเวนท์ใหม่: ${liffUrl}` }],
  });
}
```

Then add to `apps/api/src/webhook/line.ts`:
```typescript
case "message":
  await handleTextMessage(event as webhook.MessageEvent);
  break;
```

[VERIFIED: webhook/line.ts switch pattern; webhook/handlers/join.ts replyMessage pattern]

### Pattern 4: LIFF Form Page

Based on the established `apps/web/app/liff/profile/page.tsx` pattern:

```typescript
// apps/web/app/liff/events/create/page.tsx
"use client";
// 1. useEffect: fetch "/api/proxy/events/club-defaults?clubId=..." when isReady && isLoggedIn
// 2. Pre-fill form with club defaults
// 3. On submit: POST "/api/proxy/events" with form data
// 4. On success: show toast "อีเวนท์สร้างแล้ว" and close LIFF (liff.closeWindow())
```

The LIFF layout (`apps/web/app/liff/layout.tsx`) already wraps all LIFF pages with `LiffProvider` and `Toaster` — no changes needed there.

[VERIFIED: apps/web/app/liff/profile/page.tsx and apps/web/app/liff/layout.tsx]

### Pattern 5: Flex Message Card Structure

Based on the existing bubble pattern in `join.ts`:

```typescript
// Source: apps/api/src/webhook/handlers/join.ts — bubble Flex Message structure
const eventCard: messagingApi.FlexMessage = {
  type: "flex",
  altText: `${event.title} — ${event.venueName}`,
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: event.title, weight: "bold", size: "lg" },
        { type: "text", text: `${formattedDate}`, size: "sm", color: "#666666" },
        { type: "text", text: event.venueName, size: "sm", action: { type: "uri", label: event.venueName, uri: event.venueMapsUrl } },
        { type: "text", text: `ลูกขน ${event.shuttlecockFee}฿ / สนาม ${event.courtFee}฿`, size: "sm" },
        { type: "text", text: `0/${event.maxPlayers} คน`, size: "sm", color: "#22c55e" },
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "button", style: "primary", action: { type: "uri", label: "ลงทะเบียน", uri: registerLiffUrl } },
        { type: "button", style: "secondary", action: { type: "uri", label: "รายละเอียด", uri: detailsLiffUrl } },
      ],
    },
  },
};
```

[VERIFIED: join.ts Flex Message pattern — bubble type, body/footer layout confirmed]

### Pattern 6: Title Auto-Generation

D-07 specifies Thai short date + venue name. Use `Intl.DateTimeFormat` with `th-TH` locale:

```typescript
// Claude's Discretion — Thai date formatting
// Option A: CE with Thai locale (simpler, readable)
const formatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
// Result: "15 เม.ย." (CE year omitted for brevity)
// auto-title: `แบด ${formatter.format(eventDate)} - ${venueName}`

// Option B: Buddhist Era
const formatterBE = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "short" });
// Result: "15 เม.ย." (same for day/month without year)
```

Recommendation: Use option A (CE, `th-TH` locale) — Thai badminton groups use CE dates in daily messages. Buddhist Era distinction only matters when the year is displayed.

[ASSUMED — Thai badminton group convention for date format; planner should confirm or leave as Claude's discretion]

### Anti-Patterns to Avoid

- **Editing LINE messages after posting:** LINE Messaging API does not support editing sent messages (BOT-02 repost strategy is Phase 5 scope). Phase 4 only stores `lineMessageId` for future use.
- **Calling pushMessage inside webhook handler:** The webhook must return 200 immediately. Event creation (and pushMessage call) happens via the LIFF form → API route, NOT from a webhook handler.
- **Checking role in middleware instead of per-route:** The `requireClubRole` helper is called per-route with a specific `clubId`. Don't try to move this to global middleware.
- **Parsing date on the client only:** The `eventDate` timestamp must be validated server-side with Elysia's `t.String()` or `t.Date()` before inserting.
- **Using `replyMessage` for the event card:** The event card is posted after form submission, NOT as a reply to a webhook event — use `pushMessage` (requires `to: groupId`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP session cookies | Custom JWT or token logic | `iron-session` (already installed) | Sealed cookies, replay-safe, established in auth middleware |
| Role check | Custom DB query + boolean | `requireClubRole()` helper | Already handles not-found and insufficient-role errors consistently |
| Webhook idempotency | Manual deduplication | `processWithIdempotency()` wrapper | Already handles LINE redelivery; new `message` handler should use it |
| LINE message client | Direct `fetch` to LINE API | `lineClient` singleton | Handles channel access token, type safety, retries |
| Form validation | Manual `if/else` checks | `zod` schema + `zodResolver` | Consistent with all existing forms; gives typed parse errors |

**Key insight:** This phase adds new code paths but reuses every existing abstraction. The unique work is: (1) Flex Message JSON composition, (2) command string matching, (3) Thai date formatting for the auto-title.

---

## Common Pitfalls

### Pitfall 1: LIFF App URL with Deep Link to clubId
**What goes wrong:** The LIFF URL `/liff/events/create` needs to know which `clubId` the form is for. If `clubId` is not passed, the form cannot pre-fill club defaults.
**Why it happens:** LIFF opens in a webview — the opener (LINE chat) must encode context in the URL.
**How to avoid:** Pass `clubId` as a query parameter in the LIFF URL: `https://liff.line.me/${LIFF_ID}?path=/liff/events/create&clubId=${club.id}`. Read it with `useSearchParams()` in the Next.js page.
**Warning signs:** Form loads but shows empty defaults.

### Pitfall 2: `lineGroupId` May Be Null
**What goes wrong:** `clubs.lineGroupId` is nullable (a club may not yet be linked to a LINE group). `pushMessage` to a `null` destination throws or silently fails.
**Why it happens:** Club-to-group linking (Phase 2) may not have completed.
**How to avoid:** In the event creation API handler, check `if (!club.lineGroupId)` and return a 422 error before calling pushMessage. The LIFF form should surface this clearly.
**Warning signs:** Silent failure — event saved but no card posted.

### Pitfall 3: `sentMessages[0]` May Be Undefined
**What goes wrong:** If `pushMessage` returns an empty `sentMessages` array (e.g., message quota exceeded), accessing `[0].id` throws.
**Why it happens:** LINE limits free-tier messaging to 500 push messages/month on Messaging API Free plan.
**How to avoid:** Use optional chaining: `response.sentMessages[0]?.id ?? null`. Log a warning if null. Event is still created — `lineMessageId` just stays null.
**Warning signs:** `lineMessageId` column always null in production.

### Pitfall 4: Webhook Text Handler DB Latency
**What goes wrong:** The text-message handler does 3-4 sequential DB queries (club lookup, member lookup, membership lookup) before replying. If any query is slow, the reply is delayed. LINE retries webhooks after 1s.
**Why it happens:** Role resolution requires joining 3 tables via userId.
**How to avoid:** All 3 queries can be collapsed into 1 with a JOIN. Use a single query: join `clubs` on `lineGroupId`, join `club_members` on `clubId`, join `members` on `lineUserId`. Return role in one round trip.
**Warning signs:** LINE webhook retry logs.

### Pitfall 5: `datetime-local` Value Format
**What goes wrong:** `<input type="datetime-local">` returns a string like `"2026-04-15T18:00"` (no timezone). Inserting this directly into Postgres `timestamp with time zone` stores it as UTC, not Thai time (UTC+7).
**Why it happens:** Browser's datetime-local value has no timezone offset.
**How to avoid:** On the client, append the Thai offset before sending: append `":00+07:00"` to the datetime string. Or parse as a local Date and send ISO string. Server must accept the offset. Thai badminton admins are in Thailand (UTC+7).
**Warning signs:** Event shows at wrong time in group card.

### Pitfall 6: Thai Command Encoding in Webhook
**What goes wrong:** Thai text in webhook payloads (`สร้าง`, `สร้างอีเวนท์`) may include trailing spaces or zero-width characters from LINE's input.
**Why it happens:** Mobile keyboard autocomplete often adds spaces.
**How to avoid:** Always `.trim()` the message text before comparing against the command list. The `handleTextMessage` example above already does this.
**Warning signs:** Commands typed by users don't match; bot does not respond.

---

## Code Examples

### pushMessage Call with Error Handling
```typescript
// Source: node_modules/@line/bot-sdk/dist/messaging-api/api/messagingApiClient.d.ts
// Source: node_modules/@line/bot-sdk/dist/messaging-api/model/sentMessage.d.ts
let lineMessageId: string | null = null;
try {
  const pushResponse = await lineClient.pushMessage({
    to: club.lineGroupId!,
    messages: [eventFlexCard],
  });
  lineMessageId = pushResponse.sentMessages[0]?.id ?? null;
  if (!lineMessageId) {
    console.warn("pushMessage succeeded but returned no sentMessages[0].id");
  }
} catch (err) {
  // Log error but do NOT rollback the event — event is saved, card just wasn't posted
  console.error("Failed to push Flex Message to group:", (err as Error).message);
}

// Update event with lineMessageId (may be null if push failed)
await db.update(events)
  .set({ lineMessageId })
  .where(eq(events.id, createdEvent.id));
```

### Club Defaults API Endpoint
```typescript
// GET /api/events/club-defaults?clubId=:id
// Returns club defaults for pre-filling the LIFF form
.get("/club-defaults", async ({ query, session }) => {
  // Verify caller is member of this club
  const [member] = await db.select().from(members).where(eq(members.lineUserId, session.lineUserId!));
  if (!member) throw notFound("Member");
  await requireClubRole(query.clubId, member.id, ["owner", "admin"]);

  const [club] = await db.select({
    venueName: clubs.homeCourtLocation,
    defaultShuttlecockFee: clubs.defaultShuttlecockFee,
    defaultCourtFee: clubs.defaultCourtFee,
    defaultMaxPlayers: clubs.defaultMaxPlayers,
  }).from(clubs).where(eq(clubs.id, query.clubId));

  if (!club) throw notFound("Club");
  return club;
}, { query: t.Object({ clubId: t.String({ format: "uuid" }) }) })
```

### Optimized Role Check in Webhook Handler (Single Query)
```typescript
// Single-query role resolution to minimize latency in webhook hot path
const [result] = await db
  .select({ role: clubMembers.role, clubId: clubs.id })
  .from(clubs)
  .innerJoin(clubMembers, eq(clubMembers.clubId, clubs.id))
  .innerJoin(members, eq(members.id, clubMembers.memberId))
  .where(and(
    eq(clubs.lineGroupId, groupId),
    eq(members.lineUserId, lineUserId),
  ));

if (!result || !["owner", "admin"].includes(result.role)) return; // D-03: silently ignore
```

---

## Runtime State Inventory

> Not a rename/refactor/migration phase. No runtime state inventory required.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@line/bot-sdk` | pushMessage, Flex Message types | Yes | 11.0.0 | — |
| `@line/liff` | LIFF auth in event form | Yes | 2.28.0 | — |
| Postgres (Neon) | events table, club defaults query | Yes (connection via DATABASE_URL) | — | — |
| LINE group linked to club | Card posting (lineGroupId not null) | Runtime check required | — | Return 422 if null |

[VERIFIED: package.json files in apps/api and apps/web]

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Note:** The `LIFF_ID` environment variable must be set in `apps/api/.env` (for building LIFF deep-link URLs in the text-message handler). Confirm this env var exists; `apps/web` already has `NEXT_PUBLIC_LIFF_ID`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in Bun test runner) |
| Config file | none — `bun test` discovers `*.test.ts` in `src/__tests__/` |
| Quick run command | `cd apps/api && bun test src/__tests__/events.test.ts` |
| Full suite command | `cd apps/api && bun test` |

[VERIFIED: apps/api/package.json `"test": "bun test"`; existing test files in apps/api/src/__tests__/]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVNT-01 | POST /api/events creates event record in DB with status=open | integration | `cd apps/api && bun test src/__tests__/events.test.ts` | No — Wave 0 |
| EVNT-02 | GET /api/events/club-defaults returns club's default fields | integration | `cd apps/api && bun test src/__tests__/events.test.ts` | No — Wave 0 |
| BOT-01 | POST /api/events triggers pushMessage and stores lineMessageId | integration (mock lineClient) | `cd apps/api && bun test src/__tests__/events.test.ts` | No — Wave 0 |
| BOT-03 | Webhook text message with `/create` alias triggers LIFF link reply for admin only | unit (mock lineClient + DB) | `cd apps/api && bun test src/__tests__/text-message.test.ts` | No — Wave 0 |
| BOT-03 | Non-admin or non-member sending `/create` does NOT get a reply | unit | `cd apps/api && bun test src/__tests__/text-message.test.ts` | No — Wave 0 |
| BOT-03 | All 4 command aliases (`/create`, `/new`, `สร้าง`, `สร้างอีเวนท์`) trigger the flow | unit | `cd apps/api && bun test src/__tests__/text-message.test.ts` | No — Wave 0 |

### Established Test Patterns (from existing test files)
- Use `mock.module("@line/bot-sdk", ...)` to replace `lineClient` with a spy — see `join-event.test.ts`
- Use `spyOn(lineClient, "pushMessage").mockResolvedValue({ sentMessages: [{ id: "mock-id-123", quoteToken: "token" }] })` for pushMessage mock
- Use `sealData()` to create session cookies — see `clubs.test.ts`
- Integration tests run against real Neon DB (not mocked) for persistence tests
- `processWithIdempotency` is mocked in unit tests to avoid DB dependency — see `join-event.test.ts`

[VERIFIED: apps/api/src/__tests__/join-event.test.ts and clubs.test.ts patterns]

### Sampling Rate
- **Per task commit:** `cd apps/api && bun test src/__tests__/events.test.ts src/__tests__/text-message.test.ts`
- **Per wave merge:** `cd apps/api && bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/__tests__/events.test.ts` — covers EVNT-01, EVNT-02, BOT-01
- [ ] `apps/api/src/__tests__/text-message.test.ts` — covers BOT-03

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `authMiddleware` (iron-session sealed cookie) — already enforced on all API routes |
| V3 Session Management | yes | iron-session (existing) — no changes needed |
| V4 Access Control | yes | `requireClubRole(clubId, memberId, ["owner","admin"])` on POST /events |
| V5 Input Validation | yes | Elysia `t.Object()` body schema + zod on LIFF form |
| V6 Cryptography | no | No new crypto; iron-session handles session sealing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Member submits event creation bypassing role check | Elevation of Privilege | `requireClubRole(body.clubId, member.id, ["owner","admin"])` server-side; LIFF page role check is UX-only |
| LIFF form submits arbitrary `clubId` not belonging to member | Tampering | `requireClubRole` verifies membership + role before any DB insert |
| Replay of stale LIFF URL with old `clubId` | Tampering | Server-side role check gates all state mutations |
| Webhook command spoofing | Spoofing | LINE SDK `validateSignature` already enforces HMAC on all webhook payloads (established in Phase 1) |
| `lineGroupId` injection in event body | Tampering | `lineGroupId` is never taken from request body — resolved from `clubs` table using verified `clubId` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Thai badminton group admins use CE dates (not Buddhist Era) in daily messages | Architecture Patterns — Title Auto-Generation | Auto-generated title uses wrong year era; low visual impact since year is omitted from title |
| A2 | LINE's mobile webview supports `<input type="datetime-local">` acceptably | Architecture Patterns — Alternatives Considered | Date input is broken on some Android LINE versions; would need a fallback date picker |

---

## Open Questions

1. **LIFF_ID env var in API app**
   - What we know: `apps/web` uses `NEXT_PUBLIC_LIFF_ID`. The text-message webhook handler needs to build a LIFF deep-link URL, which requires the LIFF ID.
   - What's unclear: Is `LIFF_ID` (non-public) already in `apps/api/.env`? Or does only `apps/web` have it?
   - Recommendation: Wave 0 task should check `apps/api/src/env.ts` and add `LIFF_ID` env var if missing.

2. **clubs.homeCourtLocation vs venueName for defaults**
   - What we know: `clubs.homeCourtLocation` stores a string (up to 500 chars). CONTEXT.md D-06 says venue name defaults from club settings. The schema does not have a separate `defaultVenueName` field.
   - What's unclear: Should the default venue name be pre-filled from `clubs.homeCourtLocation`?
   - Recommendation: Yes — use `homeCourtLocation` as the default venue name pre-fill. It's the only venue-related field in the clubs schema.

3. **`venueMapsUrl` default**
   - What we know: D-06 says venue maps URL defaults from club settings, but `clubs` schema has no `defaultVenueMapsUrl` field — only `homeCourtLocation`.
   - What's unclear: Is the maps URL expected to be a separate default in the clubs schema, or was this an oversight?
   - Recommendation: Treat `venueMapsUrl` as optional/blank by default (no club-level default available). Planner should note this gap — a migration adding `defaultVenueMapsUrl` to clubs table may be needed, or omit from defaults.

---

## Sources

### Primary (HIGH confidence)
- Local node_modules `@line/bot-sdk@11.0.0` type definitions — `PushMessageResponse`, `SentMessage`, `pushMessage` signature
- `apps/api/src/webhook/handlers/join.ts` — Flex Message bubble structure, `replyMessage` pattern
- `apps/api/src/webhook/line.ts` — webhook event routing switch pattern
- `apps/api/src/lib/line-client.ts` — `lineClient` singleton
- `apps/api/src/middleware/auth.ts` — `authMiddleware`, `SessionData`
- `apps/api/src/lib/require-club-role.ts` — role check pattern
- `apps/api/src/routes/liff-profile.ts` — Elysia plugin pattern
- `apps/web/app/liff/profile/page.tsx` — LIFF page pattern
- `apps/web/components/liff/profile-form.tsx` — react-hook-form + zod + shadcn pattern
- `apps/web/app/api/proxy/[...path]/route.ts` — proxy forwarding pattern
- `packages/db/src/schema/events.ts` — events table schema
- `packages/db/src/schema/clubs.ts` — clubs table with lineGroupId, defaultShuttlecockFee, defaultCourtFee, defaultMaxPlayers
- `packages/db/src/schema/club-members.ts` — role enum (owner/admin/member)
- `apps/api/src/__tests__/join-event.test.ts` — bun:test patterns, lineClient mocking

### Secondary (MEDIUM confidence)
- WebSearch: LINE Messaging API `pushMessage` response structure — confirmed via local SDK type definitions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json and npm registry
- Architecture: HIGH — all patterns verified from existing codebase files
- Pitfalls: HIGH — derived from type definitions and existing code analysis
- Test patterns: HIGH — verified from existing test files

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (LINE SDK v11.0.0 is stable; no fast-moving dependencies)
