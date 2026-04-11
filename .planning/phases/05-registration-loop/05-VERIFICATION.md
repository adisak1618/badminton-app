---
phase: 05-registration-loop
verified: 2026-04-11T00:00:00Z
status: human_needed
score: 6/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Admin close via LIFF — verify end-to-end in LINE app"
    expected: "Admin taps 'ปิดรับลงทะเบียน' button on LIFF registration page, event closes, Flex card reposts with closed state"
    why_human: "Full UI flow requires live LINE environment with LIFF and bot integration"
  - test: "Registration loop end-to-end"
    expected: "Member taps Register on Flex card in LINE, LIFF opens, member name appears in list, new Flex card reposts with updated count"
    why_human: "Requires live LINE group, active bot token, and Neon DB access"
  - test: "REG-04 close-via-bot-command interpretation"
    expected: "Confirm whether LIFF admin button (not a LINE chat text command) satisfies REG-04 and SC6 intent"
    why_human: "SC6 says 'via bot command' but implementation uses LIFF admin panel — needs owner/product decision"
gaps:
  - truth: "Admin can close registration early via bot command — subsequent registration attempts are rejected"
    status: partial
    reason: "The PATCH /events/:id/status API correctly rejects subsequent registrations when status=closed. However, SC6 and REG-04 specify 'via bot command' (LINE chat text command). No text-message webhook handler exists for a /close or equivalent command. The admin close action is only available via the LIFF registration page admin button."
    artifacts:
      - path: "apps/api/src/webhook/handlers/text-message.ts"
        issue: "No close/status command handling — file has no close or status logic"
    missing:
      - "Bot text-command handler for closing registration (e.g. /close or equivalent) in text-message.ts, OR product decision to accept LIFF admin button as satisfying REG-04"
---

# Phase 5: Registration Loop Verification Report

**Phase Goal:** Members can register for events inside Line, see who else is registered, cancel their own registration, and admins can manage the list — the core value is fully delivered
**Verified:** 2026-04-11
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Member taps Register on Flex card, LIFF opens, adds self with one tap, name appears immediately | VERIFIED | `page.tsx` calls POST `/api/proxy/registrations` on button tap; API returns 201 with id+registeredCount; fetchData() refreshes list |
| SC2 | LIFF registration page displays live current list of registered members | VERIFIED | GET `/api/registrations?eventId` returns `registrations[]` with `displayName` via JOIN; page renders numbered list |
| SC3 | Member can cancel own registration via LIFF | VERIFIED | `handleRegisterToggle` calls DELETE `/api/proxy/registrations/${currentMemberRegistrationId}`; API verifies `memberId === callerMember.id` |
| SC4 | Full event: Register button disabled + Full indicator. Admin close: same disabled state | VERIFIED | `isFull` and `isClosed` computed state; button `disabled={submitting \|\| (isFull && !isRegistered) \|\| isClosed}`; red badge rendered when `isFull && !isClosed` |
| SC5 | Admin can remove any member via LIFF admin panel | VERIFIED | `isAdmin` flag from API; (X) buttons rendered only for admins; `handleRemoveMember` calls DELETE; API checks `requireClubRole` for non-own deletions |
| SC6 | Admin can close registration early via bot command — subsequent attempts rejected | PARTIAL | API PATCH `/events/:id/status` correctly sets status=closed and blocks subsequent POST registrations (409 EVENT_CLOSED). But no LINE chat text command handler exists — close is only available via LIFF admin button, not a bot command. REG-04 specifies "via bot command". |
| SC7 | When registration changes, bot reposts new Flex card with updated count | VERIFIED | `repostFlexCard()` called after every mutation (POST, DELETE, PATCH status); builds card via `buildRepostFlexCard`; pushes via `lineClient.pushMessage`; updates `events.lineMessageId` |

