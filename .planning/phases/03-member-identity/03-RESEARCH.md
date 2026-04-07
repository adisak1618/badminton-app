# Phase 3: Member Identity - Research

**Researched:** 2026-04-07
**Domain:** LINE LIFF SDK + iron-session authentication + Next.js App Router LIFF pages
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `liff.getIDToken()` for authentication inside LINE. Send the ID token to a server-side API endpoint, verify via LINE's /verify endpoint, then set an iron-session cookie.
- **D-02:** Reuse the same `badminton-session` iron-session cookie from Phase 2. One session covers both web dashboard and LIFF pages. SessionData already has `lineUserId`, `memberId`, `displayName`.
- **D-03:** LIFF pages are LINE-only for v1. Normal browser access to LIFF routes deferred to v2 (WEB-03). Auth only via `liff.getIDToken()`, no browser fallback needed.
- **D-04:** Hard gate — first-time members MUST complete their profile before any other LIFF action. Redirect to profile setup if no member record exists for their `lineUserId`.
- **D-05:** Pre-fill display name from the LINE ID token's `name` claim. Member can change it.
- **D-06:** Required fields: display name, skill level (Beginner/Intermediate/Advanced/Competitive), years playing. All three required.
- **D-07:** Dedicated LIFF profile page at `/liff/profile` — standalone, not embedded in other flows.
- **D-08:** Immediate save on tap — no confirmation dialog. Toast notification confirms save.
- **D-09:** LIFF pages live under `apps/web` as Next.js routes at `/liff/*` prefix.
- **D-10:** LIFF endpoint URL registered in LINE Developers Console points to `{APP_URL}/liff`.

### Claude's Discretion

- LIFF SDK initialization pattern (wrapper hook/provider)
- How the profile gate check is implemented (middleware vs layout vs component-level redirect)
- API endpoint design for profile CRUD (`/api/liff/auth`, `/api/liff/profile`, etc.)
- Error handling for expired/invalid ID tokens

### Deferred Ideas (OUT OF SCOPE)

- Normal browser access to LIFF pages — v2 requirement (WEB-03)
- Inline profile view in registration flow — could add in Phase 5 if needed
- Profile picture upload — not in v1 requirements
- Rich menu setup for LINE bot — separate configuration task, not code
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEMB-01 | LIFF authenticates members via Line Login; access token verified server-side | LIFF SDK `liff.getIDToken()` + `POST /oauth2/v2.1/verify` endpoint pattern documented. ID token contains `sub` (LINE userId), `name`, `picture`. |
| MEMB-02 | First-time member completes one-time profile setup: display name, skill level, years playing | Members table schema already exists with all required columns. Profile gate pattern: check for `members` row by `lineUserId`, redirect if missing. |
| MEMB-03 | Member profile is global — tied to Line userId, carries across all clubs | Already enforced by schema: `members` table has no `club_id`; global keyed by `lineUserId`. |
| MEMB-04 | Members can update their profile anytime via LIFF | Dedicated `/liff/profile` page with PUT endpoint on API. Same form as setup, pre-filled with current values. |
</phase_requirements>

---

## Summary

Phase 3 builds the LIFF authentication layer and member profile system. The core challenge is the LIFF-specific auth flow: unlike the web OAuth flow (Phase 2), LIFF runs inside the LINE in-app browser (IAB), so there is no redirect-based OAuth. Instead, the LIFF SDK calls `liff.getIDToken()` which returns a pre-authenticated JWT directly — the user is already logged into LINE. The client sends this token to a Next.js API route, which verifies it with LINE's `/oauth2/v2.1/verify` endpoint (same endpoint as Phase 2), extracts the `sub` (userId) and `name`, then sets the `badminton-session` iron-session cookie.

The second challenge is the profile gate (MEMB-02). After auth, the server checks whether a `members` row exists for the `lineUserId`. If not, the session is set but the user is redirected to `/liff/setup` before reaching any other LIFF page. The gate is best implemented in the LIFF layout (a React Server Component) rather than Next.js middleware, because middleware cannot do database lookups. The layout reads the session, calls the API to check for a member record, and redirects if absent.

The standard LIFF SDK initialization pattern for Next.js App Router uses a React context provider (client component) with a `useLiff()` hook and dynamic import of `@line/liff` to avoid SSR `window is not defined` errors. The provider wraps `/liff/*` routes via a layout component.

