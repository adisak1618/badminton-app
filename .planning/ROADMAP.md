# Roadmap: Badminton Club Platform (ก๊วนแบดออนไลน์)

## Overview

Six phases deliver a complete Line-native multi-tenant platform for Thai badminton clubs. The build order is dictated by hard dependencies: the database schema and webhook infrastructure must exist before any feature can run; clubs must exist before events; member identity must exist before registrations; one-time events must work before recurring ones. Each phase ends with a coherent, independently verifiable capability — nothing ships until that phase's observable user behaviors are confirmed.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Multi-tenant database schema, Drizzle migrations, and Line webhook skeleton with signature validation
- [x] **Phase 2: Club Setup** - Club creation on web, bot join event handler, group-to-club linking, and role management
- [x] **Phase 3: Member Identity** - LIFF bootstrap infrastructure, Line Login verification, one-time member profile, and iron-session
- [x] **Phase 4: Event Creation** - Admin creates one-time events via bot command and LIFF, bot posts Flex Message card to group
- [x] **Phase 5: Registration Loop** - Member registers via LIFF, live count, cancellation, admin remove, full/closed state
- [x] **Phase 6: Recurring Events** - Recurring event templates, auto-generate occurrences, configurable open window, per-occurrence overrides
- [x] **Phase 7: Club Setup UI Gaps** - Add homeCourtLocation to club forms and unlink group button to settings
- [x] **Phase 8: Data Validation Fixes** - Align venueName maxLength between API and DB, use validated env for LIFF_ID
- [ ] **Phase 9: Event Details Page** - LIFF event details page so Flex Message "Details" CTA resolves instead of 404
- [ ] **Phase 10: Hybrid LIFF & Free Messaging** - Refactor LIFF pages for both LINE and browser, switch to free LIFF messaging
- [ ] **Phase 11: Club Hub & Events List** - Club hub navigation page and events list with upcoming + weekly recurring schedule

## Phase Details

### Phase 1: Foundation
**Goal**: The multi-tenant data layer and webhook infrastructure are in place, correctly isolated, and safe to build on
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. `packages/db` contains a Drizzle schema with all domain tables (clubs, members, events, registrations, idempotency_keys) and at least one passing migration against Neon PostgreSQL
  2. The Line webhook endpoint at `/api/webhook/line` accepts a valid POST, verifies the `X-Line-Signature` using raw body, and returns HTTP 200 immediately
  3. Submitting the same `webhookEventId` twice does not process the second event — the idempotency key table rejects the duplicate
  4. All club-scoped queries include a `club_id` filter; a cross-tenant isolation integration test passes
  5. Environment variables are validated at startup via `@t3-oss/env-nextjs`; missing vars cause a descriptive startup error, not a runtime crash
**Plans:** 3 plans
Plans:
- [x] 01-01-PLAN.md — Create packages/db with Drizzle schema, drizzle-kit config, and generate migration SQL files
- [x] 01-02-PLAN.md — Scaffold apps/api with Elysia webhook, signature verification, idempotency, and env validation
- [x] 01-03-PLAN.md — Run drizzle-kit migrate against Neon and integration tests for all INFRA requirements

### Phase 2: Club Setup
**Goal**: A club owner can create a club on the website, add the bot to their Line group, and assign admins — the club is ready for events
**Depends on**: Phase 1
**Requirements**: CLUB-01, CLUB-02, CLUB-03, CLUB-04, CLUB-05
**Success Criteria** (what must be TRUE):
  1. An owner can create a club on the website by entering name, home court/location, default shuttlecock fee, default court fee, and default max players — the club is saved and visible in their dashboard
  2. When the Line bot is added to a group, it sends a one-time setup link; the owner opens that link and links the group to their club — the club's `line_group_id` is set
  3. An authenticated owner can promote a member to Admin and demote an Admin back to member via the web dashboard
  4. An Admin can access admin functions (event creation, registration management) while a plain Member cannot
  5. Club default settings (fees, max players) pre-fill the event creation form
**Plans:** 4 plans
Plans:
- [x] 02-01-PLAN.md — UI infrastructure: shadcn/ui + Tailwind v4, iron-session, Line Login OAuth, Next.js middleware
- [x] 02-02-PLAN.md — API: error handling, auth middleware, club CRUD routes, member role management, group linking
- [x] 02-03-PLAN.md — Web dashboard: club list, create, settings, members/roles, group linking pages
- [x] 02-04-PLAN.md — Bot join event handler: Flex Message with setup link on group join
**UI hint**: yes

