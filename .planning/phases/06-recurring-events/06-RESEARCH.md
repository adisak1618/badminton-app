# Phase 6: Recurring Events - Research

**Researched:** 2026-04-11
**Domain:** Recurring event scheduling, cron job orchestration, Drizzle schema extension, LIFF form extension
**Confidence:** HIGH

## Summary

Phase 6 adds recurring event templates to the existing event system. An admin defines a weekly schedule (day + time, registration open window). A Railway Cron Job service calls `POST /api/cron/generate-occurrences` hourly; the handler checks all active templates and generates the next occurrence when its registration window has arrived. Generated occurrences are independent event records — identical to Phase 4 events — with an added nullable `templateId` FK.

The codebase already has all needed building blocks: `buildEventFlexCard`, `pushMessage`, `repostFlexCard`, `lineClient`, `eventStatusEnum` (with `cancelled`), and the event creation LIFF form. Phase 6 extends these rather than replacing them.

The critical timezone concern (Asia/Bangkok, UTC+7) must be handled in the cron handler — Railway cron runs in UTC; all comparisons must convert stored `dayOfWeek` + `openTime` fields through the Bangkok offset before deciding whether to generate an occurrence.

**Primary recommendation:** Use Drizzle `pgTable` for `event_templates`, standard `timestamp with timezone` for all time fields, Railway Cron hitting a bearer-token-protected endpoint, and `date-fns-tz` for timezone-aware date arithmetic.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Railway Cron Job service triggers an API endpoint hourly.
- **D-02:** Cron generates only the NEXT upcoming occurrence per template (no look-ahead).
- **D-03:** Catch-up behavior — if cron missed a window (downtime), creates the occurrence on the next run; never silently skips a week.
- **D-04:** Two trigger modes: **auto** (cron, when registration window opens) and **create now** (admin manual immediate).
- **D-05:** Extend existing LIFF event creation form with a "Recurring" toggle. No separate template page.
- **D-06:** Single day of week per template.
- **D-07:** No separate bot command for recurring — admin uses same `/create` flow.
- **D-08:** Templates are editable after creation; changes apply only to future generated occurrences.
- **D-09:** Template maxPlayers edit validation: reject if any active occurrence has more registrations than the new max.
- **D-10:** Generated event is detached from template after creation; admin edits the event record directly.
- **D-11:** Generated events have a `templateId` FK (for reference), but event data is copied at generation time and independent thereafter.
- **D-12:** Cancelling an occurrence sets event status to `cancelled` (not delete); bot posts a cancellation Flex Message notice; existing registrations preserved.
- **D-13:** Registration opens at specific day + time (e.g., "Monday 09:00" for Thursday event); cron generates occurrence and posts Flex Message at that exact day+time.
- **D-14:** Just the Flex Message card in the group — no separate push notification when registration opens.
- **D-15:** Registration auto-closes when the event date/time arrives; admin can still manually close early via existing mechanism.

### Claude's Discretion

- Database schema design for the `event_templates` table (columns, types, indexes)
- Cron endpoint security (auth token or secret to prevent unauthorized triggers)
- Flex Message design for cancellation notice
- Thai day-of-week display format in template UI
- How "Create now" button appears in the template management UI

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVNT-03 | Admin creates a recurring event with day of week + time schedule | Template schema + LIFF form extension with recurring toggle |
| EVNT-04 | Recurring events auto-generate the next occurrence on schedule | Railway Cron → `POST /api/cron/generate-occurrences` handler with timezone-aware window check |
| EVNT-05 | Configurable registration open window (e.g. opens 1 day before) | Stored as `openDayOfWeek` + `openTime` on template; cron compares current Bangkok time |
| EVNT-06 | Admin can override individual occurrences (change venue, cancel, adjust fees) | Generated events are independent records; cancel sets `status='cancelled'` + cancellation Flex Message |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | already in project | New `event_templates` table schema + migration | Project ORM; `[VERIFIED: codebase]` |
| date-fns-tz | ^3.x | Timezone-aware date arithmetic for Bangkok (UTC+7) window checks | Lightweight, tree-shakeable, integrates with date-fns; `[ASSUMED]` |
| elysia | already in project | New cron endpoint plugin | Project framework |
| @line/bot-sdk | already in project | `pushMessage` for cancellation notice Flex Card | Project LINE SDK |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (Node built-in) | built-in | `timingSafeEqual` for bearer token comparison in cron endpoint | Prevent timing attacks on secret comparison |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns-tz | Temporal API (tc39) | Temporal not yet stable in Bun runtime as of 2026; `[ASSUMED]` |
| date-fns-tz | Luxon | Heavier, but equally valid; date-fns-tz preferred because project may already use date-fns |

