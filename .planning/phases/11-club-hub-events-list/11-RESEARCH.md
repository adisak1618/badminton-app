# Phase 11: Club Hub & Events List - Research

**Researched:** 2026-04-12
**Domain:** Next.js server/client components, Elysia API, shadcn/ui, LIFF routing
**Confidence:** HIGH

## Summary

Phase 11 transforms the existing `/clubs/[id]` server component into a hub page that shows a weekly schedule section (derived from active event templates) and all upcoming events as full cards with a register button. A parallel LIFF route `/(liff)/clubs/[id]` must be created as a client component so members can browse and register inside LINE without leaving the app.

The primary API gap is a `GET /events?clubId=...&status=open` endpoint — no such list endpoint currently exists in `apps/api/src/routes/events.ts`. The template list endpoint does exist (`GET /event-templates?clubId=...`) but is currently admin-only; access control must be evaluated.

The UI contract is fully specified in `11-UI-SPEC.md`. No new shadcn components are required. All patterns (server component data fetch, proxy route, LIFF client component) are already established in the codebase.

**Primary recommendation:** Add the `GET /events?clubId=` endpoint first (Wave 1), then build the hub page (Wave 2), then the LIFF route (Wave 3).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Transform existing `/clubs/[id]` into a hub — replace current defaults/fees display with next event highlight + quick links (Events, Members, Schedule, Settings). Current club defaults move to the Settings page.
- **D-02:** Show ALL upcoming events directly on the hub page (not just next event). Hub IS the events list page.
- **D-03:** Full event cards — each event shows title, date/time, venue, player count progress bar (e.g. 5/12), shuttlecock fee, court fee, and a register button.
- **D-04:** Cards use existing shadcn Card/Badge/Button components. Mobile-first layout.
- **D-05:** Separate weekly schedule section at the TOP of the page, above upcoming events. Derived from active event templates. Shows day of week + time + venue (e.g. "จันทร์ 19:00 สนามX ลาดพร้าว").
- **D-06:** Schedule section ensures members see the recurring pattern even if cron hasn't generated events yet.
- **D-07:** Both website (`/clubs/[id]`) and LIFF (`/(liff)/clubs/[id]`) versions. Members can browse events inside LINE without leaving the app.

### Claude's Discretion
- Sorting order for upcoming events (chronological is expected)
- Empty state design when no events exist
- How register button on event cards integrates with existing LIFF registration flow
- Whether events list needs pagination or infinite scroll (likely not needed for typical club sizes)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

### Core (all pre-existing in project)
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| Next.js (App Router) | — | Server components + route groups | [VERIFIED: codebase] |
| Elysia.js | 1.4.28 | API backend with auth middleware | [VERIFIED: codebase] |
| Drizzle ORM | — | DB queries for events + templates | [VERIFIED: codebase] |
| shadcn/ui (new-york preset) | — | Card, Badge, Button, Separator | [VERIFIED: 11-UI-SPEC.md] |
| lucide-react | — | Loader2, Calendar, MapPin, Users icons | [VERIFIED: 11-UI-SPEC.md] |

### No New Installs Required
All libraries needed for this phase are already installed. [VERIFIED: codebase scan]

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/routes/events.ts          — add GET / list endpoint (Wave 1)
apps/web/app/clubs/[id]/page.tsx       — transform to hub (Wave 2)
apps/web/app/(liff)/clubs/[id]/page.tsx — new LIFF client component (Wave 3)
```

No new directories. No new packages.

### Pattern 1: Server Component Data Fetching (website hub)

The existing `/clubs/[id]/page.tsx` is an `async` server component using `apiClient.get<T>()`. This pattern must be preserved and extended to fetch both events and templates in parallel.

```typescript
// Existing pattern — apps/web/app/clubs/[id]/page.tsx
const club = await apiClient.get<Club>(`/api/clubs/${id}`);

