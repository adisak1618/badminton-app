# Pitfalls Research

**Domain:** Line Messaging API bot + LIFF app for multi-tenant badminton club management
**Researched:** 2026-04-05
**Confidence:** HIGH (core Line API constraints from official docs) / MEDIUM (operational patterns from community)

---

## Critical Pitfalls

### Pitfall 1: userId Differs Across Providers — Cross-Channel Identity Breaks

**What goes wrong:**
The Messaging API channel and the LIFF/Line Login channel produce different `userId` values for the same physical user if they are registered under different providers. A member who registers via LIFF gets one `userId`; the bot webhook receives a different `userId` from group chat events. Member lookup fails silently — no error, just no record found — leading to phantom duplicate profiles or broken registration flows.

**Why it happens:**
Line scopes `userId` at the provider level, not the platform level. Developers create a Messaging API channel and a Line Login channel at separate times without checking they are under the same provider.

**How to avoid:**
Create both the Messaging API channel and the Line Login / LIFF channel inside the same provider in the Line Developers Console. Verify this at project setup before writing any identity-lookup code. Document the provider ID in environment config so it cannot drift.

**Warning signs:**
- A member can LIFF-register but the bot shows them as unregistered.
- `userId` values from webhook events and LIFF `liff.getProfile()` differ for the same test account.
- "User not found" errors after first registration attempt.

**Phase to address:** Phase 1 foundation — must be correct before any identity-dependent code is written.

---

### Pitfall 2: replyToken is Single-Use and Expires in 30 Seconds

**What goes wrong:**
Any async work done before calling the reply API — database writes, external HTTP calls, queue lookups — burns the 30-second window. The `replyToken` then returns an error, and the user receives no response. If the webhook handler is also the database writer, a slow cold start or DB query will reproduce this failure on every deployment.

**Why it happens:**
Developers treat the Line webhook endpoint like a synchronous request handler that can do heavy work before responding. The `replyToken` must be used before the processing is complete.

**How to avoid:**
Respond HTTP 200 to Line immediately, then process the event asynchronously. Use a queue, background job, or fire-and-forget pattern. For real-time feedback that must go back to the chat, use `push` or `multicast` APIs instead of `reply` after async work completes. Reserve `reply` only for lightweight, synchronous acknowledgements.

**Warning signs:**
- "Invalid reply token" errors in logs after the webhook handler works locally but fails in production.
- Webhook response times exceeding 1–2 seconds.
- Vercel cold-start logs showing >10s function init time.

**Phase to address:** Phase 1 — establish async webhook processing pattern before any feature uses reply.

---

### Pitfall 3: Webhook Redelivery Creates Duplicate Registrations

**What goes wrong:**
Line redelivers webhooks when the bot server does not respond with a 2xx status within the timeout window. A duplicate `join`, `message`, or LIFF-triggered `register` event fires a second time. Without deduplication, the same member is registered twice, the event count inflates, and race conditions in the "is full?" check cause overbooking.

**Why it happens:**
Developers assume webhook delivery is exactly-once. Line's own documentation states: "the same webhook event may be sent to your bot server more than once." Redelivery counts and intervals are not disclosed and can change without notice.

**How to avoid:**
Store `webhookEventId` in a database table with a unique constraint on first receipt. At the start of every event handler, insert the `webhookEventId`; if the insert fails with a unique violation, skip processing and return 200. For database-level registrations, wrap the "check slot + insert registration" in a single transaction with a unique constraint on `(eventId, userId)` to prevent concurrent duplicate registrations.

**Warning signs:**
- Duplicate rows in the registrations table sharing the same user and event.
- "Already registered" notifications to users who registered only once.
- Event player count exceeding `maxPlayers`.

**Phase to address:** Phase 1 — implement idempotency key table at the same time as the webhook handler.

---

### Pitfall 4: Flex Message Registration Card Cannot Be Edited After Sending

**What goes wrong:**
The project design calls for the bot to update the registration card (player count, "Full" state) after members register. The Line Messaging API has no endpoint to edit or update a message already sent to a chat. A new message must be posted, or the LIFF page must be the source of truth for live counts. Teams discover this after designing a "live-updating card" UX that is architecturally impossible.

**Why it happens:**
Developers familiar with chat platforms that support message editing (Slack, Discord) assume Line supports the same. Line Flex Messages are immutable once delivered.

