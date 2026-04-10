# Phase 5: Registration Loop - Research

**Researched:** 2026-04-08
**Domain:** Elysia API registration CRUD, LIFF registration UI, LINE Messaging API repost strategy
**Confidence:** HIGH (all claims based on direct codebase inspection)

## Summary

Phase 5 builds the core registration loop: a LIFF page where members can register/cancel for an event in one tap, and the bot reposts a Flex Message card to the LINE group on every change. The schema and auth infrastructure are fully in place — `registrations` table with `(eventId, memberId)` unique constraint already exists, `events.status` enum already supports `open/closed/cancelled`, and `events.lineMessageId` is already stored. This is primarily an **additive phase**: a new Elysia route plugin (`registrations.ts`), a new LIFF page (`/liff/events/[id]/register/page.tsx`), an extension of `buildEventFlexCard`, and event status mutation endpoints.

The primary challenge is the **repost strategy**: every registration mutation must atomically update the DB and then best-effort push a new Flex Message card to the LINE group, updating `events.lineMessageId` to the latest card. The concurrency risk (two members registering simultaneously) is already handled by the DB unique constraint — the second INSERT fails with a unique violation which maps to a 409 Conflict response.

**Primary recommendation:** Follow the Phase 4 best-effort push pattern exactly — mutation always succeeds, LINE push failure is logged and non-fatal. Build registration routes as a new Elysia plugin following the same structure as `events.ts`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Registration UX**
- D-01: One-tap registration — LIFF opens showing event info + member list, member taps one button to register instantly.
- D-02: Registration list shows numbered names only (e.g., 1. สมชาย, 2. สมหญิง). No skill level or timestamp. Full list in LIFF; card shows count only.
- D-03: Cancel via same page — if already registered, the Register button toggles to "ยกเลิก" (Cancel). One tap to remove.
- D-04: List refreshes on LIFF page focus (not real-time polling). When member switches back from LINE chat, list reloads with current data.

**Card Repost Strategy**
- D-05: Repost on every registration change — register, cancel, or admin remove all trigger a new Flex Message card push to the group.
- D-06: Reposted card is notification-style: "[MemberName] ลงทะเบียนแล้ว (30/40 คน)" for registrations, "[MemberName] ยกเลิกแล้ว (29/40 คน)" for cancellations. Admin removes show count update without naming the removed member.
- D-07: Old cards remain in chat as history. No attempt to reference or link old cards.
- D-08: `events.lineMessageId` updated to point to the latest reposted card after each push.
- D-09: Repost is best-effort — if LINE pushMessage fails, log the error and continue. Registration mutation always succeeds regardless of card push result. Same pattern as Phase 4.

**Admin Controls**
- D-10: Admin member removal is inline — admins see an (X) remove icon next to each member name in the registration list. Same page, no separate admin section.
- D-11: Close registration via LIFF button — "ปิดรับลงทะเบียน" button at the bottom of the registration page, visible to admins only. No bot command for close in this phase.
- D-12: When admin closes registration, bot reposts Flex Message card to group showing "ปิดรับลงทะเบียนแล้ว" with final count.
- D-13: Admin can reopen closed registration — "เปิดรับลงทะเบียน" (Reopen) button appears for admins when event is closed. Sets status back to `open`.

**Full/Closed States**
- D-14: Full event LIFF page: Register button disabled with "เต็มแล้ว" text. Red/orange badge at top. Member list still visible.
- D-15: Full event card: shows "40/40 เต็ม" indicator. Register CTA still opens LIFF (shows full state there). Per BOT-04.
- D-16: Closed event LIFF page: same disabled button pattern with "ปิดรับลงทะเบียนแล้ว" text. Registration list visible for reference.
- D-17: Closed event card: reposts with "ปิดรับลงทะเบียนแล้ว" and final count.

