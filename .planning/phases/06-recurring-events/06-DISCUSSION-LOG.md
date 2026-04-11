# Phase 6: Recurring Events - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 06-recurring-events
**Areas discussed:** Scheduling mechanism, Template creation UX, Per-occurrence overrides, Registration window

---

## Scheduling Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Cron job | Scheduled job runs periodically, checks templates, creates occurrence when registration window opens | ✓ |
| Eager batch | Generate next N occurrences upfront when template created | |
| On-demand lazy | Generate occurrence only when someone accesses the club | |

**User's choice:** Cron job
**Notes:** None

### Follow-up: Cron host

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Cron | Define cron in vercel.json, triggers API route | |
| External scheduler | External service hits API endpoint | |

**User's choice:** Railway Cron Job service (user noted they use Railway for production)

### Follow-up: Frequency

| Option | Description | Selected |
|--------|-------------|----------|
| Every hour | Good balance of timeliness and cost | ✓ |
| Every 15 minutes | More precise but more invocations | |
| Once daily | Simpler but less flexible | |

**User's choice:** Every hour

### Follow-up: Two trigger modes

**User's input:** Admin should be able to choose: schedule for future (cronjob) or create event now and post flex message immediately. Both use same template.
**Confirmed:** Yes — same template, two trigger options (auto cron vs manual "create now").

### Follow-up: Look-ahead

| Option | Description | Selected |
|--------|-------------|----------|
| Next one only | Generate only next occurrence when window opens | ✓ |
| Next 2 occurrences | Generate current + next week's | |

**User's choice:** Next one only

### Follow-up: Catch-up

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, catch up | Create occurrence on next run even if late | ✓ |
| Skip missed | Skip if window passed | |

**User's choice:** Yes, catch up

---

## Template Creation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Extend event form | Add recurring toggle to existing LIFF event creation form | ✓ |
| Separate template page | Dedicated /liff/templates page | |
| Bot command only | No LIFF form | |

**User's choice:** Extend event form

### Follow-up: Schedule days

| Option | Description | Selected |
|--------|-------------|----------|
| Single day | One template = one day of week | ✓ |
| Multiple days | One template can have multiple days | |

**User's choice:** Single day

### Follow-up: Bot command

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add /recurring | Separate command for recurring | |
| No separate command | Same /create, toggle recurring in form | ✓ |

**User's choice:** No separate command

### Follow-up: Edit template

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, editable | Template settings page, changes apply to future only | ✓ |
| Delete and recreate | No edit capability | |

**User's choice:** Yes, editable

### Edge case noted by user

Template maxPlayers edit: if active occurrence has 30/40 registrations and admin edits max to 20, reject. If only 15/40 and admin edits to 20, allow.

---

## Per-Occurrence Overrides

| Option | Description | Selected |
|--------|-------------|----------|
| Edit the generated event | Each occurrence is independent event, edit directly | ✓ |
| Explicit override layer | Separate overrides table | |

**User's choice:** Separate event and template. Generated event is independent — edit event directly, no effect on template. Template edits only affect future generated events.

### Follow-up: Cancellation

| Option | Description | Selected |
|--------|-------------|----------|
| Set status to cancelled | Event gets status=cancelled, bot posts notice | ✓ |
| Delete the event | Remove record entirely | |

**User's choice:** Set status to cancelled

### Follow-up: Cancellation notice

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, post notice | Bot pushes cancellation Flex Message to group | ✓ |
| No notice | Silent status update | |

**User's choice:** Yes, post notice

---

## Registration Window

| Option | Description | Selected |
|--------|-------------|----------|
| Hours before event | Open X hours before event time | |
| Days before event | Open X days before | |
| Specific day+time | Pick exact day and time registration opens | ✓ |

**User's choice:** Specific day+time

### Follow-up: Day+time format

| Option | Description | Selected |
|--------|-------------|----------|
| Same week, pick day + time | E.g. "Monday 09:00" for Thursday event | ✓ |
| Offset from event | "N days before at HH:MM" | |

**User's choice:** Same week, pick day + time

### Follow-up: Notification

| Option | Description | Selected |
|--------|-------------|----------|
| Just Flex Message | The card IS the notification | ✓ |
| Flex Message + push | Extra push notification | |

**User's choice:** Just Flex Message

### Follow-up: Close time

| Option | Description | Selected |
|--------|-------------|----------|
| Close at event start | Auto-close when event time arrives | ✓ |
| Configurable close time | Admin sets when to close | |
| Manual close only | Stays open until admin closes | |

**User's choice:** Close at event start

---

## Claude's Discretion

- Database schema design for event_templates table
- Cron endpoint security
- Flex Message design for cancellation notice
- Thai day-of-week display format
- "Create now" button placement in template UI

## Deferred Ideas

None — discussion stayed within phase scope
