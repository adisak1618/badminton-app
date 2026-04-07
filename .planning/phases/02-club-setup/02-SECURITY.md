---
status: secured
phase: 02-club-setup
threats_total: 23
threats_closed: 23
threats_open: 0
audited: 2026-04-07
---

## Threat Register

| ID | Category | Component | Disposition | Status | Evidence |
|----|----------|-----------|-------------|--------|----------|
| T-02-01 | Spoofing / OAuth CSRF | apps/web — login route | mitigate | CLOSED | `crypto.randomBytes(16)` generates state + nonce; state stored in session and validated in callback — `login/line/route.ts:12-13`, `callback/line/route.ts:12` |
| T-02-02 | Spoofing / ID token | apps/web — callback route | mitigate | CLOSED | ID token POSTed to `https://api.line.me/oauth2/v2.1/verify` before trusting profile claims — `callback/line/route.ts:36-48` |
| T-02-03 | Tampering / Session | apps/web — lib/session.ts | mitigate | CLOSED | `iron-session` AES-256-GCM encryption; password sourced from `SESSION_SECRET` env var — `session.ts:16-26` |
| T-02-04 | Info Disclosure / Session cookie | apps/web — lib/session.ts | mitigate | CLOSED | `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"` — `session.ts:20-23` |
| T-02-05 | Elevation / Unprotected routes | apps/web — middleware.ts | mitigate | CLOSED | `protectedPaths = ["/clubs"]`; middleware checks `session.isLoggedIn` and redirects to login if false — `middleware.ts:6,19-23`; matcher covers `/clubs/:path*` at line 30 |
| T-02-06 | DoS / Weak SESSION_SECRET | apps/web — lib/env.ts | mitigate | CLOSED | `SESSION_SECRET: z.string().min(32)` enforced at startup via `@t3-oss/env-nextjs` — `env.ts:9` |
| T-02-07 | Spoofing / API auth | apps/api — middleware/auth.ts | mitigate | CLOSED | `unsealData` called with `env.SESSION_SECRET`; rejects missing or invalid sessions with 401 — `auth.ts:19-25` |
| T-02-08 | Elevation / Role escalation | apps/api — routes/club-members.ts | mitigate | CLOSED | PUT role endpoint calls `requireClubRole(…, ["owner"])` (line 59); self-promotion blocked by `currentUser.id === params.memberId` check (line 62); body schema restricts values to `admin | member` only (line 98) |
| T-02-09 | Tampering / Club settings | apps/api — routes/clubs.ts | mitigate | CLOSED | PUT `/clubs/:id` calls `requireClubRole(…, ["owner", "admin"])` before any mutation — `clubs.ts:164` |
| T-02-10 | Info Disclosure / Club data | apps/api — routes/clubs.ts | mitigate | CLOSED | GET `/clubs` joins through `clubMembers` filtered by `member.id` (the authenticated user); GET `/clubs/:id` additionally checks membership — `clubs.ts:93-111`, `clubs.ts:136-143` |
| T-02-11 | Tampering / Group linking | apps/api — routes/club-link.ts | mitigate | CLOSED | POST `/clubs/link` calls `requireClubRole(body.clubId, member.id, ["owner"])` — `club-link.ts:22`; DELETE `/clubs/:id/link` also owner-only — `club-link.ts:65` |
| T-02-12 | DoS / Error leakage | apps/api — lib/error-handler.ts | mitigate | CLOSED | Global `.onError` handler: returns structured JSON for `ApiError` and `ValidationError`; catches all others and returns generic `INTERNAL_ERROR` without leaking stack traces — `error-handler.ts:5-31` |
| T-02-13 | Spoofing / Proxy header injection | apps/web — api/proxy/[...path]/route.ts | mitigate | CLOSED | Proxy constructs `headers` object explicitly with only `Content-Type` and `Cookie: badminton-session=<value>`; no forwarding of arbitrary client headers — `route.ts:14-19` |
| T-02-14 | Tampering / Form input | apps/web — components/club-form.tsx | mitigate | CLOSED | `zodResolver(clubSchema)` wired via `react-hook-form`; schema enforces `min(1)/max(255)` on name, `int().min(1)` on players, `int().min(0)` on fees — `club-form.tsx:11-17,39` |
| T-02-15 | Info Disclosure / Club list | apps/api — routes/clubs.ts | mitigate | CLOSED | Server-side enforcement: same as T-02-10; API only returns clubs where `clubMembers.memberId = member.id` — `clubs.ts:108` |
| T-02-16 | Elevation / Role UI | apps/web — components/member-list.tsx | mitigate | CLOSED | Actions column rendered only when `currentUserRole === "owner"` (lines 53, 78); non-owner members see no role-change controls — `member-list.tsx:53,78` |
| T-02-17 | Tampering / Link action | apps/api — routes/club-link.ts | mitigate | CLOSED | Server-side enforcement: same as T-02-11; `requireClubRole(…, ["owner"])` — `club-link.ts:22` |
| T-02-18 | Spoofing / Link page access | apps/web — clubs/link page | accept | CLOSED | Accepted: any authenticated user can navigate to `/clubs/link`; the actual linking operation requires the user to be an owner of the target club enforced by the API (T-02-11). No sensitive data is exposed by merely viewing the page. |
| T-02-19 | Spoofing / Webhook origin | apps/api — webhook/line.ts | mitigate | CLOSED | `validateSignature(rawBody, env.LINE_CHANNEL_SECRET, signature)` called before any event processing; returns 401 on failure — `line.ts:34-37`; idempotency via `processWithIdempotency(event.webhookEventId, …)` — `line.ts:8` |
| T-02-20 | Tampering / Join URL | apps/api — webhook/handlers/join.ts | mitigate | CLOSED | Setup URL built server-side: `` `${env.WEB_BASE_URL}/clubs/link?groupId=${groupId}` `` — `join.ts:13`; no client-controlled input in URL base |
| T-02-21 | Info Disclosure / groupId | apps/api — webhook/handlers/join.ts | accept | CLOSED | Accepted: LINE group IDs are LINE-internal opaque identifiers, not personally identifiable information; disclosure risk is negligible and consistent with LINE platform design. |
| T-02-22 | DoS / replyToken expiry | apps/api — webhook/handlers/join.ts | accept | CLOSED | Accepted: reply failures are caught in a try/catch; errors are logged as warnings and do not propagate or crash the service — `join.ts:62-68`. Graceful degradation is in place. |
| T-02-23 | Elevation / Link completion | apps/api — routes/club-link.ts | mitigate | CLOSED | POST `/clubs/link` enforces owner role server-side via `requireClubRole` — `club-link.ts:22`; same control as T-02-11 |

