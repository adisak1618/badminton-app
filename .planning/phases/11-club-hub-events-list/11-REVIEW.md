---
phase: 11-club-hub-events-list
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - apps/api/src/routes/event-templates.ts
  - apps/api/src/routes/events.ts
  - apps/web/app/(liff)/clubs/[id]/page.tsx
  - apps/web/app/clubs/[id]/page.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files implement the Club Hub events list feature: two API route handlers (event templates and events) and two frontend pages (LIFF client component and web server component). The code is generally well-structured and follows consistent patterns. One critical security issue was found: the `PATCH /event-templates/:id` handler uses `updateData as any` to bypass TypeScript type safety when calling the ORM, which can allow arbitrary column writes. Four warnings cover logic correctness issues including a missing `registered` status filter in the maxPlayers validation loop, a division-by-zero risk in both frontends, and an unhandled error-state in the web server component. Three info items cover duplicate code, a magic number, and a minor stale UI concern.

## Critical Issues

### CR-01: Unsafe `as any` cast allows arbitrary column writes in PATCH handler

**File:** `apps/api/src/routes/event-templates.ts:174`
**Issue:** The update call passes `updateData as any` to Drizzle's `.set()`. `updateData` is typed as `Record<string, unknown>`, so Drizzle's column-safety checking is bypassed entirely. If a bug or future code path ever writes an unintended key to `updateData` (e.g., `id`, `clubId`, `createdAt`), it will be silently sent to the database without a type error.
**Fix:** Type `updateData` against the Drizzle table's inferred update type:
```typescript
import type { InferInsertModel } from "drizzle-orm";

const updateData: Partial<InferInsertModel<typeof eventTemplates>> & { updatedAt: Date } = { updatedAt: new Date() };
// now all assignments are type-checked
if (body.venueName !== undefined) updateData.venueName = body.venueName;
// ...
await db.update(eventTemplates).set(updateData).where(eq(eventTemplates.id, params.id));
```
This removes the need for `as any` entirely.

## Warnings

### WR-01: maxPlayers validation skips `registered` status events — registrations can exceed new cap

**File:** `apps/api/src/routes/event-templates.ts:136-156`
**Issue:** The validation query filters for `inArray(events.status, ["draft", "open"])`. If the project has or later introduces a `"registered"` or other "full" status between open and closed, those events' registrations are not counted. More practically, the current event schema supports `"closed"` events, and a closed event still has confirmed registrations. Reducing `maxPlayers` below the registration count on a closed event is silently allowed because closed events are excluded from the check.
**Fix:** Include all non-cancelled, non-completed statuses in the guard. At minimum, verify the complete set of valid statuses and include any that still have meaningful registrations:
```typescript
inArray(events.status, ["draft", "open", "closed"])
```

### WR-02: Division by zero when `maxPlayers === 0` in progress bar

**File:** `apps/web/app/(liff)/clubs/[id]/page.tsx:197`
**File:** `apps/web/app/clubs/[id]/page.tsx:149`
**Issue:** The inline style computes `(event.registeredCount / event.maxPlayers) * 100`. The API schema enforces `minimum: 1` for `maxPlayers`, but the frontend `EventListItem` interface types it as `number` with no minimum guard. If a corrupted or legacy record with `maxPlayers: 0` arrives, the expression produces `Infinity` or `NaN`, which renders as an invalid CSS `width` value and silently breaks the progress bar.
**Fix:** Add a safe guard in the width expression:
```tsx
style={{ width: `${event.maxPlayers > 0 ? Math.min((event.registeredCount / event.maxPlayers) * 100, 100) : 0}%` }}
```

### WR-03: Server component page throws unhandled exception on API error — no error boundary

