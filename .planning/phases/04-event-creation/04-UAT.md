---
status: complete
phase: 04-event-creation
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md
started: 2026-04-08T10:00:00Z
updated: 2026-04-08T10:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Start the API from scratch. Server boots without errors, env validation passes, and a basic API call returns a response (not a startup crash).
result: pass

### 2. Bot Command Replies with LIFF Link
expected: An admin sends `/create`, `/new`, `สร้าง`, or `สร้างอีเวนท์` in the LINE group. The bot replies with a message containing a LIFF URL pointing to the event creation form (https://liff.line.me/{LIFF_ID}/liff/events/create?clubId=...).
result: pass

### 3. Non-Admin Commands Silently Ignored
expected: A non-admin member (or someone not in the club) sends `/create` in the LINE group. The bot does NOT reply — no error message, no acknowledgment. The group chat stays clean.
result: pass

### 4. LIFF Event Form Loads with Club Defaults
expected: Open the LIFF event creation link from the bot's reply. The form loads with 7 fields. Venue name, shuttlecock fee, court fee, and max players are pre-filled from the club's default settings.
result: pass

### 5. LIFF Event Form Validation
expected: Submit the form with empty required fields or invalid values. Thai validation error messages appear inline under the relevant fields. The form does not submit.
result: pass

### 6. Event Creation via LIFF
expected: Fill all fields correctly and tap submit. The event is created successfully — a success toast appears and the LIFF window closes. The event is saved in the database.
result: pass

### 7. Flex Message Card Posted to Group
expected: After event creation, the bot posts a Flex Message card to the LINE group showing: Thai-formatted date, venue name (tappable if Maps link provided), shuttlecock fee, court fee, "0/max คน" registration count, and two CTA buttons — "ลงทะเบียน" (Register) and "รายละเอียด" (Details).
result: pass

### 8. Event Creation Blocked Without Linked Group
expected: Attempt to create an event for a club that has no LINE group linked (lineGroupId is null). The API returns a 422 error with a Thai message indicating the group must be linked first.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