// Extended pattern for Phase 11
const [club, events, templates] = await Promise.all([
  apiClient.get<Club>(`/api/clubs/${id}`),
  apiClient.get<Event[]>(`/api/events?clubId=${id}`),        // new endpoint
  apiClient.get<Template[]>(`/api/event-templates?clubId=${id}`),
]);
```

[VERIFIED: codebase pattern in apps/web/app/clubs/[id]/page.tsx and apps/web/lib/api.ts]

### Pattern 2: LIFF Client Component (LIFF hub)

All existing LIFF pages (`/(liff)/events/[id]/page.tsx`) are `"use client"` components that:
1. Use `useLiff()` hook for auth state
2. Fetch data via `/api/proxy/*` route (catch-all proxy at `apps/web/app/api/proxy/[...path]/route.ts`)
3. Gate rendering on `isReady && isLoggedIn`

The new `/(liff)/clubs/[id]/page.tsx` must follow the same pattern.

```typescript
// Source: apps/web/app/(liff)/events/[id]/page.tsx
"use client";
const { liff, isReady, isLoggedIn } = useLiff();
// fetch via /api/proxy/events?clubId=... and /api/proxy/event-templates?clubId=...
```

[VERIFIED: codebase]

### Pattern 3: Register Button Navigation (LIFF)

The register button on event cards (in the LIFF hub) does NOT perform registration inline. It navigates to `/(liff)/events/[id]` which contains the full registration flow. This avoids duplicating the registration logic.

Navigation in LIFF context: use `liff.openWindow()` or Next.js `<Link href="...">` — either works within the LIFF webview. `<Link>` is simpler and already used in the codebase.

[VERIFIED: CONTEXT.md integration point + apps/web/app/(liff)/events/[id]/page.tsx]

### Pattern 4: Thai Day Name Mapping

Event templates store `eventDayOfWeek` as integer (0=Sunday ... 6=Saturday). The UI needs Thai names.

```typescript
// Client-side mapping — no library needed
const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const dayName = THAI_DAYS[template.eventDayOfWeek];
```

[VERIFIED: schema apps/packages/db/src/schema/event-templates.ts + CONTEXT.md specifics]

### Pattern 5: Progress Bar (custom div, no library)

The UI spec calls for a custom progress bar (8px height, pill shape). No shadcn Progress component is listed in the inventory. Implement with plain `div` elements.

```tsx
<div className="h-2 w-full rounded-full bg-muted">
  <div
    className="h-2 rounded-full bg-primary"
    style={{ width: `${Math.min((registered / maxPlayers) * 100, 100)}%` }}
  />
</div>
```

[VERIFIED: 11-UI-SPEC.md progress bar spec]

### Anti-Patterns to Avoid

- **Do not add a GET /events endpoint that skips auth** — the existing POST and PATCH endpoints all use `authMiddleware`. The new GET must also require auth.
- **Do not show the schedule section when no active templates exist** — per D-06 and UI-SPEC: "Section hidden entirely — do not show empty schedule card."
- **Do not reuse the settings/defaults display** — D-01 explicitly moves club defaults to the Settings page. The hub replaces that section entirely.
- **Do not share state between website and LIFF pages** — they are independent routes with different data-fetching patterns.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session in LIFF | Custom token handling | `useLiff()` + `/api/proxy/*` catch-all | Already handles cookie forwarding |
| Thai locale formatting | Custom formatter | `Intl.DateTimeFormat("th-TH", {...})` | Already used in `/(liff)/events/[id]/page.tsx` |
| Progress bar | Third-party library | Plain div + Tailwind | Simple enough; no dep needed |

---

## API Gap: New Endpoint Required

**Missing:** `GET /events?clubId=:id` — list upcoming events for a club.

### Endpoint Design

```typescript
// apps/api/src/routes/events.ts — new GET / handler
.get(
  "/",
  async ({ query, session }) => {
    // auth required — same pattern as other endpoints
    // filter: clubId, status IN ('open'), eventDate >= now()
    // include registeredCount per event (JOIN or subquery)
    // order by eventDate ASC
    return events with registeredCount;
  },
  { query: t.Object({ clubId: t.String({ format: "uuid" }) }) }
)
```

**Key design decisions for planner:**
- Filter to `status = 'open'` only (not cancelled/closed) for the "upcoming events" view
- Filter to `eventDate >= NOW()` to exclude past events
- Include `registeredCount` in response so UI can render the progress bar without a second request
- Auth required — members must be logged in to see events (consistent with all existing endpoints)

### Template Endpoint Access Control Issue

The existing `GET /event-templates?clubId=` requires `["owner", "admin"]` role via `requireClubRole`. But D-06 says members (not just admins) must see the weekly schedule.

**Resolution required:** Either:
1. Relax the template endpoint to allow all club members (including role "member"), or
2. Add a new public-to-members endpoint

Option 1 is simpler — change `requireClubRole(query.clubId, member.id, ["owner", "admin"])` to `requireClubRole(query.clubId, member.id, ["owner", "admin", "member"])`.

[VERIFIED: apps/api/src/routes/event-templates.ts line 50]

---

## Common Pitfalls

### Pitfall 1: Template endpoint blocks member access
**What goes wrong:** `GET /event-templates?clubId=` throws 403 for regular members because `requireClubRole` only allows owner/admin.
**Why it happens:** Template management was admin-only in Phase 6.
**How to avoid:** Update `requireClubRole` call to include `"member"` role before the planner assumes this endpoint is ready.
**Warning signs:** 403 errors when LIFF hub loads for regular members.

### Pitfall 2: `apiClient` vs `/api/proxy` confusion
**What goes wrong:** Using `apiClient` (server-side) in a LIFF client component, or using `fetch /api/proxy/` in a server component.
**Why it happens:** Two separate data-fetching patterns exist side by side.
**How to avoid:** Website hub (`/clubs/[id]`) uses `apiClient`. LIFF hub (`/(liff)/clubs/[id]`) uses `fetch('/api/proxy/...')`. Never mix.
**Warning signs:** "cookies() called in client context" error, or missing auth headers.

### Pitfall 3: registeredCount missing from event list response
**What goes wrong:** Events endpoint returns events without registeredCount, so UI cannot render progress bar.
**Why it happens:** The existing `registrations` table is separate; a JOIN or subquery is needed.
**How to avoid:** The new `GET /events` endpoint must include `registeredCount` per event via `count(registrations.id)` subquery.
**Warning signs:** Progress bar always shows 0/N.

### Pitfall 4: Past events appearing in list
**What goes wrong:** Events with `eventDate` in the past appear in "upcoming events."
**Why it happens:** Filtering only on `status = 'open'` doesn't exclude past open events.
**How to avoid:** Add `gte(events.eventDate, new Date())` to the Drizzle where clause.

### Pitfall 5: LIFF route missing LiffProvider
**What goes wrong:** `useLiff()` throws because LiffProvider is not in the layout chain.
**Why it happens:** The `(liff)` layout (`apps/web/app/(liff)/layout.tsx`) does NOT include LiffProvider — individual LIFF pages must wrap themselves or rely on a page-level component pattern.
**How to avoid:** Check how `/(liff)/events/[id]/page.tsx` handles LiffProvider — replicate exactly.

[VERIFIED: apps/web/app/(liff)/layout.tsx — layout has no LiffProvider]

---

## Code Examples

### Event Card (verified component pattern)
```tsx
// Source: 11-UI-SPEC.md + apps/web/app/clubs/[id]/page.tsx patterns
<Card>
  <CardContent className="pt-6 space-y-3">
    <p className="text-xl font-semibold">{event.title}</p>
    <p className="text-sm">{event.venueName}</p>
    {/* Progress bar */}
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${Math.min((event.registeredCount / event.maxPlayers) * 100, 100)}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground">
        {event.registeredCount}/{event.maxPlayers} คน
      </span>
    </div>
    <p className="text-sm text-muted-foreground">
      ลูก {event.shuttlecockFee}฿ · สนาม {event.courtFee}฿
    </p>
    <Button className="w-full min-h-[44px]" asChild>
      <Link href={`/events/${event.id}`}>ลงทะเบียน</Link>
    </Button>
  </CardContent>
