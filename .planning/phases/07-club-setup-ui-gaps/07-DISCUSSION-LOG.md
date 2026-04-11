# Phase 7: Club Setup UI Gaps - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 07-club-setup-ui-gaps
**Areas discussed:** Unlink Group UX, Location display

---

## Unlink Group UX

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, confirm dialog | Show warning that bot notifications will stop. User must confirm. | ✓ |
| No, instant unlink | Single tap unlinks immediately, show success toast only | |
| You decide | Claude picks the safest approach | |

**User's choice:** Confirmation dialog before unlinking
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Settings page | Add to existing club settings page — natural place for destructive admin actions | ✓ |
| Club detail page | Show on main club detail page next to badge | |
| Both pages | Show on detail with shortcut, full action on settings | |

**User's choice:** Settings page only
**Notes:** None

---

## Location Display

| Option | Description | Selected |
|--------|-------------|----------|
| New card in grid | 4th card alongside Max Players, Shuttlecock Fee, Court Fee | ✓ |
| Under club name | Subtitle text below club name at top of page | |
| Inside Club Defaults card | Location line inside existing card at bottom | |

**User's choice:** New card in the grid
**Notes:** None

---

## Claude's Discretion

- Warning text copy for unlink confirmation dialog
- Empty location card behavior (show "Not set" or hide)
- API endpoint details for DELETE /api/clubs/:id/link

## Deferred Ideas

None
