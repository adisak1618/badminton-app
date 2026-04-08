# Phase 5: Registration Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 05-registration-loop
**Areas discussed:** Registration UX, Card repost strategy, Admin controls, Full/closed states

---

## Registration UX

| Option | Description | Selected |
|--------|-------------|----------|
| One-tap register | LIFF opens, shows event info + member list, member taps one button to add themselves instantly | ✓ |
| Confirm dialog | LIFF opens, shows event details, member taps Register then gets a confirmation dialog | |
| Auto-register on open | Opening the LIFF link auto-registers the member | |

**User's choice:** One-tap register
**Notes:** Minimal friction matches casual badminton group culture

| Option | Description | Selected |
|--------|-------------|----------|
| Name + number only | Numbered list: 1. สมชาย, 2. สมหญิง | ✓ |
| Name + skill level | Shows skill badge next to name | |
| Name + timestamp | Shows when each person registered | |

**User's choice:** Name + number only

| Option | Description | Selected |
|--------|-------------|----------|
| Cancel button on same page | Register button becomes "ยกเลิก" — toggle pattern | ✓ |
| Swipe-to-cancel on list | Swipe gesture to cancel | |
| Separate cancel page | Dedicated cancellation flow | |

**User's choice:** Cancel button on same page

| Option | Description | Selected |
|--------|-------------|----------|
| Poll on focus | Refresh list when LIFF page gains focus | ✓ |
| Auto-refresh interval | Poll every 10-15 seconds | |
| Static load only | List loads once on page open | |

**User's choice:** Poll on focus

---

## Card Repost Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Every registration change | Repost immediately on each register/cancel/remove | ✓ |
| Debounced (30s) | Wait 30 seconds after last change before reposting | |
| No repost | Card count stays static, LIFF is live view | |

**User's choice:** Every registration change

| Option | Description | Selected |
|--------|-------------|----------|
| Leave old card in chat | Old cards remain as history, natural LINE pattern | ✓ |
| Bot sends "see latest card" | Text reply pointing to new card | |

**User's choice:** Leave old card in chat

| Option | Description | Selected |
|--------|-------------|----------|
| Count only | Card shows "5/12 คน" | |
| Names + count | Card shows count AND list of names | |
| First 5 names + count | Up to 5 names then "... +7 more" | |

**User's choice:** Count only — BUT user specified notification-style: card title should say "[MemberName] ลงทะเบียนแล้ว (30/40 คน)"
**Notes:** User wants the repost card to act as a notification showing WHO joined/left and the current count. Not just a static count update.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, update to latest | events.lineMessageId always points to latest card | ✓ |
| No, keep original | lineMessageId stays as first card | |

**User's choice:** Update lineMessageId to latest

| Option | Description | Selected |
|--------|-------------|----------|
| Log and continue | Registration succeeds regardless of card push result | ✓ |
| Retry once then log | One retry attempt | |
| Queue for retry | Add to retry queue | |

**User's choice:** Log and continue (same pattern as Phase 4)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same pattern for cancels | Repost "[MemberName] ยกเลิกแล้ว (29/40 คน)" | ✓ |
| No, only registrations | Cancellations are silent | |

**User's choice:** Yes, same notification pattern for cancellations

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, repost for admin removes | Repost with updated count (no member name) | ✓ |
| No repost for admin actions | Admin removals are silent | |

**User's choice:** Yes, repost with count update but don't name removed member

---

## Admin Controls

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on registration list | Admins see (X) remove icon next to each name | ✓ |
| Separate admin panel tab | Registration page has Members/Admin tabs | |
| Long-press to remove | Gesture-based removal | |

**User's choice:** Inline on registration list

| Option | Description | Selected |
|--------|-------------|----------|
| Bot command in group | Admin types /close in group | |
| LIFF admin button | Close button in LIFF event page | ✓ |
| Both bot + LIFF | Either method works | |

**User's choice:** LIFF admin button (not bot command)

| Option | Description | Selected |
|--------|-------------|----------|
| Same registration page | Close button at bottom of registration page | ✓ |
| Event settings page | Separate LIFF page for admin actions | |

**User's choice:** Same registration page

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, repost with closed state | Bot reposts card showing "Registration Closed" with final count | ✓ |
| No notification | Closing is silent | |

**User's choice:** Repost card with closed state

---

## Full/Closed States

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled button + "เต็มแล้ว" badge | Register button grayed out, red/orange badge at top | ✓ |
| Hide register button entirely | No register button when full | |
| Show waitlist option | Offer "Join Waitlist" | |

**User's choice:** Disabled button + "เต็มแล้ว" badge

| Option | Description | Selected |
|--------|-------------|----------|
| Show "40/40 เต็ม" on card | Card shows full count with indicator, Register CTA still opens LIFF | ✓ |
| Remove Register CTA when full | Card only shows Details button | |

**User's choice:** Show "40/40 เต็ม" on card

| Option | Description | Selected |
|--------|-------------|----------|
| Same as full + "ปิดรับลงทะเบียนแล้ว" | Disabled button with closed text, list still visible | ✓ |
| Read-only list only | Remove all action buttons | |

**User's choice:** Same pattern with "ปิดรับลงทะเบียนแล้ว"

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, reopen button for admins | Admin sees "เปิดรับลงทะเบียน" button when closed | ✓ |
| No, closing is final | Must create new event | |

**User's choice:** Yes, admin can reopen

---

## Claude's Discretion

- LIFF registration page layout and styling
- API endpoint design for registration CRUD
- Concurrency handling approach
- Error handling for edge cases
- Close/reopen card design details

## Deferred Ideas

- Waitlist when event is full (out of scope)
- Bot command for close registration (user chose LIFF-only)
- Event editing after creation (Phase 4 deferred item)
