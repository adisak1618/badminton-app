# Badminton Club Platform (ก๊วนแบดออนไลน์)

## What This Is

A multi-tenant platform for casual badminton clubs (ก๊วนแบด) to manage events and member
registration. The primary touchpoint is a Line bot + LIFF mini-app embedded in existing
Line groups. Clubs are created and configured via a website, then the bot handles
day-to-day event management inside Line.

## Core Value

Members can register for badminton sessions directly inside their Line group — no more
copy-paste registration templates, no manual headcount tracking.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Club setup (website)**
- [ ] Club owner creates a club on the website: name, home court/location, default shuttlecock fee, default court fee, default max players
- [ ] Owner adds the Line bot to their club's Line group to link the group to the club
- [ ] Two roles within a club: Owner (full control, can promote/demote admins) and Admin (create events, manage registrations, remove members)

**Member profile (one-time)**
- [ ] When a member registers for the first time (any club), they complete a one-time profile: display name, skill level (Beginner / Intermediate / Advanced / Competitive), years playing badminton
- [ ] Profile is tied to their Line user ID — carries across all clubs automatically
- [ ] Members can update their profile anytime via LIFF

**Event creation**
- [ ] Admin creates a one-time event via bot command or LIFF admin panel
- [ ] Admin creates a recurring event: day of week + time, registration open window (e.g. opens 1 day before), per-occurrence overrides (change venue, cancel, etc.)
- [ ] Event fields: date + time, venue name + Google Maps link, shuttlecock fee, court fee, max players (defaults from club settings, overridable per event)
- [ ] Bot posts a registration summary card (Flex Message) in the Line group with: event info, current count / max, "Register" CTA (→ LIFF), "Details" CTA

**Member registration**
- [ ] Members tap "Register" → LIFF opens, shows current registration list
- [ ] Member taps to add themselves; bot updates the summary card count in the group
- [ ] When event is full: "Register" button disabled, card shows "Full"
- [ ] Members can cancel their own registration via LIFF

**Registration management (admin)**
- [ ] Admin can close registration early via bot command
- [ ] Admin can remove any member from the registration list via LIFF admin panel

### Out of Scope

- Text-template parsing (1.4) — removed; adds complexity with low payoff
- Matchmaking, skill-based pairing — Phase 3a+
- Payment tracking — future phase
- Win/loss recording, Elo ratings — Phase 3b
- Website-based registration (members only register via LIFF in Phase 1) — Phase 2
- Public event discovery — Phase 2

## Context

- The existing codebase is a blank Turborepo + Next.js 16 monorepo (create-turbo template). It has `apps/web`, `apps/docs`, and a `packages/ui` component library — all scaffold-only, no application logic yet.
- Most Thai badminton clubs use Line groups as their primary communication channel. Registration today is a manually posted text block that members reply to — error-prone and hard to track.
- The platform is designed to slot into this existing behavior with minimal friction: the bot lives inside the existing Line group.
- Line OA (Official Account) and Messaging API channel need to be created as part of setup.
- Members' Line identity (userId) is the persistent identifier across clubs.

## Constraints

- **Platform**: Line Messaging API + LIFF — all member-facing interactions happen inside Line
- **Multi-tenancy**: Data model must support multiple clubs from day 1 (Phase 2 adds public club pages)
- **Database**: PostgreSQL (provider TBD — Neon or Railway recommended for Vercel deployment)
- **Backend**: Elysia.js (Bun runtime) as separate API service (`apps/api`) — handles Line webhook, all API routes
- **Frontend**: Next.js for website + LIFF pages (`apps/web`)
- **Deployment**: Vercel for both services — Elysia with Bun runtime, Next.js with Node.js runtime
- **Auth**: Line Login for member identity; Line userId as the cross-club persistent identifier

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Multi-tenant data model from Phase 1 | Avoids painful migration when Phase 2 adds club profiles and public pages | — Pending |
| Website-first club onboarding, then bot | More comfortable UX for club setup than a chat-based wizard; bot handles daily ops | — Pending |
| Member profile stored globally (not per-club) | Members shouldn't re-enter name/level for every club they join | — Pending |
| Recurring events with configurable registration window | Clubs play on fixed schedules; manual creation every week is admin overhead | — Pending |
| LIFF for all registration UI | Keeps the member flow inside Line; no need to leave the app | — Pending |
| Elysia.js + Bun as API backend | Lightweight, type-safe framework; separate API service from Next.js frontend; deployed on Vercel with Bun runtime | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-11 after Phase 07 completion*