**Installation (if date-fns-tz not already present):**
```bash
cd apps/api && bun add date-fns-tz
```

**Version verification:** `[ASSUMED]` — run `npm view date-fns-tz version` before pinning.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/db/src/schema/
├── events.ts            # ADD: templateId nullable FK, add to existing table
└── event-templates.ts   # NEW: event_templates table

apps/api/src/routes/
├── events.ts            # EXTEND: add PATCH /:id/cancel route
├── event-templates.ts   # NEW: CRUD for templates + "create now" action
└── cron.ts              # NEW: POST /cron/generate-occurrences (no authMiddleware — bearer token instead)

apps/web/app/liff/events/
├── create/page.tsx      # EXTEND: recurring toggle + extra fields
└── templates/           # NEW: template list + edit LIFF page (admin view)
    └── page.tsx
```

### Pattern 1: Template Schema

```typescript
// packages/db/src/schema/event-templates.ts
import { pgTable, uuid, varchar, timestamp, integer, boolean, pgEnum, smallint } from "drizzle-orm/pg-core";
import { clubs } from "./clubs";

// 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches JS Date.getDay())
export const templateStatusEnum = pgEnum("template_status", ["active", "paused", "archived"]);

export const eventTemplates = pgTable("event_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").references(() => clubs.id).notNull(),
  // Event data copied to each occurrence at generation time
  title: varchar("title", { length: 255 }),           // null = auto-generate
  venueName: varchar("venue_name", { length: 255 }).notNull(),
  venueMapsUrl: varchar("venue_maps_url", { length: 500 }),
  shuttlecockFee: integer("shuttlecock_fee").notNull().default(0),
  courtFee: integer("court_fee").notNull().default(0),
  maxPlayers: integer("max_players").notNull().default(20),
  // Schedule fields — all times stored in Asia/Bangkok semantics
  eventDayOfWeek: smallint("event_day_of_week").notNull(), // 0-6
  eventTime: varchar("event_time", { length: 5 }).notNull(), // "HH:MM" (24h, Bangkok)
  openDayOfWeek: smallint("open_day_of_week").notNull(),   // 0-6
  openTime: varchar("open_time", { length: 5 }).notNull(), // "HH:MM" (24h, Bangkok)
  status: templateStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Migration:** Also add `templateId` nullable FK to existing `events` table:
```typescript
// In events.ts — add to existing pgTable definition:
templateId: uuid("template_id").references(() => eventTemplates.id),
```

### Pattern 2: Cron Occurrence Generation Logic

The core algorithm in `POST /api/cron/generate-occurrences`:

```typescript
// Source: [ASSUMED — standard pattern for weekly recurrence]
import { toZonedTime, fromZonedTime, format } from "date-fns-tz";

const BANGKOK_TZ = "Asia/Bangkok";

function getNextEventDate(template: EventTemplate, nowBangkok: Date): Date {
  // Find the next occurrence of template.eventDayOfWeek after the open window
  // Starting from the current Bangkok week
  const currentDow = nowBangkok.getDay(); // 0-6
  let daysUntilEvent = (template.eventDayOfWeek - currentDow + 7) % 7;
  if (daysUntilEvent === 0) daysUntilEvent = 7; // next week if same day
  
  const [eventHour, eventMin] = template.eventTime.split(":").map(Number);
  const eventDateBangkok = new Date(nowBangkok);
  eventDateBangkok.setDate(nowBangkok.getDate() + daysUntilEvent);
  eventDateBangkok.setHours(eventHour, eventMin, 0, 0);
  
  return fromZonedTime(eventDateBangkok, BANGKOK_TZ); // returns UTC Date
}

function isWindowOpen(template: EventTemplate, nowBangkok: Date): boolean {
  // True if current Bangkok day+time matches the open window day+time (within the hour)
  const currentDow = nowBangkok.getDay();
  const currentHour = nowBangkok.getHours();
  const currentMin = nowBangkok.getMinutes();
  
  const [openHour, openMin] = template.openTime.split(":").map(Number);
  
  return (
    currentDow === template.openDayOfWeek &&
    currentHour === openHour &&
    currentMin < 60 // within the same hour window
  );
}
```

**Idempotency guard:** Before inserting, check that no event with `templateId = template.id` exists for the target event week. Use a unique constraint or a `SELECT` guard to prevent duplicate occurrences on cron retry.

### Pattern 3: Cron Endpoint Security

