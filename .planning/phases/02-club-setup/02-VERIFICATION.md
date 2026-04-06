---
phase: 02-club-setup
verified: 2026-04-06T12:00:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "An owner can create a club by entering name, home court/location, default shuttlecock fee, default court fee, and default max players — the club is saved and visible in their dashboard"
    status: partial
    reason: "homeCourtLocation field is absent from the ClubForm component, club creation page, and settings page. Users cannot enter the home court/location via the web UI. The API route accepts homeCourtLocation and the DB schema has the column, but the field is never submitted."
    artifacts:
      - path: "apps/web/components/club-form.tsx"
        issue: "clubSchema and form JSX only include name, defaultMaxPlayers, defaultShuttlecockFee, defaultCourtFee — homeCourtLocation field is missing"
      - path: "apps/web/app/clubs/create/page.tsx"
        issue: "Passes ClubForm data directly to POST /api/proxy/clubs — no homeCourtLocation in the submitted payload"
      - path: "apps/web/app/clubs/[id]/settings/page.tsx"
        issue: "ClubForm defaultValues do not include homeCourtLocation — field cannot be edited or viewed"
      - path: "apps/web/app/clubs/[id]/page.tsx"
        issue: "Club detail interface and display do not include homeCourtLocation"
    missing:
      - "Add homeCourtLocation: z.string().optional() to clubSchema in apps/web/components/club-form.tsx"
      - "Add homeCourtLocation Input field in ClubForm JSX"
      - "Add homeCourtLocation to ClubFormData type and defaultValues prop"
      - "Pass homeCourtLocation in create/settings page data submissions"
      - "Display homeCourtLocation in club detail page (apps/web/app/clubs/[id]/page.tsx)"
human_verification:
  - test: "Line Login OAuth flow end-to-end"
    expected: "Clicking login redirects to LINE authorization page, after approval callback sets iron-session cookie and redirects to /clubs"
    why_human: "Cannot programmatically test browser redirects, OAuth code exchange, and cookie setting across LINE's OAuth service"
  - test: "Bot join event Flex Message in LINE app"
    expected: "Adding the bot to a LINE group triggers a Flex Message bubble with a 'Link to Club' button pointing to /clubs/link?groupId=..."
    why_human: "Requires a real LINE channel with the bot deployed; cannot simulate actual LINE group join flow programmatically"
  - test: "Protected route middleware redirect"
    expected: "Accessing /clubs without a session redirects to /api/auth/login/line"
    why_human: "Requires running Next.js dev server and browser session state"
---

# Phase 02: Club Setup Verification Report

**Phase Goal:** Club owners can create clubs, manage members with roles, and link Line groups via the dashboard. Bot sends setup Flex Message on group join.
**Verified:** 2026-04-06T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Owner creates a club with name, home court/location, fees, max players | PARTIAL | API and DB support homeCourtLocation but ClubForm/create/settings pages omit the field entirely |
| SC2 | Bot join sends setup link; owner links group to club via web; lineGroupId set | VERIFIED | `handleJoinEvent` in join.ts sends Flex Message with `/clubs/link?groupId={groupId}`; club-link route sets lineGroupId (owner-only) |
| SC3 | Owner can promote member to Admin and demote Admin to member via dashboard | VERIFIED | `/clubs/[id]/members` page + `PUT /clubs/:id/members/:memberId/role` with owner-only enforcement |
| SC4 | Admin can access admin functions; plain Member cannot | VERIFIED | `requireClubRole(["owner","admin"])` guards club settings update; `requireClubRole(["owner"])` guards role changes and group linking |
| SC5 | Club default settings (fees, max players) pre-fill event creation form | VERIFIED* | Defaults stored in DB via API; editable via settings page; pre-fill for event form is Phase 4 scope |

*SC5: The Phase 2 responsibility is to store and expose defaults. The "pre-fill event creation form" is implemented in Phase 4 (EVNT-02 requirement). The defaults infrastructure is in place.