## Accepted Risks

- **T-02-18 — Spoofing / Link page access:** Anyone who is authenticated can load the `/clubs/link` page. The page itself exposes no sensitive data; it only submits a clubId + groupId to the API. The API enforces owner-only authorization on that operation (T-02-11 / T-02-23), so unauthenticated or non-owner access cannot complete the linking. Risk is accepted as negligible.

- **T-02-21 — Info Disclosure / groupId:** The LINE group ID is transmitted in the join event and embedded in the setup URL. LINE group IDs are opaque platform-internal identifiers with no PII content. They are routinely handled as non-sensitive by LINE's own SDK and documentation. Risk is accepted.

- **T-02-22 — DoS / replyToken expiry:** LINE reply tokens expire shortly after the event is issued. If the bot cannot reply in time (e.g., removed from group), the `replyMessage` call throws. The handler wraps this in `try/catch`, logs a warning, and continues — no unhandled rejection, no service crash, no retry loop. Graceful degradation is the intended behavior; risk is accepted.

## Audit Trail

### Security Audit 2026-04-07

| Metric | Count |
|--------|-------|
| Threats found | 23 |
| Closed | 23 |
| Open | 0 |
| Accepted risks reviewed | 3 |
| Unregistered flags | 0 |

**Auditor notes:**

- All 20 `mitigate` threats have code-level evidence in the cited files.
- T-02-08 has an additional defense beyond the plan: the Elysia body schema for the role endpoint (`t.Union([t.Literal("admin"), t.Literal("member")])`) prevents an owner from assigning the `owner` role to another member via the API, providing defense-in-depth against ownership transfer abuse.
- T-02-03 / T-02-04: `secure` cookie flag is `NODE_ENV === "production"` only, which is the standard Next.js pattern; acceptable for development parity.
- No implementation files were modified during this audit.
