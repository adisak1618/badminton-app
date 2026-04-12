---
phase: 10-hybrid-liff-free-messaging
verified: 2026-04-12T00:00:00Z
status: human_needed
score: 11/12 must-haves verified
overrides_applied: 0
overrides:
  - must_have: "LiffProvider calls liff.login() in external browser when not logged in"
    reason: "Implementation uses /api/auth/login/line (NextAuth OAuth redirect) instead of liffInstance.login(). The outcome is identical — external browser users are redirected through LINE Login OAuth. The app-level OAuth route produces a persistent session (checked on re-entry to prevent infinite loop), which is a more robust approach than LIFF's own login() which would not create an app session. ROADMAP SC-1 intent (external browser works via LINE Login) is fully satisfied."
    accepted_by: ""
    accepted_at: ""
human_verification:
  - test: "External browser login flow"
    expected: "Opening /events/{id} in a regular browser redirects to LINE Login OAuth, returns to the page after auth, and the page loads with full functionality"
    why_human: "Cannot verify OAuth redirect chain and post-auth return programmatically"
  - test: "In-LINE register sends card as user message"
    expected: "Tapping Register from a Flex card in LINE app, registering, causes a new Flex card to appear in the group chat as the USER's message (not the bot's)"
    why_human: "Requires LINE app and live group chat — cannot verify programmatically"
  - test: "External browser register falls back to pushMessage"
    expected: "Registering from a regular browser causes the Flex card to appear in the LINE group as the BOT's message (server pushMessage fallback)"
    why_human: "Requires live LINE group and external browser session — cannot verify programmatically"
  - test: "301 redirects work in browser"
    expected: "Navigating to /liff/events/{id} returns HTTP 301 and browser lands on /events/{id}"
    why_human: "Redirect behavior confirmed in config but end-to-end browser validation is recommended"
  - test: "chat_message.write scope enabled"
    expected: "LINE Developers Console shows chat_message.write scope enabled on the LIFF app — required for sendMessages to work"
    why_human: "External configuration in LINE Developers Console — cannot inspect programmatically"
---

# Phase 10: Hybrid LIFF & Free Messaging Verification Report