**Score:** 4/5 success criteria fully verified (SC1 partial — homeCourtLocation absent from UI)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/lib/session.ts` | iron-session config with SessionData and sessionOptions | VERIFIED | Exports `SessionData` interface and `sessionOptions` — used by middleware and callback route |
| `apps/web/lib/env.ts` | Type-safe env validation | VERIFIED | createEnv with LINE_LOGIN_CHANNEL_ID, SESSION_SECRET, API_BASE_URL |
| `apps/web/app/api/auth/login/line/route.ts` | Line Login OAuth initiation | VERIFIED | Redirects to `access.line.me/oauth2/v2.1/authorize` with CSRF state |
| `apps/web/app/api/auth/callback/line/route.ts` | OAuth callback with token exchange | VERIFIED | Calls `api.line.me/oauth2/v2.1/token`, sets iron-session cookie |
| `apps/web/middleware.ts` | Next.js middleware for /clubs/* protection | VERIFIED | getIronSession check, redirects to login if not authenticated |
| `apps/web/components/nav.tsx` | Nav with login/logout state | VERIFIED | Renders based on session.isLoggedIn |
| `apps/api/src/lib/errors.ts` | ApiError class and factories | VERIFIED | ApiError, notFound, forbidden, unauthorized exported |
| `apps/api/src/lib/error-handler.ts` | Elysia error handler plugin | VERIFIED | onError plugin catches ApiError, validation errors, unexpected errors |
| `apps/api/src/middleware/auth.ts` | Auth middleware using unsealData | VERIFIED | unsealData reads iron-session cookie, derives session object |
| `apps/api/src/routes/clubs.ts` | Club CRUD routes | VERIFIED | POST/GET list/GET by id/PUT all present with real DB queries |
| `apps/api/src/routes/club-members.ts` | Member routes with role management | VERIFIED | GET list, PUT role with owner-only enforcement |
| `apps/api/src/routes/club-link.ts` | Group linking route | VERIFIED | POST sets lineGroupId; DELETE unlinks; owner-only via requireClubRole |
| `apps/api/src/lib/require-club-role.ts` | Authorization helper | VERIFIED | requireClubRole queries DB, throws forbidden if role insufficient |
| `apps/web/lib/api.ts` | API client helper | VERIFIED | ApiClient class with get/post/put/delete, session cookie forwarding |
| `apps/web/app/clubs/page.tsx` | Club list page | VERIFIED | Calls apiClient.get("/api/clubs"), renders ClubCard list |
| `apps/web/app/clubs/create/page.tsx` | Club creation page | PARTIAL | Form works but missing homeCourtLocation field |
| `apps/web/app/clubs/[id]/settings/page.tsx` | Club settings edit page | PARTIAL | Edit form works but missing homeCourtLocation |
| `apps/web/app/clubs/[id]/members/page.tsx` | Member list with role management | VERIFIED | Fetches members via proxy, renders MemberList, handleRoleChange wired |
| `apps/web/app/clubs/link/page.tsx` | Group linking page | VERIFIED | Reads groupId from searchParams, lists owner's unlinked clubs, POSTs to /api/proxy/clubs/link |
| `apps/web/app/api/proxy/[...path]/route.ts` | Proxy route for client-side API calls | VERIFIED | Forwards GET/POST/PUT/DELETE with session cookie; not in plan but correctly established |
| `apps/api/src/webhook/handlers/join.ts` | Join event handler | VERIFIED | handleJoinEvent exports, sends Flex Message with /clubs/link?groupId URL via replyMessage |
| `apps/api/src/webhook/line.ts` | Updated webhook dispatcher | VERIFIED | Imports handleJoinEvent, dispatches via switch/case "join" |
| `apps/api/src/__tests__/join-event.test.ts` | Integration test for join event | VERIFIED | 123 lines, mocks LINE client, verifies Flex Message type/replyToken/setup URL |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/app/api/auth/callback/line/route.ts` | `apps/web/lib/session.ts` | sessionOptions | VERIFIED | `sessionOptions` imported and used |
| `apps/web/middleware.ts` | `apps/web/lib/session.ts` | getIronSession + sessionOptions | VERIFIED | Both imported and used for auth check |
| `apps/web/app/layout.tsx` | `apps/web/components/nav.tsx` | Nav | VERIFIED | Nav imported and rendered in layout |
| `apps/api/src/index.ts` | `apps/api/src/middleware/auth.ts` | authMiddleware | VERIFIED | .use(authMiddleware) in route group |
| `apps/api/src/index.ts` | `apps/api/src/routes/clubs.ts` | clubRoutes | VERIFIED | .use(clubRoutes) in index |
| `apps/api/src/routes/clubs.ts` | `apps/api/src/lib/require-club-role.ts` | requireClubRole | VERIFIED | Used for PUT /clubs/:id (owner/admin) |
| `apps/api/src/middleware/auth.ts` | `apps/api/src/env.ts` | SESSION_SECRET | VERIFIED | env.SESSION_SECRET used in unsealData |
| `apps/web/app/clubs/create/page.tsx` | API | /api/proxy/clubs | VERIFIED | fetch("/api/proxy/clubs", POST) — uses proxy, not apiClient import (alternate valid pattern) |
| `apps/web/app/clubs/[id]/members/page.tsx` | API | /api/proxy/clubs/:id/members | VERIFIED | fetch("/api/proxy/...") — uses proxy pattern |
| `apps/web/app/clubs/link/page.tsx` | API | /api/proxy/clubs/link | VERIFIED | fetch("/api/proxy/clubs/link", POST) — uses proxy pattern |
| `apps/api/src/webhook/line.ts` | `apps/api/src/webhook/handlers/join.ts` | handleJoinEvent | VERIFIED | import and case "join" dispatch confirmed |
| `apps/api/src/webhook/handlers/join.ts` | `apps/api/src/lib/line-client.ts` | lineClient | VERIFIED | lineClient.replyMessage called |
| `apps/api/src/webhook/handlers/join.ts` | `apps/api/src/env.ts` | env.WEB_BASE_URL | VERIFIED | env.WEB_BASE_URL used in URL construction |

