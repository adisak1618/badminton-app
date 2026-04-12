# Phase 11: Club Hub & Events List - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform `/clubs/[id]` into a club hub page as the central navigation point. Add an events list showing all upcoming events (full cards with register capability) and a weekly schedule section derived from active event templates. Accessible from both website and LIFF.

</domain>

<decisions>
## Implementation Decisions

### Club Hub Layout
- **D-01:** Transform existing `/clubs/[id]` into a hub — replace current defaults/fees display with next event highlight + quick links (Events, Members, Schedule, Settings). Current club defaults move to the Settings page.
- **D-02:** Show ALL upcoming events directly on the hub page (not just next event). Hub IS the events list page.

### Events List Display
- **D-03:** Full event cards — each event shows title, date/time, venue, player count progress bar (e.g. 5/12), shuttlecock fee, court fee, and a register button.
- **D-04:** Cards use existing shadcn Card/Badge/Button components. Mobile-first layout.

### Weekly Schedule Section
- **D-05:** Separate weekly schedule section at the TOP of the page, above upcoming events. Derived from active event templates. Shows day of week + time + venue (e.g. "จันทร์ 19:00 สนามX ลาดพร้าว").
- **D-06:** Schedule section ensures members see the recurring pattern even if cron hasn't generated events yet.

### LIFF vs Website Access
- **D-07:** Both website (`/clubs/[id]`) and LIFF (`/(liff)/clubs/[id]`) versions. Members can browse events inside LINE without leaving the app.

### Claude's Discretion
- Sorting order for upcoming events (chronological is expected)
- Empty state design when no events exist
- How register button on event cards integrates with existing LIFF registration flow
- Whether events list needs pagination or infinite scroll (likely not needed for typical club sizes)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing UI
- `apps/web/app/clubs/[id]/page.tsx` — Current club detail page to be transformed into hub
- `apps/web/app/clubs/[id]/settings/page.tsx` — Settings page (club defaults may move here)
- `apps/web/app/(liff)/events/[id]/page.tsx` — Event detail/registration page (integration point)

### API
- `apps/api/src/routes/events.ts` — Event routes (needs new GET list endpoint)
- `apps/api/src/routes/event-templates.ts` — Template routes (GET list exists for schedule section)

### Components
- `packages/ui/` — shadcn Card, Badge, Button, Separator components
- `apps/web/components/liff/liff-provider.tsx` — LiffProvider context for LIFF pages
- `apps/web/lib/liff-messaging.ts` — trySendMessages helper for registration flow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card/CardHeader/CardContent/CardTitle` from @repo/ui — used throughout club pages
- `Badge` — for status indicators (role, link status)
- `apiClient` — server-side API client for data fetching
- `useLiff()` hook — available in LIFF context for sendMessages integration

### Established Patterns
- Server components for data fetching (clubs/[id]/page.tsx is async server component)
- LIFF pages are client components using useLiff() hook
- API routes use Elysia with auth middleware
- Event templates have `dayOfWeek`, `startTime`, `venueName` fields for schedule display

### Integration Points
- `/clubs/[id]` → transformed into hub (existing route, same URL)
- `/(liff)/clubs/[id]` → new LIFF route for in-LINE access
- `GET /events?clubId=...` → new API endpoint needed for events list
- Register button → links to existing `/(liff)/events/[id]` or inline registration

</code_context>

<specifics>
## Specific Ideas

- Weekly schedule should display Thai day names (จันทร์, อังคาร, etc.)
- Player count uses a progress bar visual (████████░░░░ 5/12 คน)
- Register button directly on event card for quick action
- Hub quick links section with icons for Events, Members, Schedule, Settings

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-club-hub-events-list*
*Context gathered: 2026-04-12*