**How to avoid:**
Design the Flex Message card as a snapshot, not a live view. The card shows count at the time of posting. Current count and registration list live in LIFF. The bot posts a new card when the event status changes meaningfully (e.g., event full, registration closed by admin), rather than trying to update in place. Alternatively, the LIFF "Register" button is the real source of truth and the card's counter is informational only.

**Warning signs:**
- Planning documents describe "update the card" as a feature requirement.
- API calls to `/v2/bot/message/{messageId}` failing with 404 (no such endpoint exists).

**Phase to address:** Phase 1 design — correct the UX assumption before building the registration flow.

---

### Pitfall 5: LIFF Functions Fail Outside the Line In-App Browser

**What goes wrong:**
`liff.sendMessages()`, `liff.closeWindow()`, and other LIFF-native methods are not available in external browsers (Chrome, Safari). If a user opens the LIFF URL directly from a desktop browser or shares the link outside of Line, the registration flow silently breaks. The page loads but tapping "Register" produces a 403 error or no action.

**Why it happens:**
Development and testing often happen inside the Line app where everything works. External browser cases are not tested. The LIFF SDK loads successfully in any browser but some methods are restricted to the Line in-app environment.

**How to avoid:**
Check `liff.isInClient()` on init. If false, display a clear message: "Please open this link inside Line." Do not call `liff.sendMessages()` without this guard. For the registration action itself, prefer a direct API call (HTTP POST to the backend) over `liff.sendMessages()` — the backend updates state and pushes a notification to the group, which works regardless of browser environment.

**Warning signs:**
- 403 errors with message "Not in LINE client" in LIFF SDK logs.
- Users reporting "Register button does nothing."
- The LIFF context type is `"external"` or `"none"`.

**Phase to address:** Phase 1 — add `isInClient()` guard in the LIFF bootstrap before building any registration UI.

---

### Pitfall 6: LIFF Init Must Complete Before URL Manipulation

**What goes wrong:**
React Router or Next.js routing runs before `liff.init()` resolves and strips or overwrites the `liff.*` query parameters that Line appends to the LIFF URL. This prevents the SDK from authenticating the user, resulting in an infinite redirect loop or a permanently unauthenticated state.

**Why it happens:**
Next.js App Router processes URL rewrites and client-side navigation eagerly. The `liff.init()` call is async and the page may already have re-rendered before it resolves.

**How to avoid:**
Call `liff.init()` as the very first thing in the LIFF entry component, before any routing or state management. Do not modify `window.location` or use `router.push()` until the `liff.init()` promise resolves. Upgrade LIFF SDK to v2.11.0 or later — it strips credentials from URLs after init, preventing credential leakage. Use `withLoginOnExternalBrowser: true` in the init config to handle external browser login automatically.

**Warning signs:**
- Infinite loop of Line login redirects.
- `liff.init()` resolves but `liff.getProfile()` returns null.
- `liff.*` params missing from URL when init runs.

**Phase to address:** Phase 1 — establish LIFF init pattern before building any page.

---

### Pitfall 7: Multi-Tenant Data Leakage via Missing Club Scope on Every Query

**What goes wrong:**
A query to look up an event, registration, or member forgets to include a `WHERE clubId = ?` clause. An admin from Club A can see or modify Club B's data. With multiple clubs sharing the same PostgreSQL tables, a single missing filter causes cross-tenant data exposure.

**Why it happens:**
Early prototyping uses simple queries without tenancy filters. As the codebase grows, some queries get the filter and others do not. There is no enforcement layer.

**How to avoid:**
Use PostgreSQL Row-Level Security (RLS) policies with a `clubId` session variable, OR wrap all data access in repository functions that mandate a `clubId` parameter — never accept bare table queries in business logic. Add an integration test that logs in as Club A admin and asserts that Club B events return empty/forbidden. Enable RLS from Phase 1 data model creation, not as a retrofit.

**Warning signs:**
- Admin sees events they did not create with no explanation.
- A query omits a JOIN or WHERE on `clubId`.
- Code review finds `db.event.findMany()` without tenant scoping.

**Phase to address:** Phase 1 data model — RLS or repository pattern enforced from the first migration.

---

### Pitfall 8: Line OA Free Plan's 300-Message Monthly Limit Breaks Push Notifications