**Primary recommendation:** Implement auth as a new `POST /api/liff/auth` endpoint (Elysia), profile CRUD as `GET/POST/PUT /api/liff/profile`, and the LIFF profile gate as a check inside the `/liff` layout server component. Use a LiffProvider context for client-side LIFF SDK access across all LIFF pages.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @line/liff | 2.28.0 | LIFF SDK for client-side LINE auth | Official LINE SDK; `liff.getIDToken()` is the only correct way to get a verifiable user token in LIFF [VERIFIED: npm registry] |
| iron-session | ^8 | Session cookie management | Already in use (Phase 2); `badminton-session` cookie reused per D-02 [VERIFIED: codebase] |
| react-hook-form | existing | Profile form validation | Already in use (club-form.tsx); same pattern applies [VERIFIED: codebase] |
| zod | existing | Schema validation for API input | Already in use [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @line/liff (pluggable) | 2.28.0 | Reduced bundle via tree-shaking | Only if bundle size becomes a concern; `@line/liff` standard build is fine for v1 [CITED: developers.line.biz/en/docs/liff/pluggable-sdk/] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LiffProvider context | `use-line-liff` npm package | npm package adds a dependency; rolling a ~40-line provider is simpler and project-owned |
| Layout-level profile gate | Next.js middleware | Middleware cannot query the DB or call the API with cookie forwarding; layout is correct level |
| Layout-level profile gate | Component-level redirect | Layout guarantees the gate runs for every `/liff/*` route; component-level is error-prone |

**Installation:**
```bash
pnpm add @line/liff --filter apps/web
```

**Version verification:** `@line/liff@2.28.0` confirmed as `latest` tag on 2026-04-07 [VERIFIED: npm registry].

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/app/liff/
├── layout.tsx           # Server component: reads session, checks member, gates profile setup
├── page.tsx             # Default LIFF landing / redirect
├── setup/
│   └── page.tsx         # First-time profile setup form (client component)
└── profile/
    └── page.tsx         # Edit existing profile (client component)

apps/web/components/liff/
├── liff-provider.tsx    # "use client" — LiffContext + useLiff hook
└── profile-form.tsx     # Shared form for both setup and edit

apps/web/app/api/auth/liff/
└── route.ts             # POST: verify ID token, set session, upsert member check

apps/api/src/routes/
├── liff-auth.ts         # POST /api/liff/auth — verify ID token + set session
└── liff-profile.ts      # GET/POST/PUT /api/liff/profile — member profile CRUD
```

### Pattern 1: LIFF SDK Provider + Hook

**What:** A React context provider (client component) initializes the LIFF SDK once via `useEffect` with dynamic import. A `useLiff()` hook exposes the initialized `liff` object and any init error.

**When to use:** Wrap the entire `/liff/*` route subtree in a layout; all LIFF client components call `useLiff()` rather than importing `@line/liff` directly.

**Example:**
```typescript
// Source: developers.line.biz/en/docs/liff/developing-liff-apps/ + verified pattern
// apps/web/components/liff/liff-provider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Liff } from "@line/liff";

interface LiffContextValue {
  liff: Liff | null;
  liffError: string | null;
}

const LiffContext = createContext<LiffContextValue>({ liff: null, liffError: null });

export function LiffProvider({ liffId, children }: { liffId: string; children: React.ReactNode }) {
  const [liff, setLiff] = useState<Liff | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);

  useEffect(() => {
    import("@line/liff")
      .then((mod) => mod.default)
      .then((liff) =>
        liff.init({ liffId }).then(() => setLiff(liff))
      )
      .catch((err) => setLiffError(err.toString()));
  }, [liffId]);

  return <LiffContext.Provider value={{ liff, liffError }}>{children}</LiffContext.Provider>;
}

export function useLiff() {
  return useContext(LiffContext);
}
```

### Pattern 2: LIFF Auth Flow (client triggers, server verifies)

**What:** On LIFF page load, the client calls `liff.getIDToken()` and POSTs it to a Next.js route handler. The route handler forwards to the Elysia API which verifies with LINE and sets the session.

**When to use:** First LIFF page load for any user — always verify; the API checks if session already exists and skips LINE verification if valid.

**Example:**
```typescript
// Client: apps/web/components/liff/liff-provider.tsx (useEffect after init)
const idToken = liff.getIDToken();
await fetch("/api/proxy/liff/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idToken }),
});

// Server: apps/api/src/routes/liff-auth.ts
// POST /api/liff/auth
const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    id_token: body.idToken,
    client_id: env.LINE_LOGIN_CHANNEL_ID,   // Same LINE Login channel as Phase 2
  }),
});
// verifyRes.json() returns: { sub, name, picture, ... }
// Then: upsert session cookie with iron-session sealData
```

### Pattern 3: Profile Gate in Layout (Server Component)

**What:** The `/liff/layout.tsx` is a React Server Component that reads the iron-session cookie, checks whether a `members` row exists for the `lineUserId`, and redirects to `/liff/setup` if not. The gate runs on every request to any `/liff/*` route.

**When to use:** Always — this is the correct level for a hard gate that must apply to all LIFF pages.

```typescript
// apps/web/app/liff/layout.tsx (Server Component)
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { apiClient } from "@/lib/api";

export default async function LiffLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  // Not authenticated via LIFF yet — the LIFF entry page will trigger auth
  if (!session.isLoggedIn || !session.lineUserId) {
    // Allow access to setup page even without full member record
    // The liff-entry page handles calling /api/liff/auth first
    return <>{children}</>;
  }

  // Check member record exists — redirect to setup if not
  if (!session.memberId) {
    // Only gate non-setup pages
    // (setup page sets memberId on completion)
    redirect("/liff/setup");
  }

  return <>{children}</>;
}
```

**Note on gate granularity:** The `memberId` check in `SessionData` is the lightweight gate signal — no DB call needed in layout. The auth endpoint sets `memberId` in the session when a member record exists (or leaves it unset when it does not). The setup endpoint sets `memberId` after creating the member record.

### Pattern 4: Profile Form (reuse club-form.tsx pattern)

**What:** React Hook Form + Zod schema + `valueAsNumber` for `yearsPlaying`. Select component for skillLevel using the enum values.

**Example:**
```typescript
const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(255),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "competitive"]),
  yearsPlaying: z.number().int().min(0),
});
```

### Anti-Patterns to Avoid

- **Trusting client-supplied userId:** Never accept `lineUserId` directly from the client body. Always extract from verified ID token on the server (D-01 requirement).
- **Top-level LIFF import:** `import liff from "@line/liff"` at module level causes `window is not defined` in Next.js SSR. Always use dynamic `import("@line/liff")` inside `useEffect`.
- **Middleware for profile gate:** Next.js middleware cannot call `fetch()` reliably with cookie forwarding to Elysia API; use the layout server component instead.
- **Calling `liff.getIDToken()` before `liff.init()` resolves:** Always await the `liff.init()` promise before calling any other LIFF API.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session encryption | Custom JWT or AES code | iron-session (already installed) | AES-256-GCM, already battle-tested in Phase 2 |
| ID token JWT parsing | Manual base64 decode + HMAC | LINE `/oauth2/v2.1/verify` endpoint | Server-side verify handles signature, expiry, issuer checks automatically |
| Form validation | Manual event handlers | react-hook-form + zodResolver | Already in codebase; handles dirty state, error display, async submission |
| Toast notifications | Custom DOM manipulation | sonner (already in packages/ui) | Already wired in app layout |

**Key insight:** The ID token verification endpoint is the security boundary. All user identity claims must flow through it; none should be trusted from the client payload.

---

## Common Pitfalls

### Pitfall 1: `window is not defined` during SSR

**What goes wrong:** Importing `@line/liff` at the module level in any file that Next.js renders server-side throws `window is not defined` and breaks the build or request.

**Why it happens:** The LIFF SDK accesses `window` at import time, not lazily.

**How to avoid:** Always use `import("@line/liff")` inside a `useEffect` (or use `next/dynamic` with `ssr: false`). The LiffProvider pattern handles this correctly.

**Warning signs:** Build error mentioning `window is not defined` in a LIFF-related file.

### Pitfall 2: `liff.getIDToken()` returns null

**What goes wrong:** `liff.getIDToken()` returns `null` when the LIFF app does not have the `openid` scope enabled in LINE Developers Console, or when called before `liff.init()` resolves.

**Why it happens:** The `openid` scope must be selected when registering the LIFF app on the LINE Login channel. Without it, no ID token is issued.

**How to avoid:** Verify `openid` scope is checked in LINE Developers Console → LIFF channel → LIFF app settings. Always await `liff.init()` before calling `liff.getIDToken()`.

**Warning signs:** `liff.getIDToken()` returns `null`; auth endpoint receives `null` token.

### Pitfall 3: Same-Site Cookie Issue in LIFF IAB (LINE In-App Browser)

**What goes wrong:** The `badminton-session` cookie is set with `sameSite: "lax"` in `session.ts`. When the LINE in-app browser (IAB) loads LIFF pages, it may behave as a cross-site context on some platforms (particularly iOS WebKit). Cookies with `SameSite=Lax` may not be sent on cross-site requests within the IAB.

**Why it happens:** LINE's in-app browser on iOS is WebKit-based and may enforce stricter cookie policies than Chrome-based Android IAB. The domain of the LIFF URL (`{APP_URL}/liff`) is different from `line.me`, creating a first-party vs embedded context ambiguity.

**How to avoid:** The cookie is set by the Next.js API route handler (`/app/api/auth/liff/route.ts`) in response to a same-origin POST from the LIFF page (same domain: `APP_URL`). This is a first-party, same-origin request, so `SameSite=Lax` should work correctly. The issue would only arise if cookies needed to be sent to a cross-origin API directly from the browser — which our proxy pattern avoids. Monitor on real devices if cookie issues emerge.

**Warning signs:** Session not persisting between LIFF page navigations; user appears unauthenticated on second LIFF page.

### Pitfall 4: LIFF ID vs LINE Login Channel ID

**What goes wrong:** Confusion between the LIFF app ID (`1234567890-AbcdEfgh` format) and the LINE Login channel ID (numeric, e.g. `1234567890`). These are different identifiers.

**Why it happens:** The LIFF ID is assigned per LIFF app registration (a concatenation of channel ID + random suffix). The LINE Login channel ID is used as `client_id` in the `/verify` endpoint.

**How to avoid:** The `client_id` parameter in the `/verify` call is the **LINE Login channel ID** (same as `LINE_LOGIN_CHANNEL_ID` already in `env.ts`). The LIFF ID is only used in `liff.init({ liffId })` on the client side and comes from `NEXT_PUBLIC_LIFF_ID` env var.

**Warning signs:** `/verify` returns `400` with `"invalid client_id"` error.

### Pitfall 5: Profile Gate Redirect Loop

**What goes wrong:** The layout redirects to `/liff/setup`, but `/liff/setup` is also under `/liff/layout.tsx`, triggering the gate again — infinite redirect.

**Why it happens:** Layout applies to all child routes including `/liff/setup/page.tsx`.

**How to avoid:** The gate logic must explicitly exclude `/liff/setup` from the redirect, or use a separate segment (e.g., `/liff/setup` outside the layout). Best solution: in the layout, only redirect if both conditions are true AND the current path is not `/liff/setup`. Or: check `session.memberId` (set by auth endpoint when member exists) rather than calling the DB, and allow the setup page to proceed with `isLoggedIn` only.

**Warning signs:** Infinite redirect loop when first-time member opens a LIFF URL.

---

## Code Examples

### Environment Variables Required (additions to `apps/web/lib/env.ts`)

```typescript
// Source: [ASSUMED] — based on existing env.ts pattern and LIFF requirements
NEXT_PUBLIC_LIFF_ID: z.string().min(1),  // Client-side: LIFF app ID for liff.init()
// LINE_LOGIN_CHANNEL_ID already exists — reused as client_id in /verify call
```

### LIFF ID Token Verification (Elysia route)

```typescript
// Source: developers.line.biz/en/docs/line-login/verify-id-token/ [CITED]
// apps/api/src/routes/liff-auth.ts
const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    id_token: body.idToken,
    client_id: env.LINE_LOGIN_CHANNEL_ID,
  }),
});
if (!verifyRes.ok) throw unauthorized("Invalid LIFF ID token");
const profile = await verifyRes.json();
// profile.sub = lineUserId, profile.name = display name, profile.picture = avatar URL
```

### Iron-Session Set in Elysia Route

```typescript
// Source: apps/api/src/middleware/auth.ts pattern [VERIFIED: codebase]
// The Elysia liff-auth route must seal and return the cookie directly
// (cannot use getIronSession in Elysia — use sealData + Set-Cookie header)
import { sealData } from "iron-session";
const sealed = await sealData(sessionData, { password: env.SESSION_SECRET });
// Return Set-Cookie header from Elysia response
```

**Note:** The existing `authMiddleware` uses `unsealData` for reading. For writing (setting) the session from Elysia, use `sealData` and set `Set-Cookie` header directly. [VERIFIED: existing clubs.test.ts uses `sealData` to create test cookies]

Alternatively, the LIFF auth route could live in `apps/web/app/api/auth/liff/route.ts` (Next.js route handler) rather than Elysia, following the same pattern as Phase 2's callback handler. This would allow using `getIronSession` to set the session, then calling the Elysia API for member DB operations. **This is the preferred approach** — consistent with D-09 (LIFF pages in apps/web) and avoids the sealData complexity in Elysia.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import liff from "@line/liff"` globally | Dynamic `import("@line/liff")` in `useEffect` | LIFF SDK v2 era | Prevents SSR crashes in Next.js |
| LIFF v1 (separate deployment) | LIFF pages in same Next.js app | LIFF v2 | Simpler deployment; same session [CITED: developers.line.biz/en/docs/liff/developing-liff-apps/] |

**Deprecated/outdated:**
- LIFF v1 (separate URL scheme): Replaced by LIFF v2 which supports full-page apps [CITED: LINE Developers docs]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `NEXT_PUBLIC_LIFF_ID` is the correct env var name convention for the LIFF app ID | Code Examples | Low — naming is arbitrary, just needs to match usage |
| A2 | The LINE Login channel ID (`LINE_LOGIN_CHANNEL_ID`) is the correct `client_id` for LIFF ID token verification via `/oauth2/v2.1/verify` | Code Examples, Pitfall 4 | HIGH — if wrong, token verification returns 400. Needs confirmation that the project's LIFF app is on the same LINE Login channel as Phase 2. |
| A3 | LIFF pages in LINE IAB behave as first-party (same origin) for cookie purposes, making `SameSite=Lax` sufficient | Pitfall 3 | Medium — if iOS IAB treats this as cross-site, cookies won't persist. Easy to test with real device. |
| A4 | The LIFF auth endpoint should be in `apps/web` (Next.js route handler) not `apps/api` (Elysia) to enable `getIronSession` for session writing | Code Examples | Low — both approaches work; layout recommendation avoids complexity |

---

## Open Questions

1. **Is the LIFF app registered on the same LINE Login channel as the web login?**
   - What we know: Phase 2 uses `LINE_LOGIN_CHANNEL_ID` for web OAuth. LIFF apps are added to a LINE Login channel.
   - What's unclear: Confirmed at config time — if they're on the same channel, `LINE_LOGIN_CHANNEL_ID` works for both. If different channels, a separate `LIFF_CHANNEL_ID` env var is needed.
   - Recommendation: Verify in LINE Developers Console before implementing. Most likely same channel per project convention.

2. **Where does the LIFF auth endpoint live — Next.js or Elysia?**
   - What we know: Phase 2 auth callbacks are in `apps/web/app/api/auth/`. LIFF needs to set the same iron-session cookie.
   - What's unclear: Whether to follow the web pattern (Next.js handler + `getIronSession`) or Elysia pattern (`sealData` + Set-Cookie header).
   - Recommendation: Use a Next.js route handler at `apps/web/app/api/auth/liff/route.ts` — mirrors Phase 2, reuses `getIronSession`, then calls Elysia API for DB operations.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @line/liff (npm) | LIFF client SDK | ✓ (install needed) | 2.28.0 | — |
| LINE Login channel | ID token verification | ✓ (assumed — Phase 2 uses it) | n/a | — |
| LINE Developers Console | LIFF app registration + LIFF ID | Manual step | n/a | — |
| Neon PostgreSQL | members table writes | ✓ (Phase 1) | n/a | — |
| Vercel | Deployment | ✓ (Phase 1+2) | n/a | — |

**Missing dependencies with no fallback:**
- LIFF app must be registered in LINE Developers Console to get a LIFF ID before `/liff` routes can be tested inside LINE. This is a manual configuration step, not a code step. Plan must include a Wave 0 task to note this dependency.

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built into Bun runtime) |
| Config file | none — `bun test` discovers `*.test.ts` automatically |
| Quick run command | `cd apps/api && bun test src/__tests__/liff-auth.test.ts` |
| Full suite command | `cd apps/api && bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEMB-01 | POST /api/liff/auth verifies ID token and sets session | integration | `cd apps/api && bun test src/__tests__/liff-auth.test.ts -t "auth"` | ❌ Wave 0 |
| MEMB-01 | POST /api/liff/auth rejects invalid/missing token | integration | `cd apps/api && bun test src/__tests__/liff-auth.test.ts -t "invalid token"` | ❌ Wave 0 |
| MEMB-02 | POST /api/liff/profile creates member record with all required fields | integration | `cd apps/api && bun test src/__tests__/liff-profile.test.ts -t "create"` | ❌ Wave 0 |
| MEMB-02 | Profile setup requires all 3 fields (display name, skill level, years playing) | integration | `cd apps/api && bun test src/__tests__/liff-profile.test.ts -t "validation"` | ❌ Wave 0 |
| MEMB-03 | GET /api/liff/profile returns same record regardless of club context | integration | `cd apps/api && bun test src/__tests__/liff-profile.test.ts -t "global"` | ❌ Wave 0 |
| MEMB-04 | PUT /api/liff/profile updates existing member record | integration | `cd apps/api && bun test src/__tests__/liff-profile.test.ts -t "update"` | ❌ Wave 0 |

**Note:** Tests that call `POST /oauth2/v2.1/verify` must mock the LINE API call (same pattern as how Phase 2 webhook tests mock Line SDK). The sealData helper used in clubs.test.ts can be reused to create authenticated LIFF sessions.

### Sampling Rate

- **Per task commit:** `cd apps/api && bun test src/__tests__/liff-auth.test.ts src/__tests__/liff-profile.test.ts`
- **Per wave merge:** `cd apps/api && bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/__tests__/liff-auth.test.ts` — covers MEMB-01
- [ ] `apps/api/src/__tests__/liff-profile.test.ts` — covers MEMB-02, MEMB-03, MEMB-04

*(Existing test infrastructure: bun:test framework in apps/api, sealData helper pattern in clubs.test.ts — no new framework install needed)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | LINE ID token verification via `/oauth2/v2.1/verify` — server-side only |
| V3 Session Management | yes | iron-session AES-256-GCM (already implemented in Phase 2) |
| V4 Access Control | yes | Profile gate: `memberId` must exist in session to access non-setup LIFF routes |
| V5 Input Validation | yes | zod schema for all profile form fields; API body validated in Elysia routes |
| V6 Cryptography | yes | iron-session for session sealing (no hand-rolled crypto) |

### Known Threat Patterns for LIFF + iron-session Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-supplied userId bypass | Spoofing | NEVER accept `lineUserId` from request body — extract only from verified ID token (D-01) |
| Replay of expired ID token | Tampering | LINE `/verify` endpoint checks `exp` claim — handled server-side |
| Session fixation | Spoofing | iron-session creates a fresh sealed session on each `session.save()` |
| Profile gate bypass (direct URL) | Elevation of Privilege | Gate in layout (server component) runs on every request; cannot be bypassed client-side |
| Cross-site request to LIFF auth endpoint | CSRF | Auth endpoint accepts the ID token in JSON body (not a GET); SameSite=Lax cookie prevents CSRF from external sites |

---

## Sources

### Primary (HIGH confidence)

- LINE Developers — Using user data in LIFF apps and servers: https://developers.line.biz/en/docs/liff/using-user-profile/
- LINE Developers — Verify ID token: https://developers.line.biz/en/docs/line-login/verify-id-token/
- LINE Developers — Developing a LIFF app: https://developers.line.biz/en/docs/liff/developing-liff-apps/
- npm registry — @line/liff@2.28.0 verified 2026-04-07 [VERIFIED: npm registry]
- Codebase — apps/api/src/middleware/auth.ts, apps/web/lib/session.ts, packages/db/src/schema/members.ts [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- Zenn article (2024) — LIFF SDK initialization pattern in Next.js App Router (template.tsx + context provider): https://zenn.dev/yu_ta_9/articles/d7ae415d776391
- WebSearch result — LIFF SDK dynamic import pattern to avoid SSR `window is not defined` errors: multiple sources confirm this pattern

### Tertiary (LOW confidence)

- Assumption A3 about LIFF IAB SameSite cookie behavior — no authoritative source found; needs real-device testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @line/liff version verified via npm; all other libraries already in codebase
- Architecture: HIGH — LIFF auth pattern confirmed via official LINE docs; layout gate pattern derived from established Next.js patterns
- Pitfalls: MEDIUM-HIGH — SSR pitfall and gate redirect loop are verified patterns; SameSite IAB behavior is LOW confidence (assumption A3)

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (LINE SDK stable; iron-session stable)
