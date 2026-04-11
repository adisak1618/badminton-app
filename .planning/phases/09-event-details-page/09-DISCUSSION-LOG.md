# Phase 9: Event Details Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 09-event-details-page
**Areas discussed:** Content & layout, Register CTA, Event states, Flex card changes

---

## Content & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Full info card | Show everything: title, date/time, venue, fees, max players, registration list | |
| Same as register page | Reuse the same layout as the register page without the register/cancel buttons | ✓ |
| Compact summary | Just key info with a link to the register page | |

**User's choice:** Same as register page
**Notes:** User later decided to fully merge the pages (see Register CTA)

---

## Register CTA

| Option | Description | Selected |
|--------|-------------|----------|
| Include register button | Same register/cancel toggle as the register page | |
| Read-only + link | Show a button that navigates to the register page | |
| Read-only only | Pure info view, no registration action | |
| Combine pages (Other) | Merge register and detail into one page | ✓ |

**User's choice:** Combine register and detail page — merge into a single page at `/liff/events/[id]`
**Notes:** User explicitly wanted the pages merged rather than having two separate pages

---

## URL Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Move to [id] + redirect | Page lives at /liff/events/[id], old /register path does 301 redirect | ✓ |
| Single page, both paths | Keep both route files rendering the same component | |

**User's choice:** Move to [id] + redirect
**Notes:** Ensures existing Flex cards with registerLiffUrl still work

---

## Event States

| Option | Description | Selected |
|--------|-------------|----------|
| Same as register page | Reuse badge + disabled button patterns from Phase 5 | ✓ |
| Simplified states | Just show a text status line | |

**User's choice:** Same as register page (Recommended)

---

## Flex Card CTA Changes

| Option | Description | Selected |
|--------|-------------|----------|
| Keep two buttons | Current design with Register + Details buttons | |
| Single button with state-aware label | Only show Register button; change to Details when full/closed/cancelled | ✓ |

**User's choice:** Single button — "ลงทะเบียน" for open events, "รายละเอียด" for full/closed/cancelled
**Notes:** User explicitly requested this simplification. Same URL for both labels.

---

## Repost Card Notification

| Option | Description | Selected |
|--------|-------------|----------|
| Add notification line | Visible line in card body showing who joined and seats remaining | ✓ |
| Just change altText | Keep card body as-is, only adjust altText | |

**User's choice:** Add notification line — format: "สมชาย ลงทะเบียนแล้ว (เหลือ 10 ที่)"
**Notes:** User wanted members to see at a glance who joined and how many seats remain, directly in the card

---

## Claude's Discretion

- Notification line positioning in Flex card body
- Redirect implementation approach
- Whether to refactor registerLiffUrl/detailsLiffUrl into single eventLiffUrl

## Deferred Ideas

None
