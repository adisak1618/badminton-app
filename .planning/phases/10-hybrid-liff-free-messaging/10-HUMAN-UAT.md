---
status: partial
phase: 10-hybrid-liff-free-messaging
source: [10-VERIFICATION.md]
started: 2026-04-12T12:45:00+07:00
updated: 2026-04-12T12:45:00+07:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. External browser login flow
expected: Opening /events/{id} in Chrome redirects to LINE Login OAuth, then returns to the event page with full functionality
result: [pending]

### 2. In-LINE register produces user message
expected: Registering for an event inside LINE app sends a Flex card as YOUR message (not bot's) in the group chat via liff.sendMessages()
result: [pending]

### 3. External browser register produces bot message
expected: Registering from Chrome (external browser) sends a Flex card as BOT message via pushMessage fallback
result: [pending]

### 4. 301 redirects work end-to-end
expected: Visiting /liff/events/some-id returns 301 redirect to /events/some-id
result: [pending]

### 5. chat_message.write scope enabled
expected: LINE Developers Console shows chat_message.write scope enabled for the LIFF app
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
