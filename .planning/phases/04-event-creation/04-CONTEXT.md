# Phase 4: Event Creation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

An admin can create a one-time event via bot command or LIFF admin panel, and the bot posts a Flex Message card to the LINE group — members see the event info and can tap to register. This phase covers event creation and card posting only; registration handling is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Bot Command Design
- **D-01:** Bot command triggers LIFF form — typing `/create` (or any alias) in the group replies with a LIFF link to the event creation form. The LIFF page checks the member's role server-side; admins see the form, non-admins see an error.
- **D-02:** Multiple command aliases for discoverability: `/create`, `/new`, `สร้าง`, `สร้างอีเวนท์`. All trigger the same flow.
- **D-03:** Non-admin users typing a create command are silently ignored — bot does not reply. Keeps group chat clean and doesn't reveal the command exists to non-admins.
- **D-04:** Bot must look up the sender's `lineUserId` in `club_members` (via the group's linked `clubId`) to check role before responding. Only `owner` or `admin` roles trigger the LIFF link reply.

### LIFF Admin Panel
- **D-05:** Single page form — all fields on one scrollable page. Fits mobile LIFF viewport, fast for 6-7 fields.
- **D-06:** Club defaults pre-fill all applicable fields (EVNT-02): venue name, venue maps URL, shuttlecock fee, court fee, max players. Admin can override any field per event.
- **D-07:** Event title is auto-generated from date + venue (e.g., "แบด 15 เม.ย. - สนามXYZ"). Admin can edit if they want a custom name. Reduces friction.
- **D-08:** Required fields: date/time, venue name. Optional: venue maps URL, title override. Fees and max players pre-filled from club defaults (always have a value).

### Flex Message Card Design
- **D-09:** Card displays all key info: date + time, venue name + tappable Google Maps link, fees in Thai format (ลูกขน 50฿ / สนาม 200฿), and spots count (0/max).
- **D-10:** Two CTA buttons: "ลงทะเบียน" (Register) opens LIFF registration page, "รายละเอียด" (Details) opens LIFF event detail page. Per success criteria 3.
- **D-11:** Fees displayed with Thai labels and ฿ symbol: `ลูกขน {shuttlecockFee}฿ / สนาม {courtFee}฿`. Natural for Thai badminton groups.

### Event Lifecycle
- **D-12:** Event goes directly to `open` status on creation — no draft workflow. Card posted to LINE group immediately after admin saves the form.
- **D-13:** Card is posted once. `lineMessageId` stored as reference metadata. No repost or edit in Phase 4 — reposting with updated count is Phase 5 scope (BOT-02).
- **D-14:** The flow: admin creates event via LIFF form → API saves event record with status=open → API calls LINE Messaging API to push Flex Message to the group → stores returned messageId in `events.lineMessageId`.

### Claude's Discretion
- Flex Message JSON structure and styling (colors, spacing, font sizes)
- How the LIFF event creation page communicates with the API (direct or through proxy)
- Date/time picker component choice for the LIFF form
- Error handling for LINE API push message failures
- Thai date formatting approach (e.g., Buddhist Era vs CE)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/02-club-setup/02-CONTEXT.md` — Club dashboard scope, web auth (Line Login + iron-session), shadcn/ui
- `.planning/phases/03-member-identity/03-CONTEXT.md` — LIFF auth (D-01 to D-10), session reuse, LIFF page hosting at `/liff/*`

### Schema
- `packages/db/src/schema/events.ts` — Events table with title, eventDate, venueName, venueMapsUrl, fees, maxPlayers, status enum, lineMessageId
- `packages/db/src/schema/clubs.ts` — Club defaults: shuttlecockFee, courtFee, maxPlayers, homeCourtLocation

### Existing Bot Patterns
- `apps/api/src/webhook/handlers/join.ts` — Flex Message posting pattern (replyMessage with Flex JSON)
- `apps/api/src/webhook/line.ts` — Webhook event routing (text message handler needed for commands)
- `apps/api/src/lib/line-client.ts` — LINE MessagingApiClient singleton (use for pushMessage to group)

### Auth & Session
- `apps/api/src/middleware/auth.ts` — API auth middleware (session.lineUserId)
- `apps/web/components/liff/liff-provider.tsx` — LIFF SDK init + auth flow
- `apps/api/src/routes/club-members.ts` — Role check pattern (owner/admin/member)

### LINE API
- LINE Messaging API: `pushMessage` for sending Flex Message to group (groupId from clubs table)
- LINE Flex Message Simulator for card design validation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LiffProvider` + `useLiff` hook — LIFF SDK initialization, already handles auth
- `ProfileForm` pattern — react-hook-form + zod + shadcn components (reuse for event form)
- `Flex Message` pattern from `join.ts` — can extend for event card
- `lineClient` singleton — ready for pushMessage calls
- shadcn components: Button, Card, Input, Label, Select, Toaster

### Established Patterns
- LIFF pages at `/liff/*` in `apps/web` as Next.js routes
- API routes in `apps/api/src/routes/*.ts` as Elysia plugins with `.use(authMiddleware)`
- Proxy pattern: LIFF pages call `/api/proxy/*` which forwards to Elysia API with session cookie
- Webhook handlers in `apps/api/src/webhook/handlers/*.ts`

### Integration Points
- New webhook text message handler for command parsing (alongside existing join handler)
- New Elysia route plugin for event CRUD (`apps/api/src/routes/events.ts`)
- New LIFF page for event creation (`apps/web/app/liff/events/create/page.tsx`)
- `events.lineMessageId` stored after pushMessage response

</code_context>

<specifics>
## Specific Ideas

- Command aliases include Thai text: `สร้าง`, `สร้างอีเวนท์` — important for Thai badminton group UX
- Fee display format explicitly: `ลูกขน {n}฿ / สนาม {n}฿` with Thai labels
- Title auto-generation pattern: `แบด {day} {month} - {venue}` (Thai short date + venue)

</specifics>

<deferred>
## Deferred Ideas

- Event editing after creation (edit date/venue/fees) — could be Phase 4.1 or Phase 5
- Draft/scheduled posting workflow — revisit if admins want to prepare events in advance
- Rich menu integration for admin commands — future UX improvement

</deferred>

---

*Phase: 04-event-creation*
*Context gathered: 2026-04-08*