**What goes wrong:**
The free LINE Official Account plan allows only 300 push messages per month (Thailand, as of August 2024). Each push to a group counts per recipient. A club with 20 members and 4 events per month = 80 messages per event notification alone. Multiple clubs on the free plan exhaust the quota quickly, silently dropping messages with no error surfaced to users.

**Why it happens:**
Developers budget on message objects, not recipients. One API call with a single Flex Message to a group of 20 counts as 20 messages consumed from the monthly quota.

**How to avoid:**
Use `reply` messages (free, quota-exempt) wherever possible — these are triggered by a user action in the chat. Reserve `push`/`broadcast` for proactive notifications only (e.g., posting the weekly event card). Design the Flex Message card to be posted once per event, not updated. Plan for club owners to upgrade to a paid OA plan for production use. Surface remaining quota in the admin panel.

**Warning signs:**
- Messages stop being delivered mid-month with no error in logs.
- Line API returns HTTP 429 or quota-exceeded error on push calls.
- High message volume clubs report missed notifications.

**Phase to address:** Phase 1 — document quota constraints in bot design; Phase 2 — add quota monitoring.

---

### Pitfall 9: Webhook Signature Verification Skipped "Temporarily"

**What goes wrong:**
The webhook endpoint processes any POST request without verifying the `X-Line-Signature` header. Any actor who discovers the endpoint URL can forge events — fake registrations, fake admin commands, bot spam.

**Why it happens:**
Developers skip signature verification during rapid prototyping and never return to it before going live.

**How to avoid:**
Implement signature verification on day one using the Line SDK's built-in middleware (`validateSignature` in line-bot-sdk-nodejs). Treat an unverified request as a 401 immediately. Never accept IP-allow-listing as a substitute — Line does not publish its IP ranges and they change without notice.

**Warning signs:**
- Webhook handler has no signature check code.
- `X-Line-Signature` header is logged but not validated.
- The endpoint is reachable from Postman without authentication.

**Phase to address:** Phase 1 — before deploying the first webhook handler publicly.

---

### Pitfall 10: Recurring Event Generation in UTC Without Asia/Bangkok Awareness

**What goes wrong:**
Cron jobs or scheduled functions configured in UTC fire at the wrong local time. A club's Wednesday 7 PM session gets its registration window opened at 7 AM or on Tuesday from the user's perspective. Daylight saving is not relevant for Thailand (UTC+7, no DST), but the offset must be explicit — UTC midnight Tuesday is Monday 5 PM Bangkok time.

**Why it happens:**
Vercel and most cloud cron services default to UTC. Developers store event times as UTC without a stored timezone and compute "opens 1 day before" in UTC arithmetic, which shifts the local time by 7 hours.

**How to avoid:**
Store all event datetimes in UTC in the database, but store the club's canonical timezone (`Asia/Bangkok`) alongside. Use a datetime library (date-fns-tz or Temporal API) to compute "registration opens" relative to the club's local time, then convert to UTC for scheduling. Never compute recurring schedules with raw UTC offsets — always use named timezone identifiers.

**Warning signs:**
- Scheduled jobs firing 7 hours off from intended local time.
- Event cards showing the wrong date for members.
- "Registration opened" push messages arriving at 2 AM.

