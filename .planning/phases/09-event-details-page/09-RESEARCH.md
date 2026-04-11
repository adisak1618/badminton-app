# Phase 9: Event Details Page - Research

**Researched:** 2026-04-12
**Domain:** Next.js LIFF page consolidation + Flex Message card refactor
**Confidence:** HIGH

## Summary

Phase 9 is a consolidation phase, not a greenfield build. The register page at `/liff/events/[id]/register/page.tsx` is fully implemented and already contains every feature required by the combined details+register page. The work is: (1) move that file to `/liff/events/[id]/page.tsx`, (2) add a redirect from the old `/register` path, (3) add a `cancelled` state badge and its disabled-button variant, (4) modify `buildEventFlexCard` and `buildRepostFlexCard` in `flex-messages.ts` to use a single context-aware CTA button, and (5) add a notification line to `buildRepostFlexCard` showing who acted and seats remaining.

All four Flex-card-building call sites have been verified: `events.ts`, `cron.ts`, `event-templates.ts`, and `repost-card.ts`. The `registerLiffUrl` in `events.ts`, `cron.ts`, and `event-templates.ts` currently points to `/events/{id}/register`; these must be updated to `/events/{id}`. The `repost-card.ts` already generates `detailsLiffUrl` pointing to `/events/{id}` (correct) and `registerLiffUrl` pointing to `/events/{id}/register` (needs update).

**Primary recommendation:** Treat this as a file-move + targeted edits phase. No new libraries, no schema changes, no new API routes needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Merge details and register into one page at `/liff/events/[id]` — same layout as the existing register page (event info + registration list + register/cancel button)
- **D-02:** Move existing `/liff/events/[id]/register/page.tsx` to `/liff/events/[id]/page.tsx`. Old `/register` path gets a 301 redirect so existing Flex cards with `registerLiffUrl` still work.
- **D-03:** Both `registerLiffUrl` and `detailsLiffUrl` now point to the same URL: `/liff/events/[id]`
- **D-04:** Single button on Flex cards instead of two. Open events with available slots show "ลงทะเบียน" (Register). Full/closed/cancelled events show "รายละเอียด" (Details). Both point to `/liff/events/[id]`.
- **D-05:** Remove the separate "รายละเอียด" secondary button from both `buildEventFlexCard` and `buildRepostFlexCard`.
- **D-06:** Add a visible notification text line in the repost Flex card body showing who acted and seats remaining. Format: "สมชาย ลงทะเบียนแล้ว (เหลือ 10 ที่)" for register, "สมชาย ยกเลิกแล้ว (เหลือ 11 ที่)" for cancel. Admin remove shows count update without naming the removed member.
- **D-07:** Seats remaining = `maxPlayers - registeredCount`. When full: "เต็มแล้ว" instead of "เหลือ 0 ที่".
- **D-08:** Reuse the same badge + disabled button patterns from Phase 5 (D-14 to D-17) for full/closed/cancelled states on the combined page.

### Claude's Discretion

- Exact positioning of the notification line within the Flex card body
- Redirect implementation (Next.js middleware vs redirect config vs route handler)
- Whether to refactor `registerLiffUrl` / `detailsLiffUrl` into a single `eventLiffUrl` in the card data interfaces, or keep both pointing to the same value

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOT-01 | Bot posts a Flex Message card with event info, current/max count, "Register" CTA, "Details" CTA | D-04/D-05 reduce two CTAs to one context-aware button; existing `buildEventFlexCard` and `buildRepostFlexCard` in `flex-messages.ts` are the edit targets |
</phase_requirements>

---

## Standard Stack

No new libraries introduced in this phase. All required libraries are already installed.

### Core (already installed)
| Library | Purpose | File |
|---------|---------|------|
| Next.js (app router) | File-based routing, redirect config | `apps/web/next.config.js` |
| React | Page component | `apps/web/app/liff/events/[id]/register/page.tsx` |
| `@line/bot-sdk` `messagingApi` | Flex Message types | `apps/api/src/lib/flex-messages.ts` |
| `@repo/ui/components/button` | CTA button | already used in register page |
| `@repo/ui/components/card` | Event info + list cards | already used in register page |
| `lucide-react` `Loader2`, `X` | Spinner, remove icon | already used in register page |
| `sonner` | Toast notifications | already used in register page |