**Note on Plan 03 key_links:** The plan specified `import { apiClient }` in create/members/link pages, but the implementation uses `fetch("/api/proxy/...")` directly. The proxy route (`apps/web/app/api/proxy/[...path]/route.ts`) properly handles session forwarding. Data flows correctly — this is a valid alternative implementation achieving the same goal.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `apps/web/app/clubs/page.tsx` | clubs (Club[]) | apiClient.get("/api/clubs") → GET /api/clubs → Drizzle clubMembers JOIN clubs query | Yes — DB query with lineUserId filter | FLOWING |
| `apps/web/app/clubs/link/page.tsx` | clubs (Club[]) | fetch("/api/proxy/clubs") → same GET /api/clubs | Yes — filters unlinked, owner-only clubs | FLOWING |
| `apps/web/app/clubs/[id]/members/page.tsx` | members (Member[]) | fetch("/api/proxy/clubs/:id/members") → Drizzle JOIN query | Yes — real DB query with club_id filter | FLOWING |
| `apps/api/src/routes/clubs.ts` | GET /api/clubs | Drizzle SELECT from clubMembers JOIN clubs WHERE lineUserId | Yes — multi-table JOIN with auth filter | FLOWING |
| `apps/api/src/routes/club-link.ts` | lineGroupId | UPDATE clubs SET line_group_id WHERE id | Yes — Drizzle update against DB | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| join.ts exports handleJoinEvent | grep -q "export async function handleJoinEvent" join.ts | Match found | PASS |
| webhook line.ts dispatches case "join" | grep -q 'case "join"' webhook/line.ts | Match found | PASS |
| club-link sets lineGroupId in DB | grep -q "lineGroupId: body.groupId" club-link.ts | Match found | PASS |
| requireClubRole throws forbidden for wrong role | grep -q "throw forbidden" require-club-role.ts | Match found | PASS |
| Integration test file size (non-stub) | wc -l join-event.test.ts → 123 lines | 123 lines | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLUB-01 | 02-01, 02-02, 02-03 | Club owner creates a club with name, home court/location, default fees, default max players | PARTIAL | API and DB support all fields; UI form missing homeCourtLocation |
| CLUB-02 | 02-04 | Owner adds bot to Line group; bot sends setup link; group linked to club | VERIFIED | handleJoinEvent sends Flex Message; POST /clubs/link sets lineGroupId |
| CLUB-03 | 02-01, 02-02, 02-03 | Owner role has full control — manage settings and promote/demote admins | VERIFIED | requireClubRole(["owner"]) guards role changes; promote/demote UI in members page |
| CLUB-04 | 02-02 | Admin role can create events, manage registrations, remove members | VERIFIED* | requireClubRole(["owner","admin"]) guards settings update; event/registration APIs are Phase 4/5 |
| CLUB-05 | 02-02, 02-03 | Per-club default settings pre-fill event creation fields | VERIFIED* | Defaults stored in DB, editable via settings page; pre-fill in event form is Phase 4 (EVNT-02) |