### Claude's Discretion
- LIFF registration page layout and styling details
- API endpoint design for registration CRUD and event status mutations
- How the close/reopen bot card references the event (by lineMessageId or event title)
- Concurrency handling for simultaneous registrations (DB unique constraint handles duplicates)
- Error handling for edge cases (registering for cancelled event, etc.)

### Deferred Ideas (OUT OF SCOPE)
- Waitlist when event is full — out of scope per requirements (automated waitlist with auto-promotion explicitly excluded)
- Bot command for close registration (`/close`, `ปิด`) — user chose LIFF-only for Phase 5; could add bot command later
- Event editing after creation (change date/venue/fees) — noted in Phase 4 deferred ideas
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REG-01 | Member taps "Register" → LIFF opens → member adds themselves to the registration list | LIFF page at `/liff/events/[id]/register`; POST `/api/registrations` inserts into `registrations` table |
| REG-02 | Registration list visible in LIFF — members see who else is registered | GET `/api/events/:id/registrations` returns list with member displayNames; LIFF page fetches on focus |
| REG-03 | Members can cancel their own registration via LIFF | DELETE `/api/registrations/:registrationId` or by `eventId+memberId`; toggle button on LIFF page |
| REG-04 | Admin can close registration early via bot command | PATCH `/api/events/:id/status` sets `status=closed`; LIFF-only close button per D-11 |
| REG-05 | Admin can remove any member from the registration list via LIFF admin panel | Admin sees (X) icon per row; calls DELETE `/api/registrations/:registrationId` as admin |
| BOT-02 | Bot updates the Flex Message count when registrations change (repost strategy) | After each mutation, call `lineClient.pushMessage` with new card; update `events.lineMessageId` |
| BOT-04 | Card shows "Full" state with disabled register button when event reaches max players | Check `registrations.count >= events.maxPlayers`; build card with full indicator; LIFF page shows disabled state |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new packages needed)
[VERIFIED: direct codebase inspection]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| elysia | ^1.4.28 | Elysia plugin for registration routes | Matches existing API routes pattern |
| drizzle-orm | ^0.45.2 | DB queries: insert/select/delete on `registrations` | Already used throughout |
| @line/bot-sdk | ^11.0.0 | `lineClient.pushMessage` for repost cards | Already used in Phase 4 |
| iron-session | ^8.0.4 | Session decoding in `authMiddleware` | Already used; no change |
| zod | ^4.3.6 | Request body validation on new routes | Already used throughout |

### Frontend (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @line/liff | (in web app) | LIFF SDK for `visibilitychange` focus refresh | D-04: refresh on page focus |
| react-hook-form | (in web app) | Form state (not needed here — single-button UI) | Not needed for register/cancel toggle |
| sonner | (in web app) | Toast feedback on register/cancel/error | Same pattern as create event page |
| shadcn/ui Button, Card | (in web app) | Registration UI components | Same pattern as all LIFF pages |
| lucide-react | (in web app) | X icon for admin remove, Loader2 spinner | Already used in event create page |

**No new packages required for this phase.** All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
apps/api/src/
└── routes/
    └── registrations.ts        # NEW: registration CRUD + event status mutation

apps/web/app/liff/events/
└── [id]/
    └── register/
        └── page.tsx            # NEW: LIFF registration page

apps/api/src/lib/
└── flex-messages.ts            # EXTEND: add buildRepostFlexCard() or extend buildEventFlexCard()
```

### Pattern 1: Registration Route Plugin (Elysia)

**What:** New Elysia plugin with `.use(authMiddleware)` following the exact same pattern as `eventRoutes` in `apps/api/src/routes/events.ts`.

**Endpoints needed:**
- `GET /registrations?eventId=:id` — fetch event data + registration list (public info within session)
- `POST /registrations` — register current member for event
- `DELETE /registrations/:registrationId` — cancel own registration (or admin removes any)
- `PATCH /events/:id/status` — admin sets `status=closed` or `status=open` (can live in events.ts or separate route)

**Example structure:**
```typescript
// Source: apps/api/src/routes/events.ts (existing pattern)
export const registrationRoutes = new Elysia({ prefix: "/registrations" })
  .use(authMiddleware)
  .get("/", async ({ query, session }) => { /* ... */ },
    { query: t.Object({ eventId: t.String({ format: "uuid" }) }) })
  .post("/", async ({ body, session, set }) => { /* ... */ },
    { body: t.Object({ eventId: t.String({ format: "uuid" }) }) })
  .delete("/:registrationId", async ({ params, session }) => { /* ... */ });