**Score:** 6/7 truths verified (SC6 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/routes/registrations.ts` | Registration CRUD routes | VERIFIED | Exports `registrationRoutes`; GET/POST/DELETE implemented with all guard rails (23505, EVENT_CLOSED, EVENT_FULL, 403 non-admin) |
| `apps/api/src/lib/flex-messages.ts` | Extended with repost card builder | VERIFIED | Exports `buildRepostFlexCard`, `buildRepostAltText`; `RepostCardData` interface; `#ef4444` for full/closed; "เต็ม" suffix; "ปิดรับลงทะเบียนแล้ว" for closed; `buildEventFlexCard` unchanged |
| `apps/api/src/lib/repost-card.ts` | Shared repost helper | VERIFIED | Exports `repostFlexCard`; fetches club lineGroupId; builds LIFF URLs; calls pushMessage; updates lineMessageId; swallows errors (best-effort) |
| `apps/api/src/__tests__/registrations.test.ts` | Integration tests | VERIFIED | 474 lines; 4 describe blocks; 17 tests covering POST/GET/DELETE/PATCH including pushMessage spy, lineMessageId update, best-effort failure |
| `apps/web/app/liff/events/[id]/register/page.tsx` | LIFF registration page | VERIFIED | 293 lines; "use client"; useLiff; visibilitychange; all Thai copy; aria-label; X icon; min-h-[44px]; all fetch calls wired |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `registrations.ts` | `repost-card.ts` | `repostFlexCard` call | WIRED | Line 7 import; called after POST (line 131), DELETE (line 195) |
| `registrations.ts` | `line-client.ts` | via `repost-card.ts` | WIRED | `repost-card.ts` imports and calls `lineClient.pushMessage` |
| `index.ts` | `registrations.ts` | `.use(registrationRoutes)` | WIRED | Line 11 import; line 26 use — confirmed by grep |
| `events.ts` | `repost-card.ts` | `repostFlexCard` call for PATCH status | WIRED | Line 4 import in events.ts; called at line 190 |
| `page.tsx` | `/api/proxy/registrations` | fetch GET/POST/DELETE | WIRED | Lines 75, 114, 125, 155 |
| `page.tsx` | `/api/proxy/events` | fetch PATCH status | WIRED | Line 173: `fetch(\`/api/proxy/events/${eventId}/status\`)` |
| `proxy/[...path]/route.ts` | Elysia API | catch-all proxy forwarding | WIRED | Exports GET, POST, PUT, DELETE, PATCH — all methods handled |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `page.tsx` | `registrations`, `event`, `isAdmin` | GET `/api/proxy/registrations?eventId` | Yes — DB query via Drizzle JOIN in registrations.ts | FLOWING |
| `registrations.ts` GET | `regList` | Drizzle SELECT with innerJoin on members | Yes — real DB query | FLOWING |
| `registrations.ts` POST | Registration INSERT | Drizzle INSERT + re-count | Yes — real DB mutation | FLOWING |
| `repost-card.ts` | LINE push | `lineClient.pushMessage` | Yes — calls LINE Messaging API with card built from event data | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| registrations.ts exports registrationRoutes | `grep "export const registrationRoutes" apps/api/src/routes/registrations.ts` | Found at line 9 | PASS |
| repost-card.ts exports repostFlexCard | `grep "export async function repostFlexCard" apps/api/src/lib/repost-card.ts` | Found at line 7 | PASS |
| index.ts wires registrationRoutes | `grep "registrationRoutes" apps/api/src/index.ts` | Found at lines 11 and 26 | PASS |
| TypeScript compiles without errors | `npx tsc --noEmit --project apps/api/tsconfig.json` | Clean (no errors) | PASS |
| All 4 documented commits exist | `git log --oneline faebd29 c059dae 12ab5f0 bfb8601` | All found | PASS |
| PATCH /:id/status in events.ts | `grep "patch.*/:id/status"` | Found at line 157 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| REG-01 | 05-01, 05-02 | Member taps Register, LIFF opens, adds themselves | SATISFIED | POST /api/registrations + LIFF page register button |
| REG-02 | 05-01, 05-02 | Registration list visible in LIFF | SATISFIED | GET returns registrations[] with displayName; rendered in page |
| REG-03 | 05-01, 05-02 | Members can cancel own registration via LIFF | SATISFIED | DELETE with own registrationId + LIFF cancel button |
| REG-04 | 05-01 | Admin can close registration early via bot command | PARTIAL | PATCH /events/:id/status exists and works; LIFF admin button triggers it. No LINE chat text command (BOT-03 level) — "bot command" part not implemented |
| REG-05 | 05-01, 05-02 | Admin can remove any member via LIFF admin panel | SATISFIED | DELETE checks requireClubRole; LIFF shows (X) buttons to isAdmin users |
| BOT-02 | 05-01 | Bot updates Flex Message count when registrations change | SATISFIED | repostFlexCard called after every mutation; pushes updated card |
| BOT-04 | 05-01, 05-02 | Card shows Full state with disabled register button | SATISFIED | buildRepostFlexCard uses "secondary" style + red color when isFull; LIFF disables button and shows badge |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | — |

Anti-pattern scan on all key files found no TODO/FIXME/placeholder comments, no empty return implementations, no hardcoded empty arrays served to users. All state variables are populated from real API fetches.

### Human Verification Required

#### 1. Registration Loop End-to-End in LINE

**Test:** Create an event, tap "ลงทะเบียน" on the Flex Message card in a LINE group, verify the LIFF registration page loads with event info and the registration list.
**Expected:** Page loads, member can register with one tap, name appears in numbered list, a new Flex card reposts to the LINE group showing updated count.
**Why human:** Requires live LINE environment with bot token, LIFF endpoint, and Neon DB connectivity.

#### 2. Admin Close via LIFF

**Test:** As an admin, open the LIFF registration page, tap "ปิดรับลงทะเบียน".
**Expected:** Event status changes to closed, button changes to "เปิดรับลงทะเบียน", a Flex card reposts with "ปิดรับลงทะเบียนแล้ว" state. Subsequent registration attempts return 409 EVENT_CLOSED.
**Why human:** Requires live LINE + LIFF environment.

#### 3. REG-04 Bot-Command Interpretation — Product Decision Required

**Test:** Review whether SC6 "via bot command" and REG-04 "Admin can close registration early via bot command" require a LINE chat text command (e.g. `/close`) in addition to the LIFF admin button.
**Expected:** Either (a) confirm LIFF admin button satisfies the intent (and override SC6 partial), or (b) confirm a bot text command for close is needed and add it as a gap.
**Why human:** This is a product/scope decision — the technical implementation of admin close via LIFF is complete and functional. The question is whether the "bot command" phrasing was intended to mean LINE chat command or any admin action triggered from the LINE ecosystem.

### Gaps Summary

One partial gap identified: REG-04 and SC6 specify closing registration "via bot command." The PATCH /events/:id/status API endpoint is implemented and enforces the closed state correctly. The LIFF admin panel button triggers this endpoint. However, there is no LINE chat text-command handler (like `/close`) in the webhook text-message handler. Whether this constitutes a gap depends on product intent for "bot command."

If the product owner accepts LIFF admin button as satisfying REG-04, this gap can be overridden. If a LINE chat text command is required, it needs to be added to `apps/api/src/webhook/handlers/text-message.ts`.

All other requirements and success criteria are fully satisfied with real, substantive, wired implementations.

---

_Verified: 2026-04-11_
_Verifier: Claude (gsd-verifier)_