**File:** `apps/web/app/clubs/[id]/page.tsx:61-65`
**Issue:** `ClubDetailPage` calls `apiClient.get()` for three endpoints inside `Promise.all` with no try/catch and no error boundary wrapping the page. If any of the three fetches fails (network error, 403, 404), the unhandled promise rejection crashes the entire render with a generic Next.js error page. The LIFF page handles this correctly with a try/catch in `fetchData`.
**Fix:** Either wrap with a try/catch and return a friendly error UI, or add a Next.js `error.tsx` sibling to this route segment so errors are caught gracefully:
```tsx
// Option A: add apps/web/app/clubs/[id]/error.tsx
"use client";
export default function ClubError({ reset }: { reset: () => void }) {
  return <div>โหลดข้อมูลไม่สำเร็จ <button onClick={reset}>ลองใหม่</button></div>;
}
```

### WR-04: `nextOccurrence` timezone candidate uses local `setHours` instead of Bangkok-local hours

**File:** `apps/api/src/routes/event-templates.ts:24-25`
**Issue:** `nextOccurrence` converts `new Date()` to Bangkok time with `toZonedTime`, but then calls `candidate.setHours(hours, minutes, 0, 0)` on the resulting `Date` object. `toZonedTime` returns a `Date` whose wall-clock values match Bangkok time, but calling `.setHours()` on it sets the **local system timezone** hours — not Bangkok hours. On a server running UTC (which is typical in production), this means the event time will be off by 7 hours.
**Fix:** Use `date-fns-tz`'s `set` helper or reconstruct the date in Bangkok time explicitly:
```typescript
import { set } from "date-fns";

function nextOccurrence(dayOfWeek: number, timeStr: string): Date {
  const now = toZonedTime(new Date(), BANGKOK_TZ);
  const [hours, minutes] = timeStr.split(":").map(Number);
  // set() preserves the zoned date's wall-clock context
  const candidate = set(now, { hours, minutes, seconds: 0, milliseconds: 0 });
  let daysAhead = (dayOfWeek - now.getDay() + 7) % 7;
  if (daysAhead === 0 && candidate <= now) daysAhead = 7;
  candidate.setDate(candidate.getDate() + daysAhead);
  return fromZonedTime(candidate, BANGKOK_TZ);
}
```

## Info

### IN-01: Duplicated `Club`, `EventListItem`, `EventTemplate` interfaces and `formatDate`/`THAI_DAYS` across both pages

**File:** `apps/web/app/(liff)/clubs/[id]/page.tsx:13-57`
**File:** `apps/web/app/clubs/[id]/page.tsx:8-53`
**Issue:** The three TypeScript interfaces, the `THAI_DAYS` array, and the `formatDate` function are copy-pasted verbatim between the two pages. Any future schema change must be updated in two places.
**Fix:** Extract shared types and utilities into a shared module, for example `apps/web/lib/club-types.ts` and `apps/web/lib/format.ts`, then import in both pages.

### IN-02: `registerLiffUrl` and `detailsLiffUrl` are identical — dead variable

**File:** `apps/api/src/routes/event-templates.ts:247-249`
**File:** `apps/api/src/routes/events.ts:137-138`
**Issue:** Both routes create two separate variables `registerLiffUrl` and `detailsLiffUrl` that are assigned the exact same string. One of them is a dead variable. Either they should differ (e.g., detail URL vs registration URL with a modal open), or one variable is unnecessary.
**Fix:** Determine the intended distinction between register and detail URLs and implement it, or collapse to a single `liffUrl` variable until the URLs diverge.

### IN-03: `activeTemplates` sort mutates derived array in the LIFF page but not the web page — inconsistent pattern

**File:** `apps/web/app/(liff)/clubs/[id]/page.tsx:136-138`
**File:** `apps/web/app/clubs/[id]/page.tsx:117-119`
**Issue:** The LIFF page sorts `activeTemplates` outside of JSX at the state level: `templates.filter(...).sort(...)`. The web server page sorts inside `.map()` via a chained `.sort()` within the render. These are equivalent in output but inconsistent in style. The LIFF page's approach is slightly better since it avoids sorting on every re-render, but neither is incorrect — this is purely a consistency note.
**Fix:** Align both pages to sort at derivation time (before JSX), outside the render/return.

---

_Reviewed: 2026-04-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