</Card>
```

### Schedule Row
```tsx
// Source: 11-UI-SPEC.md schedule row spec
const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
<div className="flex items-center gap-2">
  <span className="text-sm font-semibold w-16">{THAI_DAYS[template.eventDayOfWeek]}</span>
  <span className="text-sm">{template.eventTime}</span>
  <span className="text-sm text-muted-foreground truncate">{template.venueName}</span>
</div>
```

### Drizzle query for events with registeredCount
```typescript
// Source: ASSUMED — pattern consistent with existing count() usage in events.ts
import { db, events, registrations } from "@repo/db";
import { eq, gte, inArray, count } from "drizzle-orm";

const rows = await db
  .select({
    id: events.id,
    title: events.title,
    eventDate: events.eventDate,
    venueName: events.venueName,
    shuttlecockFee: events.shuttlecockFee,
    courtFee: events.courtFee,
    maxPlayers: events.maxPlayers,
    status: events.status,
    registeredCount: count(registrations.id),
  })
  .from(events)
  .leftJoin(registrations, eq(registrations.eventId, events.id))
  .where(
    and(
      eq(events.clubId, query.clubId),
      eq(events.status, "open"),
      gte(events.eventDate, new Date())
    )
  )
  .groupBy(events.id)
  .orderBy(asc(events.eventDate));