**No `npm install` step needed for this phase.**

---

## Architecture Patterns

### File Move Pattern
The page component moves from:
```
apps/web/app/liff/events/[id]/register/page.tsx
```
to:
```
apps/web/app/liff/events/[id]/page.tsx
```
The `register/` directory can be deleted after the redirect is in place.

### 301 Redirect — Next.js `next.config.js` redirects array (Claude's Discretion)

The simplest approach given the existing bare `next.config.js`. Add a `redirects()` async function:

```javascript
// Source: Next.js official docs — next.config.js redirects
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/liff/events/:id/register',
        destination: '/liff/events/:id',
        permanent: true,
      },
    ];
  },
};
```

This is preferred over middleware (which already handles session-protected paths only) and over a route handler (adds a file for something config handles cleanly). [ASSUMED] — Next.js `redirects()` in config supports dynamic `:id` segments.

**Why not middleware:** `apps/web/middleware.ts` already exists and handles session protection for `/clubs`. Adding a redirect there would mix concerns. The `next.config.js` redirects array is the standard Next.js mechanism for permanent redirects on known path patterns.

### Cancelled State Addition to Page Component

The existing register page handles `isFull` and `isClosed` states. Phase 9 adds `isCancelled` (D-08, UI-SPEC). The pattern is already established — add:

```tsx
// Cancelled state badge — per D-08, UI-SPEC
const isCancelled = event?.status === "cancelled";

{isCancelled && (
  <span className="inline-block mb-4 bg-destructive text-destructive-foreground px-2 py-1 rounded text-sm">
    ยกเลิกแล้ว
  </span>
)}
```

And update the Button disabled condition:
```tsx
disabled={submitting || (isFull && !isRegistered) || isClosed || isCancelled}
```

And the button label ternary — add `isCancelled` branch before `isClosed`.

### Flex Message Single CTA (D-04, D-05)

**`buildEventFlexCard`** — initial card posted on event creation. Event is always open at creation time, so label is always "ลงทะเบียน". Simplification: footer becomes one button.

```typescript
// Source: apps/api/src/lib/flex-messages.ts — current footer has 2 buttons
footer: {
  type: "box",
  layout: "vertical",  // single button, vertical layout fine
  contents: [
    {
      type: "button",
      style: "primary",
      color: "#00B300",
      action: {
        type: "uri",
        label: "ลงทะเบียน",
        uri: data.registerLiffUrl,  // now same URL as detailsLiffUrl
      },
    },
  ],
},
```

**`buildRepostFlexCard`** — repost card can represent full/closed/cancelled states. Button label toggles per UI-SPEC:

```typescript
const isOpenWithSlots = !data.isFull && !data.isClosed;
const ctaLabel = isOpenWithSlots ? "ลงทะเบียน" : "รายละเอียด";
const ctaStyle = isOpenWithSlots ? "primary" : "secondary";
const ctaColor = isOpenWithSlots ? "#00B300" : undefined;
```

The `detailsLiffUrl` field in `RepostCardData` is the CTA target for both cases (both now point to `/events/{id}`).

### Notification Line in Repost Card Body (D-06, D-07)

New field required on `RepostCardData`: notification text to display in card body. The UI-SPEC defines the text format. Two options:

**Option A:** Pass pre-built notification string into `buildRepostFlexCard` (same pattern as `notificationAltText` already on the interface).
**Option B:** Pass structured data and let `buildRepostFlexCard` compute the string.