### Phase 3: Member Identity
**Goal**: Members can open any LIFF page, authenticate via Line Login, complete their profile once, and be recognised across all clubs
**Depends on**: Phase 2
**Requirements**: MEMB-01, MEMB-02, MEMB-03, MEMB-04
**Success Criteria** (what must be TRUE):
  1. A member opening a LIFF URL inside Line is authenticated via Line Login; the ID token is verified server-side and an iron-session cookie is set — no client-supplied userId is trusted
  2. A first-time member is redirected to a profile setup screen and cannot proceed until they enter display name, skill level, and years playing — the record is saved to the global `members` table
  3. The same member profile (name, skill level) appears regardless of which club's LIFF they access — profile is keyed by Line userId, not by club
  4. A member can update their display name, skill level, and years playing at any time via the LIFF profile page — changes persist immediately
**Plans**: TBD
**UI hint**: yes

### Phase 4: Event Creation
**Goal**: An admin can create a one-time event and the bot posts a Flex Message card to the Line group — members see the event and can tap to register
**Depends on**: Phase 3
**Requirements**: EVNT-01, EVNT-02, BOT-01, BOT-03
**Success Criteria** (what must be TRUE):
  1. An admin can create a one-time event via bot command (`/create` or Thai equivalent) with date/time, venue name + Google Maps link, shuttlecock fee, court fee, and max players
  2. An admin can create a one-time event via the LIFF admin panel with the same fields — club defaults pre-fill the form
  3. After event creation, the bot posts a Flex Message card to the Line group showing event info, current/max count (0/max), a "Register" CTA button, and a "Details" CTA button
  4. The event record stores the posted message ID as reference metadata; no code attempts to edit the message after posting
**Plans:** 3 plans
Plans:
- [x] 04-01-PLAN.md — Webhook text-message handler for bot commands (/create, /new, Thai aliases) with role check
- [x] 04-02-PLAN.md — Event API routes (POST /events, GET /events/club-defaults) with Flex Message card builder and push
- [x] 04-03-PLAN.md — LIFF event creation form page with club defaults pre-fill, validation, and schema push
**UI hint**: yes

### Phase 5: Registration Loop
**Goal**: Members can register for events inside Line, see who else is registered, cancel their own registration, and admins can manage the list — the core value is fully delivered
**Depends on**: Phase 4
**Requirements**: REG-01, REG-02, REG-03, REG-04, REG-05, BOT-02, BOT-04
**Success Criteria** (what must be TRUE):
  1. A member taps "Register" on a Flex Message card, LIFF opens, and they can add themselves to the registration list with one tap — their name appears in the list immediately
  2. The LIFF registration page displays the live, current list of registered members — multiple members opening the page see the same list without refreshing
  3. A member can cancel their own registration via LIFF — their name is removed from the list
  4. When the event reaches max players, the "Register" button in LIFF is disabled and a "Full" indicator is shown; when an admin closes registration, the same disabled state appears
  5. An admin can remove any member from the registration list via the LIFF admin panel
  6. An admin can close registration early via bot command — subsequent registration attempts are rejected
  7. When registration count changes (member added, member removed, event closed), the bot reposts a new Flex Message card with the updated count, replacing the previous card as the current reference
**Plans:** 2 plans
Plans:
- [x] 05-01-PLAN.md — Registration API routes, flex card repost builder, event status endpoint, integration tests
- [x] 05-02-PLAN.md — LIFF registration page with register/cancel/admin controls and human verification
**UI hint**: yes

### Phase 6: Recurring Events
**Goal**: Admins can define a weekly event template once and the bot handles posting and registration for every occurrence automatically
**Depends on**: Phase 5
**Requirements**: EVNT-03, EVNT-04, EVNT-05, EVNT-06
**Success Criteria** (what must be TRUE):
  1. An admin can create a recurring event template specifying day of week, time, and a registration open window (e.g. "opens 1 day before") — the template is saved and active
  2. At the scheduled open time, the system automatically generates the next occurrence event record and the bot posts its Flex Message card to the group — without any admin action
  3. An admin can override an individual occurrence to change the venue, adjust fees, or cancel it — the change applies only to that occurrence, not the template
  4. A cancelled occurrence posts a cancellation notice to the group; the registration form for that occurrence shows as unavailable
  5. All occurrence scheduling uses Asia/Bangkok timezone — events open and post at the correct local time regardless of server timezone