```

**Register in index.ts** — add `.use(registrationRoutes)` alongside existing `.use(eventRoutes)`.

### Pattern 2: Unique Constraint Conflict Handling (Concurrency)

**What:** The `registrations` table has `unique().on(t.eventId, t.memberId)` [VERIFIED: codebase]. Two simultaneous register clicks will cause the second DB INSERT to throw a unique violation. This must be caught and returned as 409 Conflict.

**How to detect Neon/Drizzle unique violation:**
```typescript
// Source: [ASSUMED] — Postgres unique violation is PG error code 23505
try {
  await db.insert(registrations).values({ eventId, memberId });
} catch (err: any) {
  if (err?.code === "23505") {
    throw new ApiError(409, "ALREADY_REGISTERED", "Already registered");
  }
  throw err;
}
```

**Note:** `@neondatabase/serverless` with `drizzle-orm/neon-http` passes through Postgres error codes in the thrown error object. The exact property path needs verification at runtime — `err.code` is the standard pg pattern. [ASSUMED: exact error shape from neon-http driver]

### Pattern 3: LIFF Page — Focus Refresh (D-04)

**What:** The page fetches registration data on mount AND when user returns to the page (visibilitychange). No polling interval.

**Example:**
```typescript
// Source: [ASSUMED — standard browser API, well documented]
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      fetchRegistrations();
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);
  return () => document.removeEventListener("visibilitychange", handleVisibility);
}, []);
```

This fires when the user switches back from LINE chat to the LIFF webview — which is the exact trigger D-04 specifies.

### Pattern 4: Repost Card After Mutation

**What:** After every successful DB mutation (register, cancel, admin remove, close, reopen), call `lineClient.pushMessage` with a new Flex Message card. Update `events.lineMessageId` with the new message ID. Wrap in try/catch — failure is logged, never thrown.

**Example (following Phase 4 pattern):**
```typescript
// Source: apps/api/src/routes/events.ts (verified pattern)
const liffBase = `https://liff.line.me/${env.LIFF_ID}`;
const registerLiffUrl = `${liffBase}/events/${eventId}/register`;

const flexCard = buildRepostFlexCard({
  title: event.title,
  eventDate: event.eventDate,
  venueName: event.venueName ?? "",
  shuttlecockFee: event.shuttlecockFee,
  courtFee: event.courtFee,
  maxPlayers: event.maxPlayers,
  registeredCount: newCount,
  status: event.status,
  notificationText: "[MemberName] ลงทะเบียนแล้ว (30/40 คน)",
  registerLiffUrl,
  detailsLiffUrl: `${liffBase}/events/${eventId}`,
});