**Phase to address:** Phase 1 recurring events — establish timezone handling convention before the first recurring event is generated.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode `clubId` in early queries | Faster prototype | Every query needs retrofit; multi-tenancy breaks | Never |
| Use long-lived channel access token | No rotation logic | Security risk; token exposed = full bot compromise | Never in production |
| Skip idempotency key table | Simpler schema | Duplicate registrations, overbooking, bad data | Never |
| Process business logic in webhook handler synchronously | Simpler code | replyToken expires, users get no response, cold starts cause failures | Only for <100ms operations with no external I/O |
| Single LIFF app URL for all clubs | One deployment | Cannot customize per-club entry points in Phase 2 | MVP only if LIFF URL carries clubId as query param |
| Store all event occurrences eagerly at creation | Simple queries | N×52 rows per recurring event; cancellation/override becomes complex | Never for more than ~12 occurrences forward |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Line Messaging API | Messaging API channel and LIFF channel under different providers | Create both under the same provider; verify before writing identity code |
| Line Messaging API | Using `reply` after async processing | Return HTTP 200 immediately; use `push` for async responses |
| Line Messaging API | Counting messages as API calls | Messages are counted per recipient; 1 push to 20 members = 20 toward quota |
| LIFF SDK | Calling `liff.init()` after router runs | Call `liff.init()` before any routing or state init in the entry component |
| LIFF SDK | Using `liff.sendMessages()` for registration | Use direct API POST to backend; `sendMessages` is for informational messages only and requires in-app browser |
| Line Login | Trusting the LIFF access token on the server without verification | Send the ID token to your backend and verify it with the Line API; never trust client-side userId directly |
| Vercel | Relying on default region (US East) for Thai user latency | Set Vercel deployment region to `hnd1` (Tokyo) for ~30ms vs ~200ms RTT to Thailand |
| PostgreSQL | Missing `clubId` in queries | Enforce via RLS policies or mandatory repository function parameter |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Eager generation of all recurring event occurrences | Slow event creation; large table from day one | Generate occurrences lazily (on-demand within a rolling window) | At 10+ clubs each with weekly events for a year: 500+ rows immediately |
| N+1 query on registration list in LIFF | LIFF load time >2s; DB connection exhaustion | JOIN users on registrations in a single query | 20+ registrations per event |
| Synchronous DB write in webhook handler before returning 200 | replyToken expiry; Line retries; duplicate processing | Queue the event, return 200 immediately | On any slow DB query or cold start |
| No caching on club config reads | Repeated DB hit on every webhook event | Cache club settings in memory or Redis for 5 minutes | At 50+ concurrent events firing webhooks |
| Vercel cold start on webhook endpoint | First request of the day times out; Line retries; duplicate processing | Use Vercel Pro Fluid Compute or keep-warm ping; move to Node.js edge runtime for <50ms boot | On free Hobby plan with any infrequent traffic pattern |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Skipping `X-Line-Signature` verification | Anyone can forge events: fake registrations, admin commands | Use SDK's `validateSignature` middleware on every webhook route |
| Trusting client-sent `userId` from LIFF | Attacker registers others or removes competing registrants | Always verify the Line ID token server-side via Line's verify endpoint |
| Missing club scope on admin endpoints | Admin of Club A modifies Club B data | Require `clubId` from JWT claims; never from request body for privilege-sensitive operations |
| Using long-lived channel access token | Leaked token = full bot control permanently | Use stateless or 30-day short-lived tokens; store in environment variables, not source code |
| Exposing LIFF redirect URL with `access_token=` to analytics | Token captured in analytics platform logs | Only fire page view events after `liff.init()` resolves (token is stripped from URL in SDK v2.11+) |
| No rate limiting on registration endpoint | A single user can spam-register all slots | Add per-user rate limit (e.g., 1 registration per event) enforced at DB constraint level |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Bot posts multiple messages to update registration state | Chat becomes noisy; members mute the group | Post one event card per event; show live state only in LIFF |
| LIFF opens to a blank loading screen with no feedback | Users tap "Register" again; double registration attempts | Show skeleton UI immediately; never wait for `liff.init()` before rendering any content |
| Registration closes silently when quota is full | Members who tried are confused — no confirmation | Show "You're on the waitlist" or "Event is full" inline in LIFF immediately on tap |
| Thai language not set as default | Thai users see English UI with no easy switch | Set `lang="th"` in HTML; use Thai locale for all date formatting (e.g., `th-TH` for `Intl.DateTimeFormat`) |
| LIFF window does not close after registration | User is left in the browser, confused about next step | Call `liff.closeWindow()` after successful registration (only works in Line in-app browser — guard with `isInClient()`) |
| Admin commands via raw bot messages with no confirmation | Mis-typed command closes registration with no undo | Confirm destructive admin actions with a quick-reply "Are you sure?" response before executing |

---

## "Looks Done But Isn't" Checklist

