# Phase 6: Recurring Events - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can define weekly event templates with a schedule and registration window. The system auto-generates occurrence events and posts Flex Messages on schedule via a cron job. Admins can also manually trigger immediate occurrence creation. Each generated occurrence is an independent event record that can be edited or cancelled without affecting the template.

</domain>

<decisions>
## Implementation Decisions

### Scheduling Mechanism
- **D-01:** Railway Cron Job service triggers an API endpoint hourly to check templates and generate occurrences.
- **D-02:** Cron generates only the NEXT upcoming occurrence per template (no look-ahead). Checks: "does this template need a new occurrence whose registration window has opened?"
- **D-03:** Catch-up behavior — if the cron missed a window (downtime), it creates the occurrence on the next run, even if late. Never silently skip a week.
- **D-04:** Two trigger modes for occurrence creation: **auto** (cron generates and posts when registration window opens) and **create now** (admin manually triggers immediate occurrence creation + Flex Message posting from the template).

### Template Creation UX
- **D-05:** Extend existing LIFF event creation form with a "Recurring" toggle. When toggled on, extra fields appear: day of week, time, registration window settings. Reuses existing form — no separate template page.
- **D-06:** Single day of week per template. If a club plays Tuesday + Thursday, they create two templates. Simpler data model and override handling.
- **D-07:** No separate bot command for recurring — admin uses same `/create` flow and toggles recurring in the form.
- **D-08:** Templates are editable after creation. Admin can change day, time, fees, venue on the template. Changes apply only to future generated occurrences — already-generated events are not affected.
- **D-09:** Template maxPlayers edit validation: if any active occurrence already has more registrations than the new max, reject the edit with an error. If current registrations fit within the new max, allow it.

### Per-Occurrence Overrides
- **D-10:** Clean separation: template = blueprint, generated event = independent record. After cron creates an event from a template, the event is detached. Admin edits the event directly (change venue, fees, etc.) — no effect on template. Template edits only affect future generated events.
- **D-11:** Generated events have a `templateId` foreign key linking back to the source template (for reference/history), but the event data is copied at generation time and independent thereafter.
- **D-12:** Cancelling an occurrence sets event status to `cancelled` (not delete). Bot posts a cancellation Flex Message notice to the LINE group. Existing registrations are preserved but event is marked cancelled.

### Registration Window
- **D-13:** Admin picks a specific day + time for registration to open (same week as the event). E.g., "Monday 09:00" for a Thursday event. The cron generates the occurrence and posts the Flex Message at that exact day+time.
- **D-14:** Just the Flex Message card in the group — no separate push notification when registration opens.
- **D-15:** Registration auto-closes when the event date/time arrives. No configurable close time — admin can still manually close early via existing Phase 5 mechanism.

### Claude's Discretion
- Database schema design for the event_templates table (columns, types, indexes)
- Cron endpoint security (auth token or secret to prevent unauthorized triggers)
- Flex Message design for cancellation notice
- Thai day-of-week display format in template UI
- How "Create now" button appears in the template management UI

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/04-event-creation/04-CONTEXT.md` — Event creation form, bot command patterns, Flex Message card design
- `.planning/phases/05-registration-loop/05-CONTEXT.md` — Registration API, event status management, repost pattern

### Schema
- `packages/db/src/schema/events.ts` — Current events table (will need templateId FK added)
- `packages/db/src/schema/clubs.ts` — Club defaults used for template pre-fill

### Existing Patterns
- `apps/api/src/webhook/handlers/join.ts` — Flex Message posting pattern
- `apps/api/src/lib/line-client.ts` — LINE MessagingApiClient singleton
- `apps/web/app/liff/events/create/page.tsx` — Existing event creation LIFF form (extend with recurring toggle)

### Deployment
- Railway production deployment — cron job runs as separate Railway service

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Event creation LIFF form (`/liff/events/create`) — extend with recurring toggle and extra fields
- `buildEventFlexCard` — Flex Message builder, reuse for occurrence posting
- `buildRepostFlexCard` — Repost pattern for updated cards
- Event API routes (`apps/api/src/routes/events.ts`) — extend for template CRUD
- `eventStatusEnum` — Already has `cancelled` status

### Established Patterns
- LIFF pages at `/liff/*` with LiffProvider auth
- API routes as Elysia plugins with authMiddleware
- Proxy pattern: LIFF pages call `/api/proxy/*` which forwards to Elysia API
- Flex Message push via `lineClient.pushMessage()`

### Integration Points
- New `event_templates` table in packages/db schema
- Add `templateId` nullable FK to existing `events` table
- New cron API endpoint (e.g. `POST /api/cron/generate-occurrences`)
- Extend event creation form with recurring toggle
- New template management view in LIFF for edit/delete

</code_context>

<specifics>
## Specific Ideas

- Registration window uses specific day+time (e.g., "Monday 09:00" for Thursday event) — intuitive for Thai clubs with fixed weekly schedules
- Template maxPlayers validation against active occurrence registrations — prevents admin from accidentally stranding registered members
- "Create now" gives admin manual control for the current week while cron handles the future automatically

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-recurring-events*
*Context gathered: 2026-04-11*
