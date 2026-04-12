# Phase 11: Club Hub & Events List - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 11-club-hub-events-list
**Areas discussed:** Club hub layout, Events list display, Weekly schedule section, LIFF vs website

---

## Club Hub Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Transform existing page | Replace /clubs/[id] with hub: quick links + summary cards. Defaults move to Settings. | ✓ |
| Tab-based hub | Keep /clubs/[id] with tabs: Overview, Events, Members, Settings | |
| Separate events page | Keep /clubs/[id] as-is, add /clubs/[id]/events | |

**User's choice:** Transform existing page
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Next upcoming only | Single next event card | |
| Next 2-3 events | 2-3 mini cards stacked | |
| Show all upcoming events | Full events list on hub | ✓ |

**User's choice:** Show all upcoming events (custom input)
**Notes:** User wants hub to BE the events list — no separate page needed

---

## Events List Display

| Option | Description | Selected |
|--------|-------------|----------|
| Compact list rows | Dense rows: date, time, venue, players, status | |
| Full event cards | Card with title, date/time, venue, player bar, fees, register button | ✓ |
| You decide | Claude picks | |

**User's choice:** Full event cards
**Notes:** Selected preview with progress bar, Thai text, fees, and register button

---

## Weekly Schedule Section

| Option | Description | Selected |
|--------|-------------|----------|
| Separate section above | Schedule at top, events below. Shows pattern even without generated events. | ✓ |
| Integrated as labels | No separate section — recurring badge on cards | |
| You decide | Claude picks | |

**User's choice:** Separate section above
**Notes:** Selected preview with Thai day names and venue info

---

## LIFF vs Website

| Option | Description | Selected |
|--------|-------------|----------|
| Website only | /clubs/[id] only. LIFF stays for actions. | |
| Both website and LIFF | Also /(liff)/clubs/[id] for in-LINE browsing | ✓ |
| You decide | Claude picks | |

**User's choice:** Both website and LIFF
**Notes:** Members should browse events inside LINE too