```

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code changes, no new external dependencies.

---

## Validation Architecture

> `workflow.nyquist_validation` absent from config — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected (no test files found for web/api routes) |
| Config file | None found |
| Quick run command | `bun run typecheck` (type safety gate) |
| Full suite command | Manual smoke test in browser |

### Phase Requirements → Test Map
| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `GET /events?clubId=` returns events with registeredCount | manual smoke | curl against local API |
| Club hub renders schedule section | manual smoke | browser |
| Club hub renders event cards | manual smoke | browser |
| LIFF hub loads in LINE webview | manual smoke | LIFF URL |
| Empty state when no events | manual smoke | browser with empty club |

### Wave 0 Gaps
- No automated test infrastructure exists for this phase. All validation is manual smoke testing.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `count(registrations.id)` via leftJoin + groupBy works correctly in Drizzle for this schema | Code Examples | Query returns wrong counts; need to verify against existing patterns in codebase |
| A2 | Register button in LIFF hub uses `<Link href="/(liff)/events/[id]">` for navigation | Architecture Patterns | If liff.openWindow is required, button behavior changes |

---

## Open Questions (RESOLVED)

1. **Registration flow from website hub (non-LIFF)** (RESOLVED)
   - What we know: The website `/clubs/[id]` is server-rendered; the register button on event cards needs to go somewhere.
   - What's unclear: Should the register button on the website version link to the LIFF URL (`liff.line.me/...`) or to a web-only registration page?
   - Recommendation: CONTEXT.md says "Register button → links to existing `/(liff)/events/[id]` or inline registration." Since no web registration page exists, link to the LIFF URL for now. Claude's discretion applies.

2. **Auth requirement for club hub** (RESOLVED)
   - What we know: The current `/clubs/[id]` throws if the user is not logged in (apiClient requires session cookie).
   - What's unclear: Should the hub be publicly viewable or member-only?
   - Recommendation: Keep member-only (consistent with current behavior). No change needed.

---

## Sources

### Primary (HIGH confidence)
- `apps/web/app/clubs/[id]/page.tsx` — existing hub structure verified
- `apps/api/src/routes/events.ts` — confirmed no GET list endpoint exists
- `apps/api/src/routes/event-templates.ts` — confirmed admin-only access control gap
- `packages/db/src/schema/events.ts` — events schema fields verified
- `packages/db/src/schema/event-templates.ts` — template schema fields (eventDayOfWeek, eventTime, venueName) verified
- `apps/web/app/(liff)/events/[id]/page.tsx` — LIFF client component pattern verified
- `apps/web/app/(liff)/layout.tsx` — confirmed LiffProvider NOT in layout
- `apps/web/app/api/proxy/[...path]/route.ts` — catch-all proxy pattern verified
- `.planning/phases/11-club-hub-events-list/11-UI-SPEC.md` — full UI contract verified

### Secondary (MEDIUM confidence)
- `11-CONTEXT.md` decisions D-01 through D-07 — locked decisions from user discussion

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase
- Architecture: HIGH — all patterns verified in existing files
- API gap: HIGH — verified by reading events.ts directly
- Access control gap: HIGH — verified by reading event-templates.ts directly
- Drizzle query pattern: MEDIUM — count+leftJoin pattern is consistent with existing code but not directly copied

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack)
