# Requirements: Badminton Club Platform

**Defined:** 2026-04-05
**Core Value:** Members can register for badminton sessions directly inside their Line group — no more copy-paste templates, no manual headcount tracking.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Multi-tenant PostgreSQL schema with club-scoped data isolation
- [ ] **INFRA-02**: Elysia.js API backend (apps/api) with Line webhook endpoint, raw body handling, and signature validation — deployed on Vercel with Bun runtime
- [ ] **INFRA-03**: Webhook idempotency (deduplicate redelivered events)
- [ ] **INFRA-04**: Drizzle ORM schema with migrations for all domain tables

### Club Setup

- [ ] **CLUB-01**: Club owner creates a club on the website with name, home court/location, default shuttlecock fee, default court fee, default max players
- [ ] **CLUB-02**: Owner adds Line bot to their club's Line group; bot detects `join` event and links group to club
- [ ] **CLUB-03**: Owner role has full control — can manage club settings and promote/demote admins
- [ ] **CLUB-04**: Admin role can create events, manage registrations, and remove members
- [ ] **CLUB-05**: Per-club default settings pre-fill event creation fields

### Member Identity

- [ ] **MEMB-01**: LIFF authenticates members via Line Login; access token verified server-side
- [ ] **MEMB-02**: First-time member completes one-time profile setup: display name, skill level (Beginner/Intermediate/Advanced/Competitive), years playing badminton
- [ ] **MEMB-03**: Member profile is global — tied to Line userId, carries across all clubs
- [ ] **MEMB-04**: Members can update their profile anytime via LIFF

### Event Creation

- [ ] **EVNT-01**: Admin creates a one-time event with date+time, venue name + Google Maps link, shuttlecock fee, court fee, max players
- [ ] **EVNT-02**: Event fields default from club settings but can be overridden per event
- [ ] **EVNT-03**: Admin creates a recurring event with day of week + time schedule
- [ ] **EVNT-04**: Recurring events auto-generate the next occurrence on schedule
- [ ] **EVNT-05**: Configurable registration open window (e.g. opens 1 day before the event)
- [ ] **EVNT-06**: Admin can override individual occurrences of a recurring event (change venue, cancel, adjust fees)

### Bot Interaction

- [ ] **BOT-01**: Bot posts a Flex Message card in the Line group with event info, current/max count, "Register" CTA, "Details" CTA
- [ ] **BOT-02**: Bot updates the Flex Message count when registrations change (repost strategy since Line messages are immutable)
- [ ] **BOT-03**: Bot responds to text commands (e.g. /create, /close, สร้างอีเวนต์)
- [ ] **BOT-04**: Card shows "Full" state with disabled register button when event reaches max players

### Registration

- [ ] **REG-01**: Member taps "Register" → LIFF opens → member adds themselves to the registration list
- [ ] **REG-02**: Registration list is visible in LIFF — members see who else is registered
- [ ] **REG-03**: Members can cancel their own registration via LIFF
- [ ] **REG-04**: Admin can close registration early via bot command
- [ ] **REG-05**: Admin can remove any member from the registration list via LIFF admin panel

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Website Hub (Phase 2)

- **WEB-01**: Each club gets a public profile page (/club/slug)
- **WEB-02**: Public homepage lists upcoming events by location
- **WEB-03**: Members can register for events via website (Line Login required)
- **WEB-04**: Admin dashboard for event and member management on web

### Matchmaking (Phase 3a)

- **MATCH-01**: Session waiting list with check-in
- **MATCH-02**: Pairing suggestions based on skill level and wait time
- **MATCH-03**: Admin drag-and-drop court assignment UI
- **MATCH-04**: Match history logging

### Rankings (Phase 3b)

- **RANK-01**: Elo rating system with chemistry factor
- **RANK-02**: Automated matchmaking from waiting list
- **RANK-03**: Match result recording and rating updates
- **RANK-04**: Player profile with stats and rating trend
- **RANK-05**: Club leaderboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Text-template parsing | Removed by owner — adds complexity with low payoff; LIFF registration is strictly better |
| Payment tracking / fee collection | Requires Thai financial compliance; cash-on-court is current norm |
| In-app member messaging | Line group chat already handles this natively |
| Court booking integration | Thai court systems vary widely; no standard API |
| Automated waitlist with auto-promotion | Auto-registration without consent causes confusion in casual settings |
| Multi-language UI | Thai clubs use Thai; no need for i18n in v1 |
| Win/loss recording | Phase 3b; collecting skill level now seeds future data |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | TBD | Pending |
| INFRA-02 | TBD | Pending |
| INFRA-03 | TBD | Pending |
| INFRA-04 | TBD | Pending |
| CLUB-01 | TBD | Pending |
| CLUB-02 | TBD | Pending |
| CLUB-03 | TBD | Pending |
| CLUB-04 | TBD | Pending |
| CLUB-05 | TBD | Pending |
| MEMB-01 | TBD | Pending |
| MEMB-02 | TBD | Pending |
| MEMB-03 | TBD | Pending |
| MEMB-04 | TBD | Pending |
| EVNT-01 | TBD | Pending |
| EVNT-02 | TBD | Pending |
| EVNT-03 | TBD | Pending |
| EVNT-04 | TBD | Pending |
| EVNT-05 | TBD | Pending |
| EVNT-06 | TBD | Pending |
| BOT-01 | TBD | Pending |
| BOT-02 | TBD | Pending |
| BOT-03 | TBD | Pending |
| BOT-04 | TBD | Pending |
| REG-01 | TBD | Pending |
| REG-02 | TBD | Pending |
| REG-03 | TBD | Pending |
| REG-04 | TBD | Pending |
| REG-05 | TBD | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28 ⚠️ (will be mapped during roadmap creation)

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after initial definition*