```typescript
// apps/api/src/routes/cron.ts — bearer token auth, no session cookie
import { Elysia } from "elysia";
import { timingSafeEqual } from "crypto";

export const cronRoutes = new Elysia({ prefix: "/cron" })
  .post("/generate-occurrences", async ({ headers, set }) => {
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    const actual = headers["authorization"] ?? "";
    // Constant-time comparison
    const enc = new TextEncoder();
    if (!timingSafeEqual(enc.encode(expected.padEnd(64)), enc.encode(actual.padEnd(64)))) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    // ... generation logic
  });
```

Add `CRON_SECRET` to env schema (z.string().min(32)).

### Pattern 4: Cancellation Flex Message

Build a new `buildCancellationFlexCard` function modeled on existing `buildEventFlexCard`:

```typescript
// Source: [ASSUMED — pattern from existing flex-messages.ts]
export function buildCancellationFlexCard(data: {
  title: string;
  eventDate: Date;
  venueName: string;
}): messagingApi.FlexMessage {
  return {
    type: "flex",
    altText: `ยกเลิกอีเวนท์: ${data.title}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "ยกเลิกอีเวนท์", weight: "bold", color: "#ef4444", size: "lg" },
          { type: "text", text: data.title, weight: "bold", size: "md" },
          { type: "text", text: formatThaiDate(data.eventDate), size: "sm", color: "#666666" },
          { type: "text", text: data.venueName, size: "sm", color: "#666666" },
          { type: "text", text: "อีเวนท์นี้ถูกยกเลิกแล้ว", size: "sm", color: "#ef4444" },
        ],
      },
    },
  };
}
```

### Pattern 5: LIFF Form Recurring Toggle

Extend `EventCreateFormData` zod schema with a discriminated union:

```typescript
// Source: [ASSUMED — standard react-hook-form conditional fields pattern]
const recurringCreateSchema = z.object({
  isRecurring: z.literal(true),
  eventDayOfWeek: z.number().int().min(0).max(6),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/),
  openDayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
}).merge(baseEventSchema);

