# Roadmap: Badminton Club Platform (ก๊วนแบดออนไลน์)

## Overview

Six phases deliver a complete Line-native multi-tenant platform for Thai badminton clubs. The build order is dictated by hard dependencies: the database schema and webhook infrastructure must exist before any feature can run; clubs must exist before events; member identity must exist before registrations; one-time events must work before recurring ones. Each phase ends with a coherent, independently verifiable capability — nothing ships until that phase's observable user behaviors are confirmed.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Multi-tenant database schema, Drizzle migrations, and Line webhook skeleton with signature validation
- [ ] **Phase 2: Club Setup** - Club creation on web, bot join event handler, group-to-club linking, and role management
- [ ] **Phase 3: Member Identity** - LIFF bootstrap infrastructure, Line Login verification, one-time member profile, and iron-session
- [ ] **Phase 4: Event Creation** - Admin creates one-time events via bot command and LIFF, bot posts Flex Message card to group
- [ ] **Phase 5: Registration Loop** - Member registers via LIFF, live count, cancellation, admin remove, full/closed state
- [ ] **Phase 6: Recurring Events** - Recurring event templates, auto-generate occurrences, configurable open window, per-occurrence overrides

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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Planning complete | - |
| 2. Club Setup | 0/TBD | Not started | - |
| 3. Member Identity | 0/TBD | Not started | - |
| 4. Event Creation | 0/TBD | Not started | - |
| 5. Registration Loop | 0/TBD | Not started | - |
| 6. Recurring Events | 0/TBD | Not started | - |