**Phase Goal:** Refactor LIFF pages to work both inside LINE and in regular browsers, switch user-initiated actions from paid Messaging API pushMessage to free LIFF sendMessages/shareTargetPicker, and restructure URLs (remove /liff prefix)
**Verified:** 2026-04-12
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | LiffProvider detects external browser and redirects to LINE Login | PASSED (override) | Uses `/api/auth/login/line` OAuth instead of `liffInstance.login()`. Session pre-check prevents infinite loop. Same outcome: external browser users go through LINE Login. See override entry above. |
| 2 | LiffProvider does not infinite-loop after OAuth return | ✓ VERIFIED | Pre-flight `/api/auth/session` check at line 46 — if session exists, skips login redirect entirely |
| 3 | All LIFF pages exist under (liff) route group without Nav | ✓ VERIFIED | All 6 pages confirmed at `app/(liff)/...`; `(liff)/layout.tsx` contains no Nav import |
| 4 | Old /liff/* URLs 301-redirect to new clean paths | ✓ VERIFIED | 7 permanent redirects confirmed in `next.config.js` |
| 5 | LiffProvider wraps all pages from root layout | ✓ VERIFIED | `app/layout.tsx` imports and wraps children with `LiffProvider` |
| 6 | Old `app/liff/` directory removed | ✓ VERIFIED | Directory does not exist |
| 7 | Registration POST returns flexCard JSON in response body | ✓ VERIFIED | `registrations.ts` line 173: `{ id: regId, registeredCount, flexCard }` |
| 8 | Registration DELETE returns flexCard JSON in response body | ✓ VERIFIED | `registrations.ts` line 247: `{ registeredCount, flexCard }` |
| 9 | Server skips pushMessage when X-Liff-Context is not 'external' | ✓ VERIFIED | `registrations.ts`, `events.ts`, `event-templates.ts` all read `x-liff-context` header and conditionally skip push |
| 10 | Event creation POST returns flexCard JSON and skips pushMessage when in-LINE | ✓ VERIFIED | `events.ts` lines 113-160: conditional push with `responseFlexCard` in response |
| 11 | Register/cancel/create event inside LINE calls trySendMessages with flexCard | ✓ VERIFIED | `events/[id]/page.tsx` (3 handlers), `events/create/page.tsx`, `templates/[id]/edit/page.tsx` all import and call `trySendMessages` |
| 12 | sendMessages failure is silent (console.error only) | ✓ VERIFIED | `liff-messaging.ts` line 18: `console.error("sendMessages failed:", err)` in catch block |

**Score:** 11/12 truths verified (1 passed via override pending acceptance, 5 items need human verification)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/components/liff/liff-provider.tsx` | External browser login + context detection | ✓ VERIFIED | Contains `isInClient`, `!isInClient() && !isLoggedIn()` guard, session pre-check |
| `apps/web/app/(liff)/layout.tsx` | LIFF route group layout without Nav | ✓ VERIFIED | Exists, no Nav import |
| `apps/web/app/(liff)/events/[id]/page.tsx` | Event details page at new path | ✓ VERIFIED | Exists, contains trySendMessages (3 handlers) |
| `apps/web/app/(liff)/events/create/page.tsx` | Event creation with sendMessages | ✓ VERIFIED | Contains trySendMessages |
| `apps/web/app/(liff)/events/templates/[id]/edit/page.tsx` | Template edit with sendMessages | ✓ VERIFIED | Contains trySendMessages |
| `apps/web/app/(liff)/setup/page.tsx` | Setup page at clean path | ✓ VERIFIED | Exists |
| `apps/web/app/(liff)/profile/page.tsx` | Profile page at clean path | ✓ VERIFIED | Exists |
| `apps/web/next.config.js` | 301 redirects from /liff/* | ✓ VERIFIED | 7 permanent redirects present |
| `apps/api/src/routes/registrations.ts` | Registration routes with conditional pushMessage + flexCard | ✓ VERIFIED | POST and DELETE both read x-liff-context and return flexCard |
| `apps/api/src/lib/repost-card.ts` | buildFlexCardData function | ✓ VERIFIED | Exported at line 8 |
| `apps/api/src/routes/events.ts` | Event creation with conditional pushMessage | ✓ VERIFIED | Reads x-liff-context, returns flexCard |
| `apps/api/src/routes/event-templates.ts` | Template routes with conditional pushMessage | ✓ VERIFIED | Reads x-liff-context in create-now and cancel handlers |
| `apps/web/lib/liff-messaging.ts` | Shared sendMessages helper | ✓ VERIFIED | Exports `getLiffContextHeader` and `trySendMessages` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/app/layout.tsx` | `LiffProvider` | wraps children | ✓ WIRED | Line 21: `<LiffProvider liffId={env.NEXT_PUBLIC_LIFF_ID}>` |
| `apps/web/next.config.js` | `/events/:id` | redirects config | ✓ WIRED | `permanent: true` on all 7 entries |
| `apps/api/src/routes/registrations.ts` | `apps/api/src/lib/repost-card.ts` | buildFlexCardData call | ✓ WIRED | `buildFlexCardData` called in both POST and DELETE handlers |
| `apps/web/app/(liff)/events/[id]/page.tsx` | `liff.sendMessages` | trySendMessages helper | ✓ WIRED | Imported from `@/lib/liff-messaging`, called after register, cancel, admin remove |
| `apps/web/app/(liff)/events/[id]/page.tsx` | `/api/proxy` | X-Liff-Context header | ✓ WIRED | `getLiffContextHeader(liff)` spread into fetch headers |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `registrations.ts` POST response | `flexCard` | `buildFlexCardData` → DB query for club/event | Yes — DB-backed card | ✓ FLOWING |
| `events/[id]/page.tsx` | `data.flexCard` | API response from registrations route | Yes — from DB-backed build | ✓ FLOWING |
| `liff-messaging.ts` | `liff.getContext()` | LIFF SDK context | Yes — runtime LIFF context | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — core behaviors require LINE app session and live group chat; not testable without running services.

### Requirements Coverage

The plans declare requirement IDs `SC-1`, `SC-2`, `SC-3`, `SC-4`. These appear to be internal phase success criteria labels (not REQUIREMENTS.md IDs). The REQUIREMENTS.md traceability table does not map any requirements to Phase 10, and the ROADMAP.md shows `Requirements: TBD` for this phase. No REQUIREMENTS.md IDs were claimed by any plan — no orphaned requirements to report.

| Req ID | Plan | Description | Status |
|--------|------|-------------|--------|
| SC-1 | 10-01 | External browser login | ✓ SATISFIED (via override) |
| SC-2 | 10-02, 10-03 | sendMessages for user actions | ✓ SATISFIED |
| SC-3 | 10-02, 10-03 | Cron-only pushMessage | ✓ SATISFIED |
| SC-4 | 10-01 | Clean URL paths | ✓ SATISFIED |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODOs, stubs, placeholder returns, or hardcoded empty values found in phase files.

### Human Verification Required

#### 1. External Browser Login Flow

**Test:** Open `/events/{real-event-id}` in a regular browser (Chrome/Safari) without any existing session
**Expected:** Browser redirects to LINE Login OAuth, user authenticates, browser returns to the event page with full functionality
**Why human:** OAuth redirect chain and post-auth return cannot be verified programmatically

#### 2. In-LINE Register Sends Card as User Message

**Test:** Open a Flex card link in the LINE app, tap Register for an event
**Expected:** After registration, a new Flex card appears in the LINE group chat as YOUR message (not the bot's message)
**Why human:** Requires LINE app, live group chat, and chat_message.write scope to be enabled

#### 3. External Browser Register Falls Back to pushMessage

**Test:** Register for an event from a regular browser (after completing external browser login)
**Expected:** Flex card appears in the LINE group as the BOT's message (server-side pushMessage fallback)
**Why human:** Requires live LINE group and external browser authenticated session

#### 4. 301 Redirects Work End-to-End

**Test:** Navigate to `http://localhost:3000/liff/events/{any-id}` in a browser
**Expected:** HTTP 301 response, browser lands on `/events/{any-id}`
**Why human:** Redirect behavior is in config but browser-level validation catches any Next.js routing edge cases

#### 5. chat_message.write Scope

**Test:** Check LINE Developers Console for the LIFF app
**Expected:** `chat_message.write` scope is enabled — required for `liff.sendMessages()` to work
**Why human:** External configuration in LINE Developers Console, cannot inspect programmatically

### Override Pending Acceptance

The `liffInstance.login()` must-have was flagged as a deviation and documented in the `overrides:` frontmatter, but `accepted_by` and `accepted_at` are blank — a developer must review and sign off.

The implementation achieves the same outcome via `/api/auth/login/line` (NextAuth OAuth), which is arguably superior because it establishes a persistent app session (preventing re-login on page refresh) while `liffInstance.login()` would only set a LIFF token.

To accept: add your name and timestamp to the override entry in this file's frontmatter.

### Gaps Summary

No blocking gaps. All code artifacts exist, are substantive, and are correctly wired. The phase goal is implemented. Two items require resolution before the phase can be fully closed:

1. **Override sign-off needed** — The SC-1 deviation (using `/api/auth/login/line` instead of `liffInstance.login()`) needs developer acceptance
2. **Human verification** — 5 behavioral tests require live LINE environment testing

---

_Verified: 2026-04-12_
_Verifier: Claude (gsd-verifier)_
