# Phase 5: Registration Loop - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Members can register for events via LIFF, see the registration list, cancel their own registration, and see full/closed states. Admins can remove members and close/reopen registration from the LIFF page. The bot reposts Flex Message cards to the group on every registration change with a notification-style message showing who joined/left and the current count.

</domain>

<decisions>
## Implementation Decisions

### Registration UX
- **D-01:** One-tap registration — LIFF opens showing event info + member list, member taps one button to register instantly. Minimal friction for casual badminton groups.
- **D-02:** Registration list shows numbered names only (e.g., 1. สมชาย, 2. สมหญิง). No skill level or timestamp. Full list available in LIFF; card shows count only.
- **D-03:** Cancel via same page — if already registered, the Register button toggles to "ยกเลิก" (Cancel). One tap to remove.
- **D-04:** List refreshes on LIFF page focus (not real-time polling). When member switches back from LINE chat, list reloads with current data.

### Card Repost Strategy
- **D-05:** Repost on every registration change — register, cancel, or admin remove all trigger a new Flex Message card push to the group.
- **D-06:** Reposted card is notification-style: title shows "[MemberName] ลงทะเบียนแล้ว (30/40 คน)" for registrations, "[MemberName] ยกเลิกแล้ว (29/40 คน)" for cancellations. Admin removes show count update without naming the removed member.
- **D-07:** Old cards remain in chat as history. No attempt to reference or link old cards.
- **D-08:** `events.lineMessageId` updated to point to the latest reposted card after each push.
- **D-09:** Repost is best-effort — if LINE pushMessage fails, log the error and continue. Registration mutation always succeeds regardless of card push result. Same pattern as Phase 4.

### Admin Controls
- **D-10:** Admin member removal is inline — admins see an (X) remove icon next to each member name in the registration list. Same page, no separate admin section.
- **D-11:** Close registration via LIFF button — "ปิดรับลงทะเบียน" button at the bottom of the registration page, visible to admins only. No bot command for close in this phase.
- **D-12:** When admin closes registration, bot reposts Flex Message card to group showing "ปิดรับลงทะเบียนแล้ว" with final count.
- **D-13:** Admin can reopen closed registration — "เปิดรับลงทะเบียน" (Reopen) button appears for admins when event is closed. Sets status back to `open`.

### Full/Closed States
- **D-14:** Full event LIFF page: Register button disabled with "เต็มแล้ว" text. Red/orange badge at top. Member list still visible.
- **D-15:** Full event card: shows "40/40 เต็ม" indicator. Register CTA still opens LIFF (shows full state there). Per BOT-04.
- **D-16:** Closed event LIFF page: same disabled button pattern with "ปิดรับลงทะเบียนแล้ว" text. Registration list visible for reference.
- **D-17:** Closed event card: reposts with "ปิดรับลงทะเบียนแล้ว" and final count.

### Claude's Discretion
- LIFF registration page layout and styling details
- API endpoint design for registration CRUD and event status mutations
- How the close/reopen bot card references the event (by lineMessageId or event title)
- Concurrency handling for simultaneous registrations (DB unique constraint handles duplicates)
- Error handling for edge cases (registering for cancelled event, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/03-member-identity/03-CONTEXT.md` — LIFF auth (D-01 to D-10), session reuse, LIFF page hosting at `/liff/*`
- `.planning/phases/04-event-creation/04-CONTEXT.md` — Event creation flow, Flex Message card design, bot command pattern, lineMessageId storage

### Schema
- `packages/db/src/schema/events.ts` — Events table with status enum (draft/open/closed/cancelled), lineMessageId, maxPlayers
- `packages/db/src/schema/registrations.ts` — Registrations table with eventId, memberId, unique constraint, registeredAt
- `packages/db/src/schema/members.ts` — Members table with lineUserId, displayName

### Existing Code
- `apps/api/src/routes/events.ts` — Event CRUD routes, POST creates event + pushes Flex Message
- `apps/api/src/lib/flex-messages.ts` — `buildEventFlexCard()` function (extend for repost cards with member notification)
- `apps/api/src/lib/line-client.ts` — LINE MessagingApiClient singleton for pushMessage
- `apps/api/src/middleware/auth.ts` — API auth middleware (session.lineUserId)
- `apps/api/src/lib/require-club-role.ts` — Role check utility (owner/admin/member)
- `apps/web/components/liff/liff-provider.tsx` — LIFF SDK init + auth flow

### Auth & Session
- `apps/web/lib/session.ts` — SessionData interface with lineUserId, memberId
- `apps/web/app/api/proxy/[...path]/route.ts` — Proxy for LIFF → API calls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildEventFlexCard()` in `apps/api/src/lib/flex-messages.ts` — extend for notification-style repost cards
- `LiffProvider` + `useLiff` hook — LIFF SDK initialization and auth
- shadcn/ui components: Button, Card, Input, Label, Toaster (Sonner toast)
- react-hook-form + zodResolver pattern from ProfileForm and ClubForm
- `requireClubRole()` utility for admin checks

### Established Patterns
- LIFF pages at `/liff/*` in `apps/web` as Next.js routes
- API routes in `apps/api/src/routes/*.ts` as Elysia plugins with `.use(authMiddleware)`
- Proxy pattern: LIFF pages call `/api/proxy/*` which forwards to Elysia API with session cookie
- Best-effort LINE push with error logging (Phase 4 pattern in event creation)
- Sonner toast for user feedback

### Integration Points
- New Elysia route plugin for registration CRUD (`apps/api/src/routes/registrations.ts`)
- New LIFF page for event registration (`apps/web/app/liff/events/[id]/register/page.tsx`)
- Extend `buildEventFlexCard` or add new builder for notification-style repost cards
- Event status mutations (close/reopen) on existing `events.ts` route or new route
- Webhook text handler for `/close` command — not needed per D-11, close is LIFF-only

</code_context>

<specifics>
## Specific Ideas

- Repost card title format: "[MemberName] ลงทะเบียนแล้ว (30/40 คน)" for joins, "[MemberName] ยกเลิกแล้ว (29/40 คน)" for cancels
- Admin remove repost shows count update but doesn't name the removed member (privacy)
- Close notification card shows "ปิดรับลงทะเบียนแล้ว" with final count
- Full state shows "40/40 เต็ม" on both LIFF badge and Flex Message card
- Toggle button pattern: same button switches between "ลงทะเบียน" / "ยกเลิก" based on member's registration state

</specifics>

<deferred>
## Deferred Ideas

- Waitlist when event is full — out of scope per requirements (automated waitlist with auto-promotion explicitly excluded)
- Bot command for close registration (`/close`, `ปิด`) — user chose LIFF-only for Phase 5; could add bot command later
- Event editing after creation (change date/venue/fees) — noted in Phase 4 deferred ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-registration-loop*
*Context gathered: 2026-04-08*