**Plans:** 4 plans
Plans:
- [x] 06-01-PLAN.md — Schema, template CRUD API, cancellation Flex builder, integration tests
- [x] 06-02-PLAN.md — Cron endpoint for auto-generating occurrences with Bangkok timezone logic
- [x] 06-03-PLAN.md — LIFF event creation form recurring toggle extension
- [x] 06-04-PLAN.md — Template management UI (list, edit, create-now, cancel occurrence)

### Phase 7: Club Setup UI Gaps
**Goal**: Close audit gaps for CLUB-01 and CLUB-02 — homeCourtLocation field appears in all club UI forms and owners can unlink a Line group
**Depends on**: Phase 2
**Requirements**: CLUB-01, CLUB-02
**Gap Closure:** Closes gaps from v1.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. The ClubForm component includes a homeCourtLocation text field — creating or editing a club submits this value to the API
  2. The club detail/settings page displays the homeCourtLocation value
  3. The club settings page has an "Unlink Group" button that calls DELETE /api/clubs/:id/link — after clicking, the club's line_group_id is cleared
**Plans:** 2 plans
Plans:
- [x] 07-01-PLAN.md — Add homeCourtLocation card to detail page and fix settings type
- [x] 07-02-PLAN.md — Add Unlink Group button with dialog to settings page and Toaster to layout

### Phase 8: Data Validation Fixes
**Goal**: Fix API-DB validation mismatch for venueName and use validated env module for LIFF_ID
**Depends on**: Phase 4
**Requirements**: EVNT-01, BOT-01
**Gap Closure:** Closes integration issues from v1.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. The venueName field has consistent max length between API validation and DB column — no valid API input can cause a DB truncation or error
  2. LIFF layout reads LIFF_ID from the validated env module, not raw process.env
**Plans**: TBD

### Phase 9: Event Details Page
**Goal**: The Flex Message "Details" CTA button opens a LIFF page showing full event information and registration list — closing the broken flow identified in the milestone audit
**Depends on**: Phase 5
**Requirements**: BOT-01
**Gap Closure:** Closes integration gap (Flex Message Details CTA → 404) and broken "Details view" E2E flow from v1.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. A Next.js page exists at `/liff/events/[id]` that loads event data by ID and displays venue, date/time, fees, and max players
  2. The page displays the current registration list with member display names
  3. Tapping "Details" (รายละเอียด) on the Flex Message card in Line opens this page in the LIFF browser without error
**Plans**: TBD
**UI hint**: yes

### Phase 10: Hybrid LIFF & Free Messaging
**Goal**: Refactor LIFF pages to work both inside LINE and in regular browsers, switch user-initiated actions from paid Messaging API pushMessage to free LIFF sendMessages/shareTargetPicker, and restructure URLs (remove /liff prefix)
**Depends on**: Phase 9
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. LiffProvider detects external browser and uses liff.login() — all LIFF pages load and function correctly in both LINE and regular browsers
  2. User-initiated actions (register, cancel, create event) use liff.sendMessages() or shareTargetPicker instead of server-side pushMessage — no Messaging API cost for these flows
  3. Server-side pushMessage is only used for cron-generated events (no user present)
  4. URL structure no longer requires /liff prefix — pages are accessible at clean paths
**Plans**: TBD

### Phase 11: Club Hub & Events List
**Goal**: Create a club hub page as the central navigation point and an events list page showing both upcoming events and recurring weekly schedule from active templates
**Depends on**: Phase 6, Phase 10
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. A club hub page exists with links to events, members, and settings
  2. An events list page shows all upcoming events (one-time and generated from templates) sorted by date
  3. The events list page displays a weekly schedule section derived from active templates (e.g. "ทุกวันจันทร์ 19:00 สนาม X")
  4. Members can see the full recurring schedule even if events haven't been generated yet by cron
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-04-06 |
| 2. Club Setup | 4/4 | Complete | 2026-04-06 |
| 3. Member Identity | 2/2 | Complete | 2026-04-07 |
| 4. Event Creation | 3/3 | Complete | 2026-04-07 |
| 5. Registration Loop | 2/2 | Complete | 2026-04-08 |
| 6. Recurring Events | 4/4 | Complete | 2026-04-11 |
| 7. Club Setup UI Gaps | 2/2 | Complete | 2026-04-09 |
| 8. Data Validation Fixes | 1/1 | Complete | 2026-04-09 |
| 9. Event Details Page | 0/TBD | Not started | - |
| 10. Hybrid LIFF & Free Messaging | 0/TBD | Not started | - |
| 11. Club Hub & Events List | 0/TBD | Not started | - |
