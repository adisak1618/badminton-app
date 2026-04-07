---
status: complete
phase: 02-club-setup
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: 2026-04-07T00:00:00Z
updated: 2026-04-07T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running servers. Start fresh with `pnpm dev`. Both web and API boot without errors — no missing env crashes. Landing page loads. API webhook endpoint responds to GET/POST.
result: pass

### 2. LINE Login OAuth Flow
expected: Click "Login with LINE" on the landing page. You are redirected to LINE's authorization screen. After granting permission, you are redirected back to the app with a session cookie set. The nav bar shows your LINE display name and a logout option.
result: pass

### 3. Protected Route Redirect
expected: Without logging in (or after logging out), navigate to /clubs. You are redirected to the login page (or landing page). After logging in, /clubs loads normally.
result: pass

### 4. Create a Club
expected: Navigate to /clubs/create. Fill in club name, home court/location, default shuttlecock fee, default court fee, and default max players. Submit the form. You are redirected to /clubs and the new club appears in the list with an "Owner" role badge.
result: issue
reported: "home court/location missing in create form"
severity: major

### 5. View Club List
expected: Navigate to /clubs. All clubs you belong to are listed with their name, your role badge (Owner/Admin/Member), and linked/not-linked status. If no clubs exist, an empty state with a "Create Club" CTA is shown.
result: pass

### 6. View Club Details
expected: Click a club from the list. The detail page shows the club name, your role, linked status, and the 3 default settings (shuttlecock fee, court fee, max players). If you are Owner or Admin, Settings and Members navigation links are visible.
result: pass

### 7. Edit Club Settings
expected: As the club Owner, navigate to Settings. The form is pre-filled with current defaults. Change a value (e.g., max players) and save. The update succeeds and the new value is reflected on the club detail page.
result: pass

### 8. Manage Club Members
expected: As the club Owner, navigate to Members. The member list shows each member with their role. You can promote a Member to Admin or demote an Admin back to Member. The role change is reflected immediately. You cannot change your own role.
result: pass

### 9. Link LINE Group to Club
expected: Open /clubs/link?groupId=TEST_GROUP_ID (simulating the bot's setup link). The page shows your unlinked clubs. Select a club and confirm. The club's linked status updates to "Linked". On the club detail page, the linked badge appears.
result: pass

### 10. Bot Join Event — Flex Message
expected: When the LINE bot is added to a group chat, it sends a Flex Message bubble to the group with a "Link to Club" button. The button URL contains the groupId parameter pointing to /clubs/link?groupId={groupId}.
result: pass

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Club create form includes home court/location field"
  status: failed
  reason: "User reported: home court/location missing in create form"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