Option A is consistent with how `notificationAltText` is handled — recommended (Claude's Discretion). The `repostFlexCard()` function in `repost-card.ts` already builds `altText` and passes it as `notificationAltText`; add parallel logic for `notificationBodyText`.

Notification line added to body contents after the spots count line:

```typescript
// Notification line — D-06, D-07
{ type: "text", text: data.notificationBodyText, size: "sm", color: "#666666" },
```

Computation in `repost-card.ts`:
```typescript
const remaining = event.maxPlayers - registeredCount;
const remainingText = remaining === 0 ? "เต็มแล้ว" : `เหลือ ${remaining} ที่`;

let notificationBodyText: string;
switch (action) {
  case "register":
    notificationBodyText = remaining === 0
      ? `${memberName} ลงทะเบียนแล้ว (เต็มแล้ว)`
      : `${memberName} ลงทะเบียนแล้ว (${remainingText})`;
    break;
  case "cancel":
    notificationBodyText = `${memberName} ยกเลิกแล้ว (${remainingText})`;
    break;
  case "admin_remove":
    notificationBodyText = `อัปเดตรายชื่อ (${remainingText})`;
    break;
  case "close":
    notificationBodyText = `ปิดรับลงทะเบียนแล้ว`;
    break;
  case "reopen":
    notificationBodyText = `เปิดรับลงทะเบียน (${remainingText})`;
    break;
}
```

### URL Updates for registerLiffUrl

All three call sites building `registerLiffUrl` must drop the `/register` suffix:

| File | Line | Change |
|------|------|--------|
| `apps/api/src/routes/events.ts` | ~96 | `${liffBase}/events/${created.id}/register` → `${liffBase}/events/${created.id}` |
| `apps/api/src/routes/cron.ts` | ~119 | same change |
| `apps/api/src/routes/event-templates.ts` | ~248 | same change |
| `apps/api/src/lib/repost-card.ts` | ~22 | same change |

`detailsLiffUrl` in all four files already points to `/events/{id}` (correct — no change needed).

### Interface Cleanup (Claude's Discretion)

The `RepostCardData` and `EventCardData` interfaces both carry `registerLiffUrl` and `detailsLiffUrl`. Since both now point to the same URL, the cleanest option is to keep both fields but pass the same value — this avoids touching all call sites. A future cleanup could consolidate to `eventLiffUrl`. For this phase: keep both fields, pass same value.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| 301 redirect for old `/register` path | Custom route handler | `next.config.js` `redirects()` array |
| Toast notifications | Custom feedback UI | `sonner` (already installed) |
| Thai date formatting | Custom formatter | `Intl.DateTimeFormat('th-TH', ...)` (already in use) |

---

## Common Pitfalls

### Pitfall 1: Leaving `buildEventFlexCard` with 2-button footer
**What goes wrong:** Initial event cards (posted at creation time) still show two buttons; only repost cards get the fix.
**How to avoid:** `buildEventFlexCard` and `buildRepostFlexCard` must both be updated. The initial card is posted from 3 routes (`events.ts`, `cron.ts`, `event-templates.ts`) — all use `buildEventFlexCard`.

### Pitfall 2: Forgetting `registerLiffUrl` in `repost-card.ts`
**What goes wrong:** The `/register` suffix redirect handles old cards in the wild, but new repost cards continue to generate the old URL, defeating the redirect.
**How to avoid:** Update `repost-card.ts` line ~22 alongside the three route files.

### Pitfall 3: `isCancelled` not included in button disabled condition
**What goes wrong:** Cancelled events show an active register button on the page.
**How to avoid:** Add `|| isCancelled` to the `disabled` prop and add the cancelled branch to the button label ternary.

### Pitfall 4: `notificationBodyText` missing for `close`/`reopen` actions in `repostFlexCard`
**What goes wrong:** TypeScript compile error or runtime undefined passed to card body.
**How to avoid:** Cover all 5 action cases (`register`, `cancel`, `admin_remove`, `close`, `reopen`) in the switch statement.

### Pitfall 5: Next.js redirect not matching dynamic segment
**What goes wrong:** Redirect only matches literal path, misses event IDs.
**How to avoid:** Use `:id` (colon syntax) not `[id]` in the `source` pattern of `next.config.js` redirects.

---

## Code Examples

### Current register page — move as-is
Source: `apps/web/app/liff/events/[id]/register/page.tsx`

The component is complete. The only additions needed:
1. `const isCancelled = event?.status === "cancelled";`
2. Cancelled badge after isFull badge
3. `isCancelled` added to `disabled` prop and label ternary

### Flex card footer — single button (repost card)
```typescript
// Source: apps/api/src/lib/flex-messages.ts — buildRepostFlexCard footer
const isOpenWithSlots = !data.isFull && !data.isClosed;
const ctaLabel = isOpenWithSlots ? "ลงทะเบียน" : "รายละเอียด";
footer: {
  type: "box",
  layout: "vertical",
  contents: [
    {
      type: "button",
      style: isOpenWithSlots ? "primary" : "secondary",
      ...(isOpenWithSlots ? { color: "#00B300" } : {}),
      action: {
        type: "uri",
        label: ctaLabel,
        uri: data.detailsLiffUrl,  // both URLs are now identical
      },
    },
  ],
},
```

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No new external dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected — no test config files found in `apps/web/` |
| Config file | None |
| Quick run command | Manual verification in LIFF browser |
| Full suite command | Manual E2E |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOT-01 | Single CTA button on Flex card | manual | Tap card in Line group | N/A |
| BOT-01 | Tapping CTA opens `/liff/events/[id]` | manual | Open in LIFF browser | N/A |
| D-02 | Old `/register` URL redirects to `/liff/events/[id]` | manual | Navigate to old URL | N/A |
| D-04 | Open event shows "ลงทะเบียน" label | manual | View open event card | N/A |
| D-04 | Full/closed/cancelled event shows "รายละเอียด" label | manual | View full/closed card | N/A |
| D-06 | Repost card body shows notification line | manual | Register/cancel and observe repost | N/A |
| D-08 | Cancelled badge visible on page | manual | View cancelled event page | N/A |

### Wave 0 Gaps
No automated test infrastructure exists for the LIFF frontend or Flex Message builder. All validation is manual for this phase.

*(If test infrastructure is added in a future phase, the Flex message builder logic in `flex-messages.ts` is pure functions — unit testable.)*

---

## Security Domain

No new authentication, session management, or user-supplied input handling introduced. The page reuses existing LIFF auth (`useLiff` hook) and proxy API routes from Phase 5 — no new attack surface.

| ASVS Category | Applies | Notes |
|---------------|---------|-------|
| V2 Authentication | No | LIFF auth unchanged from Phase 5 |
| V3 Session Management | No | No session changes |
| V4 Access Control | No | No new routes or role checks |
| V5 Input Validation | No | No new user input fields |
| V6 Cryptography | No | No crypto changes |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js `redirects()` in `next.config.js` supports `:id` dynamic segment syntax | Architecture Patterns (Redirect) | Redirect fails; fallback: add `redirect()` call in a `not-found.tsx` or route handler at `app/liff/events/[id]/register/route.ts` |

---

## Sources

### Primary (HIGH confidence — codebase verified)
- `apps/api/src/lib/flex-messages.ts` — full source of both card builders, confirmed interface shapes
- `apps/api/src/lib/repost-card.ts` — URL construction and `repostFlexCard` function
- `apps/web/app/liff/events/[id]/register/page.tsx` — complete register page to be moved
- `apps/api/src/routes/events.ts`, `cron.ts`, `event-templates.ts` — all Flex card call sites with `registerLiffUrl`
- `apps/web/next.config.js` — confirmed bare config, no existing redirects
- `apps/web/middleware.ts` — confirmed only handles `/clubs` paths
- `.planning/phases/09-event-details-page/09-UI-SPEC.md` — full visual and copy contracts

### Secondary (MEDIUM confidence)
- [ASSUMED] Next.js `redirects()` dynamic segment syntax — standard documented behavior but not verified via Context7 in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing
- Architecture: HIGH — codebase fully read, all edit targets identified
- Pitfalls: HIGH — derived from reading actual source files

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable codebase)
