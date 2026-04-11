# Phase 9: Event Details Page - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

The Flex Message "Details" CTA opens a LIFF page showing full event information and registration list. This phase merges the details and register pages into a single unified page at `/liff/events/[id]`, updates Flex Message cards to use a single CTA button with context-aware labeling, and adds a notification line to repost cards showing who acted and seats remaining.

</domain>

<decisions>
## Implementation Decisions

### Page Consolidation
- **D-01:** Merge details and register into one page at `/liff/events/[id]` — same layout as the existing register page (event info + registration list + register/cancel button)
- **D-02:** Move existing `/liff/events/[id]/register/page.tsx` to `/liff/events/[id]/page.tsx`. Old `/register` path gets a 301 redirect so existing Flex cards with `registerLiffUrl` still work.
- **D-03:** Both `registerLiffUrl` and `detailsLiffUrl` now point to the same URL: `/liff/events/[id]`

### Flex Message Card CTA Changes
- **D-04:** Single button on Flex cards instead of two. Open events with available slots show "ลงทะเบียน" (Register). Full/closed/cancelled events show "รายละเอียด" (Details). Both point to `/liff/events/[id]`.
- **D-05:** Remove the separate "รายละเอียด" secondary button from both `buildEventFlexCard` and `buildRepostFlexCard`.

### Repost Card Notification Line
- **D-06:** Add a visible notification text line in the repost Flex card body showing who acted and seats remaining. Format: "สมชาย ลงทะเบียนแล้ว (เหลือ 10 ที่)" for register, "สมชาย ยกเลิกแล้ว (เหลือ 11 ที่)" for cancel. Admin remove shows count update without naming the removed member.
- **D-07:** Seats remaining = `maxPlayers - registeredCount`. When full: "เต็มแล้ว" instead of "เหลือ 0 ที่".

### Event States on Page
- **D-08:** Reuse the same badge + disabled button patterns from Phase 5 (D-14 to D-17) for full/closed/cancelled states on the combined page.

### Claude's Discretion
- Exact positioning of the notification line within the Flex card body
- Redirect implementation (Next.js middleware vs redirect config vs route handler)
- Whether to refactor `registerLiffUrl` / `detailsLiffUrl` into a single `eventLiffUrl` in the card data interfaces, or keep both pointing to the same value

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/05-registration-loop/05-CONTEXT.md` — Registration UX (D-01 to D-04), card repost strategy (D-05 to D-09), admin controls (D-10 to D-13), full/closed states (D-14 to D-17)
- `.planning/phases/04-event-creation/04-CONTEXT.md` — Event creation flow, Flex Message card design, lineMessageId storage

### Flex Message Implementation
- `apps/api/src/lib/flex-messages.ts` — `buildEventFlexCard`, `buildRepostFlexCard`, `buildRepostAltText` — all need CTA and notification changes
- `apps/api/src/lib/repost-card.ts` — Builds repost card data, constructs `detailsLiffUrl` and `registerLiffUrl`

### Existing Registration Page
- `apps/web/app/liff/events/[id]/register/page.tsx` — Current register page to be moved to parent route

### API Routes
- `apps/api/src/routes/events.ts` — Event creation route that builds initial Flex card
- `apps/api/src/routes/cron.ts` — Cron route that generates recurring event occurrences and posts Flex cards
- `apps/api/src/routes/event-templates.ts` — Template create-now route that posts Flex cards

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useLiff` hook and `LiffProvider` — LIFF auth infrastructure
- Registration page component — moves as-is to new path
- `buildRepostFlexCard` / `buildEventFlexCard` — need modification but structure is reusable
- `buildRepostAltText` — already has action-aware text, keep in sync with new card body notification

### Established Patterns
- Flex Message cards use bubble layout with body (info) + footer (CTAs)
- Repost card data interface (`RepostCardData`) includes both `registerLiffUrl` and `detailsLiffUrl`
- Thai date formatting via `Intl.DateTimeFormat` with `th-TH` locale

### Integration Points
- All routes that build Flex cards need updated: `events.ts`, `cron.ts`, `event-templates.ts`, `repost-card.ts`
- `registerLiffUrl` references across the codebase need to point to `/liff/events/[id]` (drop `/register`)

</code_context>

<specifics>
## Specific Ideas

- Notification line format: "สมชาย ลงทะเบียนแล้ว (เหลือ 10 ที่)" — seats remaining, not total count
- When full: show "เต็มแล้ว" instead of "เหลือ 0 ที่"
- Single CTA button label toggles between "ลงทะเบียน" and "รายละเอียด" based on event state

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-event-details-page*
*Context gathered: 2026-04-12*