// Use watch("isRecurring") to conditionally render extra fields
const isRecurring = form.watch("isRecurring");
```

### Pattern 6: Catch-Up Logic (D-03)

When the cron runs and a template's window should have opened in the past (downtime):

```typescript
// Check: is current Bangkok time PAST the open window for this week?
// If yes AND no occurrence exists for this week → generate now (late catch-up)
function isWindowOpenOrMissed(template: EventTemplate, nowBangkok: Date): boolean {
  // Calculate expected open timestamp for current week in Bangkok time
  // If nowBangkok is past that timestamp and before the eventDate → missed window
  // [ASSUMED — implement with date arithmetic against current week's open day+time]
}
```

### Anti-Patterns to Avoid

- **Storing times as UTC offset integers:** Store `openTime`/`eventTime` as `"HH:MM"` strings in Bangkok local time. Never store as UTC timestamps — the weekly pattern shifts with DST (Thailand doesn't observe DST, but the storage model is clearer).
- **Using server `new Date()` without timezone conversion:** Railway runs in UTC. Always convert to Bangkok before comparing `dayOfWeek`.
- **Generating occurrences on every cron run without idempotency guard:** Without a uniqueness check, a slow cron that overlaps will create duplicate occurrences.
- **Deleting cancelled events:** D-12 mandates status=`cancelled`, not DELETE. Registration records must be preserved.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bangkok timezone arithmetic | Custom UTC offset math | `date-fns-tz` `toZonedTime`/`fromZonedTime` | DST edge cases, leap seconds handled |
| Cron expression scheduling | Custom timer in process | Railway Cron service | Survives deployments, no idle cost |
| Bearer token comparison | `===` string compare | `crypto.timingSafeEqual` | Timing attack prevention |
| Weekly occurrence deduplication | Ad-hoc check | Unique index on `(templateId, event_date week)` or select guard | Prevents duplicates on retry |

---

## Common Pitfalls

### Pitfall 1: Railway Cron Executes in UTC
**What goes wrong:** Template `openDayOfWeek=1` (Monday) `openTime="09:00"` — if the cron handler compares against `new Date()` without timezone conversion, it checks UTC Monday 09:00 instead of Bangkok Monday 09:00 (UTC Monday 02:00). The window is missed by 7 hours.
**Why it happens:** `new Date()` returns UTC on Railway servers.
**How to avoid:** Always convert `nowUtc` to Bangkok via `toZonedTime(nowUtc, "Asia/Bangkok")` before comparing dayOfWeek and hour.
**Warning signs:** Occurrences generate at wrong time of day, or not at all.

### Pitfall 2: Duplicate Occurrence on Cron Retry
**What goes wrong:** Cron runs, starts generating occurrence, crashes halfway. Next hourly run re-enters the same window and generates a second occurrence for the same week.
**Why it happens:** No idempotency guard on the generation.
**How to avoid:** Before inserting, check `SELECT 1 FROM events WHERE template_id=$1 AND event_date >= $weekStart AND event_date < $weekEnd`. If exists, skip.
**Warning signs:** Two Flex Message cards posted for the same session.

### Pitfall 3: Template Edit Affecting Already-Generated Events
**What goes wrong:** Admin edits template maxPlayers. Code updates all events linked by `templateId`. Existing registrations now exceed the limit.
**Why it happens:** Misunderstanding of D-10 — generated events are independent.
**How to avoid:** Template PATCH route ONLY updates the `event_templates` row. Never cascade-update events. Validate per D-09 (check active occurrences have fewer registrations than new max) then reject or allow on template only.
**Warning signs:** Existing occurrence registrationCount > maxPlayers.

### Pitfall 4: LIFF Form Event Date Timezone (Pre-existing, extend carefully)
**What goes wrong:** Recurring toggle added but the one-time event date field's timezone handling (`":00+07:00"` append) is broken by form schema refactoring.
**Why it happens:** Changing the zod schema for the recurring extension accidentally alters validation for the non-recurring path.
**How to avoid:** Keep existing `eventDate` validation path intact; only add new fields under an `isRecurring` conditional branch. Test both paths.

### Pitfall 5: Railway Cron Minimum 5-Minute Interval
**What goes wrong:** Attempting to set cron to `* * * * *` (every minute) for precision — Railway rejects schedules shorter than 5 minutes.
**Why it happens:** Railway platform limitation. `[VERIFIED: docs.railway.com/reference/cron-jobs]`
**How to avoid:** Use `0 * * * *` (hourly) as decided in D-01. Hourly granularity is sufficient since registration windows are defined in hours, not minutes.

### Pitfall 6: Cron Endpoint Exposed Without Auth
**What goes wrong:** `POST /api/cron/generate-occurrences` is reachable by anyone, allowing unauthorized occurrence generation and Flex Message spam.
**How to avoid:** Require `Authorization: Bearer $CRON_SECRET` header. Use `timingSafeEqual`. Railway's cron-webhook-trigger template sends a configured secret automatically.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Cron (daily granularity on Hobby) | Railway Cron (sub-daily, configurable) | Project already on Railway per STATE.md | Railway is the correct platform; no Vercel cron concern |
| In-process `setInterval` schedulers | External cron service → HTTP endpoint | Industry standard | No idle cost, survives restarts |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Railway Cron service | EVNT-04 auto-generation | ✓ (deployment platform) | — | — |
| date-fns-tz | Timezone arithmetic | Unknown — not yet in codebase | — | Luxon |
| Bun runtime | API endpoint + cron service | ✓ | project uses Bun | — |
| PostgreSQL (Neon) | event_templates schema migration | ✓ | existing | — |

**Missing dependencies with no fallback:** None — all are available or installable.

**Missing dependencies with fallback:** `date-fns-tz` (not verified in codebase) — fallback is Luxon. Check `bun pm ls` before planning install task.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none — bun detects test files automatically |
| Quick run command | `cd apps/api && bun test --testPathPattern=event-templates` |
| Full suite command | `cd apps/api && bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVNT-03 | Template CRUD: create, read, update returns correct fields | integration | `bun test --testPathPattern=event-templates` | ❌ Wave 0 |
| EVNT-04 | Cron handler generates occurrence for template whose window is open | integration | `bun test --testPathPattern=cron` | ❌ Wave 0 |
| EVNT-04 | Cron handler skips templates whose window is not yet open | integration | `bun test --testPathPattern=cron` | ❌ Wave 0 |
| EVNT-04 | Cron handler catch-up: generates occurrence if window was missed | integration | `bun test --testPathPattern=cron` | ❌ Wave 0 |
| EVNT-04 | Idempotency: second cron run for same week does not generate duplicate | integration | `bun test --testPathPattern=cron` | ❌ Wave 0 |
| EVNT-05 | Registration window stored correctly; occurrence event date matches template schedule | integration | `bun test --testPathPattern=event-templates` | ❌ Wave 0 |
| EVNT-06 | Cancel occurrence: status=cancelled, cancellation Flex Message posted | integration | `bun test --testPathPattern=event-templates` | ❌ Wave 0 |
| EVNT-06 | Template maxPlayers edit rejected if active occurrence has more registrations | integration | `bun test --testPathPattern=event-templates` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd apps/api && bun test --testPathPattern=event-templates`
- **Per wave merge:** `cd apps/api && bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/__tests__/event-templates.test.ts` — covers EVNT-03, EVNT-05, EVNT-06
- [ ] `apps/api/src/__tests__/cron.test.ts` — covers EVNT-04 (mock clock for timezone tests)

*(Existing test infrastructure: bun:test already configured, LINE SDK mock pattern already established in events.test.ts)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | yes (template CRUD uses existing session) | iron-session cookie, existing authMiddleware |
| V4 Access Control | yes | requireClubRole(["owner","admin"]) on all template routes |
| V5 Input Validation | yes | Elysia `t.Object` schema on all endpoints; zod in LIFF form |
| V6 Cryptography | yes (cron secret) | `crypto.timingSafeEqual` for bearer token; never hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized cron trigger | Spoofing | Bearer token with `timingSafeEqual`, min 32-char secret |
| Admin of club A cancelling club B occurrence | Elevation of Privilege | `requireClubRole` checks memberId against event's clubId |
| Template maxPlayers set to 0 to invalidate existing registrations | Tampering | D-09 validation: reject if active occurrences would exceed new max |
| Duplicate occurrence spam via "Create now" button | Denial of Service | Rate-limit or idempotency guard on "create now" action |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `date-fns-tz` v3.x is the correct library for Bangkok timezone arithmetic in Bun | Standard Stack | May need different library; verify with `bun pm ls` and npm registry |
| A2 | `eventTime`/`openTime` stored as `"HH:MM"` varchar is cleaner than storing UTC timestamps for weekly recurrence | Architecture Patterns | Schema would need redesign if UTC timestamps were preferred |
| A3 | Catch-up logic: compare current Bangkok time to template open window within the current week | Architecture Patterns | Edge case: template created mid-week; first occurrence week may need special handling |
| A4 | Railway cron minimum interval is 5 minutes (not 1 minute) | Common Pitfalls | If wrong, hourly is still valid; only matters if finer granularity needed |
| A5 | Temporal API not yet stable in Bun runtime 2026 | Standard Stack | If stable, could replace date-fns-tz; low risk since date-fns-tz is well-established |

---

## Open Questions

1. **Is `date-fns-tz` already in the monorepo?**
   - What we know: Not seen in scanned files.
   - What's unclear: May be in another package's dependencies.
   - Recommendation: Run `bun pm ls | grep date-fns` in project root as Wave 0 step; install if missing.

2. **How does "Create now" surface in the template management UI?**
   - What we know: Claude's Discretion per CONTEXT.md.
   - Recommendation: A button on the template detail/list page that calls `POST /api/event-templates/:id/create-now` — which runs the same generation logic as the cron but immediately, regardless of window timing.

3. **Weekly occurrence uniqueness constraint — DB-level or application-level?**
   - What we know: Both are viable; DB constraint is safer.
   - Recommendation: Application-level `SELECT` guard (same as existing idempotency pattern in the codebase) is sufficient and consistent with project patterns. Avoid DB partial index complexity unless duplicates become a real problem.

---

## Sources

### Primary (HIGH confidence)
- `[VERIFIED: codebase]` — `packages/db/src/schema/events.ts` — existing events table structure
- `[VERIFIED: codebase]` — `apps/api/src/lib/flex-messages.ts` — buildEventFlexCard, buildRepostFlexCard patterns
- `[VERIFIED: codebase]` — `apps/api/src/routes/events.ts` — existing event routes, auth patterns
- `[VERIFIED: codebase]` — `apps/api/src/__tests__/events.test.ts` — test patterns (bun:test, LINE mock)
- `[CITED: docs.railway.com/reference/cron-jobs]` — Railway cron limitations (min 5 min, UTC, skip if previous still active)

### Secondary (MEDIUM confidence)
- `[CITED: docs.railway.com/reference/cron-jobs]` — Railway cron webhook trigger pattern with Bearer token

### Tertiary (LOW confidence)
- `[ASSUMED]` — `date-fns-tz` as the timezone library choice
- `[ASSUMED]` — `"HH:MM"` varchar storage for time fields

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — core Drizzle/Elysia HIGH; date-fns-tz choice ASSUMED
- Architecture: HIGH — patterns derived directly from existing codebase
- Pitfalls: HIGH — derived from code + verified Railway docs
- Security: HIGH — follows existing requireClubRole pattern

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (Railway docs are stable; date-fns-tz API is stable)