try {
  const pushResponse = await lineClient.pushMessage({
    to: club.lineGroupId!,
    messages: [flexCard],
  });
  const newMessageId = pushResponse.sentMessages[0]?.id ?? null;
  if (newMessageId) {
    await db.update(events).set({ lineMessageId: newMessageId }).where(eq(events.id, eventId));
  }
} catch (err) {
  console.error("Failed to repost flex card:", (err as Error).message);
}
```

### Pattern 5: Admin Role Check in LIFF Page

**What:** The LIFF page calls an API endpoint that returns both event data AND the calling member's role. This avoids a separate role-check round-trip.

**GET /registrations?eventId=:id response:**
```typescript
{
  event: { id, title, eventDate, venueName, status, maxPlayers, registeredCount },
  registrations: [{ id, memberId, displayName, isCurrentMember: boolean }],
  currentMemberRegistrationId: string | null,  // null if not registered
  isAdmin: boolean,  // owner or admin in the club
}
```

The `isAdmin` flag controls whether the LIFF page shows the (X) remove buttons and the close/reopen button.

### Pattern 6: `buildRepostFlexCard` Extension

**What:** Extend `flex-messages.ts` to handle three card variants:
1. **Normal card** (existing `buildEventFlexCard`) — used at event creation
2. **Repost card** — adds `altText` with notification message (e.g., "[Name] ลงทะเบียนแล้ว"), shows updated count, same layout
3. **Full state card** — count shows "40/40 เต็ม" in red/orange, per D-15
4. **Closed state card** — shows "ปิดรับลงทะเบียนแล้ว", per D-17

**Approach:** Extend `EventCardData` interface with optional fields `notificationAltText?: string` and `isFull?: boolean` and `isClosed?: boolean`. The same `buildEventFlexCard` function branches on these. This keeps the builder DRY.

### Anti-Patterns to Avoid

- **Failing the mutation if push fails:** Never — D-09 is explicit: registration always succeeds, push is best-effort.
- **Polling for list updates:** D-04 says focus-only refresh. No `setInterval` polling.
- **Calling LINE API to edit the old message:** LINE Messaging API does not support editing sent messages. New push = new message. Old cards stay as history per D-07. [VERIFIED: LINE API design — pushMessage only, no editMessage]
- **Separate admin page/route for member removal:** D-10 says inline (X) icons on the same LIFF page.
- **Checking full state on the client only:** Always enforce server-side — `registeredCount >= maxPlayers` check in POST /registrations before INSERT.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth/session | Custom session decoding | `authMiddleware` (existing) | Already handles `badminton-session` cookie decryption |
| Role checking | Inline DB role query per route | `requireClubRole()` (existing) | Consistent forbidden error, DRY |
| LINE push | Custom HTTP call to LINE API | `lineClient` singleton (existing) | Already configured, typed |
| Unique constraint errors | Custom duplicate check | Catch DB error code 23505 | Atomic at DB level — no race condition |
| LIFF init | Custom SDK loading | `LiffProvider` + `useLiff` hook (existing) | Handles SSR crash, auth flow, session cookie |
| Toast notifications | Custom toast UI | `sonner` + `<Toaster>` (in LiffLayout already) | Already mounted in `apps/web/app/liff/layout.tsx` |

---

## Common Pitfalls

### Pitfall 1: Missing Club Lookup for lineGroupId Before Repost
**What goes wrong:** After a registration mutation, calling `pushMessage` without fetching the club's `lineGroupId` — the event row doesn't store `lineGroupId`, only the club does.
**Why it happens:** `registrations` and `events` tables don't have `lineGroupId`. It lives on `clubs`.
**How to avoid:** In the repost helper, JOIN `events` → `clubs` to get `lineGroupId` before calling `pushMessage`. Or accept `clubId` as a parameter and look it up.
**Warning signs:** `pushMessage` called with `to: undefined`.

### Pitfall 2: Race Condition Between Count Read and Full State Check
**What goes wrong:** Two members register simultaneously; both read `count=39`, both pass the `>= maxPlayers` check (max=40), both INSERT — one succeeds, one hits unique constraint. BUT if different members, both succeed, creating 41 registrations.
**Why it happens:** Count check and INSERT are two separate operations, not atomic.
**How to avoid:** After INSERT, re-query `COUNT(*)` to get actual count. For the max-player enforcement, do a DB-level check: `SELECT COUNT(*) FROM registrations WHERE event_id = $1` and compare inside the same transaction, or accept that the unique constraint prevents duplicates but not over-registration.
**Correct approach:** Check `SELECT COUNT(*) FROM registrations WHERE event_id = :id` before INSERT. If `count >= maxPlayers`, return 409 "Event full". This is a read-then-write but acceptable at this scale (casual badminton groups). For future hardening, a DB trigger or serializable transaction would be the correct approach.
**Warning signs:** `registeredCount` in the response exceeds `maxPlayers`.

### Pitfall 3: Forgetting to Pass `detailsLiffUrl` to Repost Card Builder
**What goes wrong:** `buildEventFlexCard` requires both `registerLiffUrl` and `detailsLiffUrl`. Missing `detailsLiffUrl` causes TS compile error or runtime undefined in the card JSON.
**How to avoid:** Always construct both LIFF URLs from `env.LIFF_ID` + `eventId` before calling the builder — follow the exact pattern in `events.ts` lines 85-87.

### Pitfall 4: Admin Remove Requires Fetching memberId from Registration Row
**What goes wrong:** DELETE endpoint receives `registrationId`. To verify the admin is in the right club, the route needs to look up the registration → event → club chain.
**How to avoid:** In DELETE handler, fetch `registration` by id, then fetch `event` by `eventId`, then verify caller is admin of `event.clubId` via `requireClubRole`. Do NOT allow any member to delete any registration — check caller role first.

### Pitfall 5: LIFF Page SSR Crash on `visibilitychange`
**What goes wrong:** `document.addEventListener("visibilitychange", ...)` called during SSR (Next.js server render) where `document` is undefined.
**How to avoid:** Wrap in `useEffect` (no deps) so it only runs in browser. Already established pattern — `LiffProvider` uses dynamic import for same reason. [VERIFIED: codebase — liff-provider.tsx uses dynamic import]

### Pitfall 6: Closed Event Registration Attempt
**What goes wrong:** Member opens old LIFF URL while event is `closed`. The POST /registrations endpoint must check `event.status === "open"` before inserting.
**How to avoid:** In POST handler, fetch event and validate `status === "open"` AND `registeredCount < maxPlayers`. Return 409 with Thai-language error message for each case.

### Pitfall 7: `isLoggedIn` vs `isReady` Guard in LIFF Page
**What goes wrong:** Fetching registrations before LIFF auth is complete — API call goes out with no session cookie → 401 → misleading error shown to user.
**How to avoid:** Same guard as `events/create/page.tsx` — `if (!isReady || !isLoggedIn) return` in the `useEffect` that triggers the initial fetch. [VERIFIED: events/create/page.tsx line 59]

---

## Code Examples

### GET /api/registrations?eventId=:id — Response Shape
```typescript
// Source: [ASSUMED pattern following events.ts structure]
// Route builds this response:
{
  event: {
    id: string,
    title: string,
    eventDate: string,    // ISO
    venueName: string | null,
    status: "open" | "closed" | "cancelled",
    maxPlayers: number,
    registeredCount: number,
  },
  registrations: Array<{
    id: string,           // registration UUID
    memberId: string,
    displayName: string,
  }>,
  currentMemberRegistrationId: string | null,
  isAdmin: boolean,
}
```

### POST /api/registrations — Request Body
```typescript
// Source: [ASSUMED — minimal body, memberId from session]
{ eventId: string }  // UUID
```

### DELETE /api/registrations/:registrationId
No body required. Member can delete their own; admin can delete any. Server validates ownership or admin role.

### PATCH /api/events/:id/status — Close/Reopen
```typescript
// Source: [ASSUMED — extend events.ts plugin or new route]
{ status: "open" | "closed" }
// Admin only. Triggers repost card.
```

### Flex Card altText for Notification Style
```typescript
// Source: CONTEXT.md D-06 specifics
const altText = action === "register"
  ? `${memberName} ลงทะเบียนแล้ว (${count}/${maxPlayers} คน)`
  : action === "cancel"
  ? `${memberName} ยกเลิกแล้ว (${count}/${maxPlayers} คน)`
  : `ปิดรับลงทะเบียนแล้ว (${count}/${maxPlayers} คน)`;
