---
phase: 03-member-identity
audited_date: 2026-04-07
asvs_level: 1
auditor: gsd-security-auditor
result: SECURED
threats_closed: 12
threats_total: 12
---

# Phase 03 — Member Identity: Security Audit

## Summary

All 12 registered threats are CLOSED. No open mitigations. No unregistered flags.

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-03-01 | Spoofing | mitigate | CLOSED | `apps/web/app/api/auth/liff/route.ts:42` — `session.lineUserId = profile.sub`; no path from request body to lineUserId |
| T-03-02 | Tampering | mitigate | CLOSED | `apps/web/app/api/auth/liff/route.ts:24-35` — server-side `fetch("https://api.line.me/oauth2/v2.1/verify", ...)` with `client_id`; 401 on `!verifyRes.ok` |
| T-03-03 | Spoofing | mitigate | CLOSED | `apps/api/src/routes/liff-profile.ts:8` — `.use(authMiddleware)`; `apps/api/src/middleware/auth.ts:19-25` — unseals session, rejects if `!isLoggedIn \|\| !lineUserId` |
| T-03-04 | Tampering | mitigate | CLOSED | `apps/api/src/routes/liff-profile.ts:49-59` (POST) and `:89-103` (PUT) — Elysia `t.Object` with `t.String`, `t.Union([t.Literal(...)])`, `t.Integer` constraints |
| T-03-05 | Info Disclosure | mitigate | CLOSED | `apps/api/src/routes/liff-profile.ts:19-24, 42-46, 82-87` — all handlers return only `{ id, displayName, skillLevel, yearsPlaying }`; no `lineUserId` in any response |
| T-03-06 | Elevation of Privilege | mitigate | CLOSED | `apps/api/src/routes/liff-profile.ts:77` — PUT WHERE clause: `eq(members.lineUserId, session.lineUserId!)`; update is bound to session identity |
| T-03-07 | Replay | accept | CLOSED | See Accepted Risks below |
| T-03-08 | Spoofing | mitigate | CLOSED | `apps/web/app/liff/setup/page.tsx:41` — POST to `/api/proxy/liff/profile`; proxy forwards sealed session cookie; authMiddleware enforces identity |
| T-03-09 | Elevation of Privilege | mitigate | CLOSED | `apps/web/app/liff/profile/page.tsx:65-68` — PUT to `/api/proxy/liff/profile`; Elysia PUT enforces `session.lineUserId` match (T-03-06) |
| T-03-10 | Tampering | mitigate | CLOSED | `apps/web/components/liff/profile-form.tsx:18-27` — client Zod is UX only; Elysia `t.Object` in liff-profile.ts is the enforcement boundary (T-03-04) |
| T-03-11 | Info Disclosure | accept | CLOSED | See Accepted Risks below |
| T-03-12 | DoS/redirect loop | mitigate | CLOSED | `apps/web/app/liff/page.tsx:17-29` — profile gate is a client-side `fetch` in `useEffect`, not a layout redirect; `/liff/setup` has no auth gate and always renders |

## Accepted Risks

### T-03-07 — Replay Attack on /api/auth/liff

- **Category:** Replay
- **Component:** /api/auth/liff
- **Rationale:** LINE's `/oauth2/v2.1/verify` endpoint enforces the `exp` claim on ID tokens. Tokens have a short lifetime (~5 minutes). Any replayed token presented after expiry is rejected by LINE before our session is set. The replay window is bounded by LINE's token lifetime and is acceptable at ASVS Level 1.
- **Residual risk:** An attacker intercepting a fresh token could replay it within its validity window. This risk is accepted because: (1) LIFF tokens are delivered over HTTPS, (2) the same-origin auth endpoint is not externally guessable, and (3) LIFF SDK tokens are scoped to the app's LIFF ID.
- **Owner:** LINE platform (token expiry enforcement is transferred to LINE's /verify service)

### T-03-11 — Information Disclosure on LIFF Entry Page Error

- **Category:** Information Disclosure
- **Component:** /liff/setup entry page error card
- **Rationale:** The error display at `apps/web/app/liff/page.tsx:32-47` renders only the static strings "Unable to Sign In" and "Please close this page and open it again from LINE." No token value, session contents, internal error message, or stack trace is surfaced to the client. This is acceptable UX friction with no exploitable disclosure.
- **Residual risk:** None identified. Generic message provides no enumeration surface.

## Unregistered Threat Flags

None. Both 03-01-SUMMARY.md and 03-02-SUMMARY.md threat surface scans confirmed all new attack surface maps to registered threats (T-03-01 through T-03-12). No unregistered flags were raised.

## Trust Boundary Summary

| Boundary | Enforcement Mechanism | Status |
|----------|-----------------------|--------|
| LIFF client -> /api/auth/liff | LINE /oauth2/v2.1/verify with client_id; lineUserId from profile.sub only | Enforced |
| /api/auth/liff -> LINE /verify | Server-to-server HTTPS fetch; client_id verified | Enforced |
| Client -> /api/liff/profile | authMiddleware unseals iron-session cookie; rejects unauthenticated requests | Enforced |
| authMiddleware -> session cookie | iron-session seal/unseal with SESSION_SECRET (min 32 chars) | Enforced |
| ProfileForm -> /api/proxy/liff/profile | Elysia t.Object schema validation; session.lineUserId is authorization identity | Enforced |