*CLUB-04: Phase 2 establishes the role infrastructure. Event creation and registration management APIs are Phase 4/5 scope.
*CLUB-05: Phase 2 establishes default settings storage. Pre-fill behavior in the event creation UI is Phase 4 work.

**Orphaned requirements check:** REQUIREMENTS.md maps CLUB-01 through CLUB-05 to Phase 2. All five are claimed in plan frontmatter. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/components/club-form.tsx` | 59 | `placeholder="e.g., Saturday Smashers"` | Info | HTML input placeholder — not a code stub, correct usage |
| `apps/api/src/routes/clubs.ts` | 89 | `if (!member) return []` | Info | Early return for unauthenticated/unknown user — correct defensive pattern, not a stub |

No blocker or warning anti-patterns found. Both flagged items are valid patterns.

### Human Verification Required

#### 1. Line Login OAuth Flow

**Test:** Open a browser, navigate to `/clubs` without a session, expect redirect to `/api/auth/login/line`, which redirects to LINE's authorization page. Complete authorization and verify cookie is set and user is redirected back to `/clubs`.
**Expected:** Session cookie `badminton-session` is set after callback; nav shows user's display name; `/clubs` renders the club list.
**Why human:** Browser redirects, LINE's OAuth server interaction, and iron-session cookie mechanics cannot be verified programmatically without a running server and LINE credentials.

#### 2. Bot Join Event Flex Message in LINE App

**Test:** Add the deployed bot to a LINE group. Observe the bot's response message in the group chat.
**Expected:** A Flex Message bubble appears with "Hello! I'm your badminton club bot." text and a "Link to Club" button. Tapping the button opens a browser to `{WEB_BASE_URL}/clubs/link?groupId={actual-group-id}`.
**Why human:** Requires a deployed API with a real LINE channel (LINE_CHANNEL_ACCESS_TOKEN), a real LINE group, and visual confirmation of the Flex Message rendering.

#### 3. Protected Route Redirect in Browser

**Test:** Open `/clubs` in a browser with no session cookie.
**Expected:** Middleware redirects to `/api/auth/login/line` which then redirects to LINE's OAuth page.
**Why human:** Requires a running Next.js dev server and browser session inspection.

### Gaps Summary

**1 gap blocking full goal achievement:**

**Gap: homeCourtLocation missing from club creation and settings UI (SC1 / CLUB-01)**

The Phase 2 Roadmap Success Criterion 1 explicitly states owners must enter "home court/location" when creating a club. The database schema (`home_court_location` varchar), the API route (accepts `homeCourtLocation` in body schema), and the `requireClubRole` infrastructure are all correctly implemented. However, the `ClubForm` component schema and JSX do not include a `homeCourtLocation` field, so:

- The create club form never submits homeCourtLocation (always undefined/null)
- The settings form cannot display or edit homeCourtLocation
- The club detail page does not display homeCourtLocation

This is a single root cause: `apps/web/components/club-form.tsx` needs the field added. The settings page and create page both inherit from ClubForm, so fixing the component fixes both pages. The club detail page (`apps/web/app/clubs/[id]/page.tsx`) also needs to be updated to display the field.

---

_Verified: 2026-04-06T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