```

### Focus Refresh Pattern
```typescript
// Source: [ASSUMED — standard DOM API pattern]
useEffect(() => {
  if (!isReady || !isLoggedIn) return;
  fetchData(); // initial load

  const handleVisibility = () => {
    if (document.visibilityState === "visible") fetchData();
  };
  document.addEventListener("visibilitychange", handleVisibility);
  return () => document.removeEventListener("visibilitychange", handleVisibility);
}, [isReady, isLoggedIn]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LINE edit message | LINE pushMessage (new card) | LINE API never supported edit | Cards are immutable; repost is the only strategy |
| Separate admin panel page | Inline admin controls with role-gated UI | Project decision D-10 | Simpler, one LIFF page per event |
| Bot command for close | LIFF-only close button | D-11 | No webhook handler needed for Phase 5 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Neon/Drizzle unique violation exposes `err.code === "23505"` | Architecture Patterns P2 | Unique constraint errors would bubble as 500; need to catch with correct property path |
| A2 | `visibilitychange` event fires reliably when switching back to LIFF from LINE chat | Common Pitfalls P5 | Focus refresh may not trigger in some LINE browser versions; fallback to manual refresh button |
| A3 | `document.visibilityState === "visible"` works inside LINE's in-app browser (LIFF) | Code Examples | May need testing in real LINE environment |
| A4 | PATCH `/api/events/:id/status` can be added to existing `eventRoutes` plugin without conflicts | Architecture Patterns | Elysia plugin structure may need adjustment if prefix conflicts exist |

---

## Open Questions

1. **Neon unique constraint error shape**
   - What we know: Postgres error code 23505 is standard for unique violation
   - What's unclear: Whether `@neondatabase/serverless` neon-http driver exposes `.code` directly on the thrown error or wraps it
   - Recommendation: Add a test case that deliberately double-inserts and inspects the error object; fallback to `err.message.includes("unique")` if `.code` is not available

2. **LIFF focus refresh reliability in LINE in-app browser**
   - What we know: `visibilitychange` is standard browser API
   - What's unclear: LINE's in-app browser (ChromeCustomTab on Android, WKWebView on iOS) behavior with `visibilitychange` when switching apps
   - Recommendation: Implement as planned (D-04 decision is locked); add a manual "รีเฟรช" button as fallback if testing reveals the event doesn't fire reliably

3. **PATCH status endpoint — extend eventRoutes or separate plugin**
   - What we know: `eventRoutes` already has prefix `/events` and `authMiddleware`
   - What's unclear: Whether adding `PATCH /:id/status` to `eventRoutes` is cleaner than a dedicated `registrationStatusRoutes`
   - Recommendation: Add `PATCH /:id/status` to `eventRoutes` — it's an event mutation, belongs there; keeps registrations.ts focused on registration CRUD only

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all tools, SDKs, and services already in use from Phases 1-4)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built into Bun runtime) |
| Config file | none — bun test discovers `*.test.ts` automatically |
| Quick run command | `cd /Users/adisakchaiyakul/project/badminton && pnpm --filter api test -- --testPathPattern=registrations` |
| Full suite command | `cd /Users/adisakchaiyakul/project/badminton && pnpm --filter api test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REG-01 | POST /api/registrations creates registration row, returns 201 | integration | `pnpm --filter api test -- src/__tests__/registrations.test.ts` | Wave 0 |
| REG-01 | POST /api/registrations returns 409 when already registered | integration | same | Wave 0 |
| REG-01 | POST /api/registrations returns 409 when event is full | integration | same | Wave 0 |
| REG-01 | POST /api/registrations returns 409 when event is closed | integration | same | Wave 0 |
| REG-02 | GET /api/registrations?eventId returns list with displayNames and isAdmin flag | integration | same | Wave 0 |
| REG-03 | DELETE /api/registrations/:id removes own registration | integration | same | Wave 0 |
| REG-03 | DELETE /api/registrations/:id returns 403 when member tries to remove another member | integration | same | Wave 0 |
| REG-04 | PATCH /api/events/:id/status closes event (status=closed) for admin | integration | `pnpm --filter api test -- src/__tests__/events.test.ts` | Extend existing |
| REG-04 | PATCH /api/events/:id/status returns 403 for non-admin | integration | same | Extend existing |
| REG-05 | DELETE /api/registrations/:id allows admin to remove any member | integration | `pnpm --filter api test -- src/__tests__/registrations.test.ts` | Wave 0 |
| BOT-02 | POST /api/registrations calls lineClient.pushMessage with updated count | integration (spy) | same | Wave 0 |
| BOT-02 | pushMessage failure does not fail the registration (best-effort) | integration (spy) | same | Wave 0 |
| BOT-02 | events.lineMessageId updated after successful repost | integration | same | Wave 0 |
| BOT-04 | Flex card altText contains "เต็ม" when registeredCount === maxPlayers | unit | same | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter api test -- src/__tests__/registrations.test.ts`
- **Per wave merge:** `pnpm --filter api test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/__tests__/registrations.test.ts` — covers REG-01, REG-02, REG-03, REG-05, BOT-02, BOT-04
- [ ] No new conftest or shared fixtures needed — existing `makeSessionCookie` pattern in other test files serves as template

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `authMiddleware` (iron-session) — already in place |
| V3 Session Management | yes | iron-session 14-day TTL, httpOnly cookie — already in place |
| V4 Access Control | yes | `requireClubRole()` for admin actions (remove member, close event) |
| V5 Input Validation | yes | Elysia `t.Object` schema + zod for all request bodies |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Member removes another member's registration | Tampering | In DELETE handler, verify `registration.memberId === session.memberId` OR caller is admin |
| Member closes event they don't own | Elevation of Privilege | `requireClubRole(event.clubId, memberId, ["owner", "admin"])` before PATCH status |
| Duplicate registration via fast double-tap | Tampering | DB unique constraint (eventId, memberId) catches; map 23505 to 409 |
| Registering for cancelled/closed event | Tampering | Server-side status check before INSERT — never trust client-side disabled button |
| Admin removes member from wrong club's event | Tampering | Registration → Event → Club chain verified by `requireClubRole` with actual club from event |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `packages/db/src/schema/registrations.ts` — schema verified
- Direct codebase inspection: `packages/db/src/schema/events.ts` — status enum, lineMessageId verified
- Direct codebase inspection: `apps/api/src/routes/events.ts` — repost pattern, best-effort push verified
- Direct codebase inspection: `apps/api/src/lib/flex-messages.ts` — `buildEventFlexCard` signature verified
- Direct codebase inspection: `apps/api/src/__tests__/events.test.ts` — test pattern (bun:test, sealData, spyOn pushMessage) verified
- Direct codebase inspection: `apps/web/app/liff/events/create/page.tsx` — LIFF page pattern verified
- Direct codebase inspection: `apps/web/components/liff/liff-provider.tsx` — focus refresh approach (dynamic import, visibilitychange) verified
- Direct codebase inspection: `apps/api/src/middleware/auth.ts` — session shape verified
- Direct codebase inspection: `apps/api/src/lib/require-club-role.ts` — role check utility verified

### Secondary (MEDIUM confidence)
- Phase 5 CONTEXT.md (D-01 through D-17) — all user decisions

### Tertiary (LOW confidence / Assumed)
- Neon HTTP driver error shape for unique violations — A1 in assumptions log
- `visibilitychange` behavior in LINE in-app browser — A2, A3 in assumptions log

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json, no new installs needed
- Architecture patterns: HIGH — directly modeled on verified existing code (events.ts, flex-messages.ts)
- Pitfalls: HIGH for DB and LINE API patterns; MEDIUM for LIFF browser-specific behavior
- Test strategy: HIGH — bun:test pattern fully verified from existing test files

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable tech stack, no fast-moving dependencies in this phase)