- [ ] **Webhook handler:** Looks like it processes events — verify that `X-Line-Signature` is validated on every request, not just in tests.
- [ ] **LIFF registration:** Looks like it registers users — verify that the userId is taken from a server-verified ID token, not from `liff.getProfile()` passed directly from the client.
- [ ] **Flex Message card:** Looks like it shows live count — verify there is no code path attempting to edit/update the sent message; the count shown is a snapshot.
- [ ] **Recurring events:** Looks like events are scheduled — verify that all datetime math uses `Asia/Bangkok` as the reference timezone, not UTC.
- [ ] **Multi-tenant queries:** Looks like data is scoped — verify that every query in the codebase that returns events, registrations, or members includes a `clubId` filter.
- [ ] **Channel access token:** Looks like the bot is authenticated — verify the token is a stateless or short-lived token stored in an environment variable, not a long-lived token committed to source code.
- [ ] **LIFF init:** Looks like the page loads — verify `liff.init()` is called before any routing and that the `isInClient()` check guards methods that require the Line browser.
- [ ] **Idempotency:** Looks like registrations are correct — verify that a duplicate webhook delivery does not create a second registration row.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong provider (userId mismatch) | HIGH | Re-create either the Messaging API or Login channel under the correct provider; all existing userId mappings become invalid and must be flushed; users must re-onboard |
| No idempotency — duplicate registrations in DB | MEDIUM | Write a cleanup migration to deduplicate; add unique constraint; add idempotency key table; audit all affected events manually |
| replyToken expired — silent failures in production | LOW | Add async queue; no data loss, only missed reply messages; existing pushes continue working |
| Flex Message "update" architecture designed in — needs redesign | MEDIUM | Replace "update card" calls with new-message posts; update LIFF to be the live-count source of truth; no data migration needed |
| Long-lived token compromised | HIGH | Revoke in Line Developers Console immediately; reissue stateless token; rotate all secrets in Vercel env; audit logs for abuse |
| Missing clubId scope discovered post-launch | HIGH | Audit all queries; add RLS; deploy patch; notify affected clubs; check audit logs for cross-tenant reads |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| userId cross-provider mismatch | Phase 1 setup (before any code) | Same `userId` returned by webhook and by LIFF `getProfile()` for same test user |
| replyToken expiry / async webhook | Phase 1 webhook handler | Webhook returns 200 in <500ms; business logic executes after response |
| Duplicate webhook processing | Phase 1 webhook handler | Replaying the same `webhookEventId` produces no new DB row |
| Flex Message immutability | Phase 1 UX design | No code path calls a message-update endpoint |
| LIFF external browser guard | Phase 1 LIFF bootstrap | `isInClient()` check present; graceful fallback message renders |
| LIFF init before routing | Phase 1 LIFF bootstrap | No routing occurs until `liff.init()` promise resolves |
| Multi-tenant data leakage | Phase 1 data model | Integration test: Club A admin cannot read Club B events |
| Line OA message quota | Phase 1 architecture | Push message count per event calculated and documented; reply used preferentially |
| Webhook signature skipped | Phase 1 webhook handler | Unauthenticated POST to webhook returns 401 |
| Timezone handling | Phase 1 recurring events | Cron fires at correct Bangkok local time; stored UTC converts to correct `th-TH` display |

---

## Sources

- [LINE Messaging API Development Guidelines](https://developers.line.biz/en/docs/messaging-api/development-guidelines/)
- [Receive messages (webhook)](https://developers.line.biz/en/docs/messaging-api/receiving-messages/)
- [Check webhook error causes and statistics](https://developers.line.biz/en/docs/messaging-api/check-webhook-error-statistics/)
- [LIFF Developing Apps](https://developers.line.biz/en/docs/liff/developing-liff-apps/)
- [LIFF v2 API reference](https://developers.line.biz/en/reference/liff/)
- [LIFF: differences between LIFF browser and external browser](https://developers.line.biz/en/docs/liff/differences-between-liff-browser-and-external-browser/)
- [Get user IDs](https://developers.line.biz/en/docs/messaging-api/getting-user-ids/)
- [Group chats and multi-person chats](https://developers.line.biz/en/docs/messaging-api/group-chats/)
- [Channel access tokens](https://developers.line.biz/en/docs/messaging-api/channel-access-tokens/)
- [LINE Messaging API Pricing](https://developers.line.biz/en/docs/messaging-api/pricing/)
- [Flex Message layout](https://developers.line.biz/en/docs/messaging-api/flex-message-layout/)
- [Building a Permission Binding System Between LINE Bot and In-House ERP (DEV Community)](https://dev.to/linou518/building-a-permission-binding-system-between-line-bot-and-in-house-erp-via-phone-number-matching-2j8o)
- [Webhook idempotency implementation (Hookdeck)](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)
- LINE OA Thailand package update August 2024 — confirmed 300 msg/month free tier

---
*Pitfalls research for: Line Messaging API + LIFF multi-tenant club management (ก๊วนแบดออนไลน์)*
*Researched: 2026-04-05*
