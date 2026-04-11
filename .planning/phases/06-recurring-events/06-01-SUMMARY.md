---
phase: 06-recurring-events
plan: "01"
subsystem: backend
tags: [schema, api, recurring-events, flex-messages, tests]
dependency_graph:
  requires: []
  provides: [event_templates_table, template_crud_api, cancellation_flex]
  affects: [packages/db, apps/api]
tech_stack:
  added: [date-fns-tz@3.2.0]
  patterns: [drizzle-orm, elysia-plugin, iron-session-auth, bun-test]
key_files:
  created:
    - packages/db/src/schema/event-templates.ts
    - apps/api/src/routes/event-templates.ts
    - apps/api/src/__tests__/event-templates.test.ts
  modified:
    - packages/db/src/schema/events.ts
    - packages/db/src/schema/index.ts
    - apps/api/src/env.ts
    - apps/api/src/lib/flex-messages.ts
    - apps/web/lib/validations/event.ts
    - apps/api/src/index.ts
decisions:
  - "Used date-fns-tz toZonedTime/fromZonedTime for Bangkok timezone arithmetic in nextOccurrence helper"
  - "Schema push run from worktree via symlinked node_modules to main repo packages/db"
  - "Tests run with PORT=3099 to avoid conflict with running dev server on 3000"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  files_changed: 9
---

# Phase 6 Plan 01: Schema + Template CRUD API + Tests Summary

JWT-style auth event template CRUD with Bangkok timezone occurrence generation and cancellation Flex Messages.

## What Was Built

### Task 1: Schema + Supporting Files
- **`event_templates` table** with `templateStatusEnum` (active/paused/archived), scheduling columns (`eventDayOfWeek`, `eventTime`, `openDayOfWeek`, `openTime`), fee/capacity columns, and `updatedAt`
- **`templateId` nullable FK** added to `events` table linking occurrences back to their template (D-11)
- **`CRON_SECRET`** env var added to `apps/api/src/env.ts` for securing the future cron endpoint
- **`buildCancellationFlexCard`** added to `flex-messages.ts` — Thai cancellation notice with red "ยกเลิกอีเวนท์" header
- **`templateCreateSchema`** added to web validations with HH:MM regex validation for time fields
- Schema pushed to Neon database — `event_templates` table and `templateId` column now live

### Task 2: Template CRUD API + Tests
- **`GET /api/event-templates?clubId`** — list templates for a club
- **`POST /api/event-templates`** — create template, returns 201
- **`PATCH /api/event-templates/:id`** — update template with D-09 maxPlayers guard (422 if active occurrences have more registrations than new max)
- **`POST /api/event-templates/:id/create-now`** — D-04 manual occurrence: calculates next Bangkok-timezone occurrence date, inserts open event with templateId, pushes Flex Message
- **`PATCH /api/event-templates/:id/occurrences/:eventId/cancel`** — D-12 cancel: sets status=cancelled, pushes cancellation Flex Message, validates templateId ownership (T-6-02)
- All routes protected by `authMiddleware` + `requireClubRole(["owner","admin"])`
- 7 integration tests all passing

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

### Files Exist
- packages/db/src/schema/event-templates.ts: FOUND
- apps/api/src/routes/event-templates.ts: FOUND
- apps/api/src/__tests__/event-templates.test.ts: FOUND

### Commits
- 1d064c9: feat(06-01): schema + env + validation + cancellation flex builder
- badf9e1: feat(06-01): template CRUD API routes and integration tests

## Self-Check: PASSED
