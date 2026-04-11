---
status: complete
phase: 09-event-details-page
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md]
started: 2026-04-12T06:35:00Z
updated: 2026-04-12T06:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Event details page loads at /liff/events/[id]
expected: Visiting /liff/events/[id] renders the event details page with event info (title, date, venue), registration list, and register/cancel button. Same content as the old /register page.
result: pass

### 2. Cancelled event shows badge and disabled button
expected: When event status is "cancelled", a red "ยกเลิกแล้ว" badge appears and the register button is disabled with "ยกเลิกแล้ว" label.
result: pass

### 3. Venue Google Maps link
expected: When an event has a venueMapsUrl, a "Google Maps" link appears below the venue name. Tapping opens the maps URL in a new tab.
result: pass

### 4. Old /register URL redirects
expected: Visiting /liff/events/[id]/register returns a 301 redirect to /liff/events/[id]. Existing links and bookmarks still work.
result: pass

### 5. Initial Flex card has single CTA button
expected: When a new event is created and the Flex Message card is sent to the group, the card footer shows ONE green "ลงทะเบียน" button (not two buttons).
result: pass

### 6. Repost card CTA is context-aware
expected: When someone registers/cancels, the repost card shows "ลงทะเบียน" (green, primary) if spots remain, or "รายละเอียด" (gray, secondary) if the event is full or closed.
result: pass

### 7. Repost card shows notification line
expected: The repost Flex card body includes a notification line like "สมชาย ลงทะเบียนแล้ว (เหลือ 3 ที่)" showing who acted and remaining seats.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
