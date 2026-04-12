# Phase 10: Hybrid LIFF & Free Messaging - Research

**Researched:** 2026-04-12
**Domain:** LIFF v2 browser detection, sendMessages API, Next.js URL restructuring
**Confidence:** HIGH

## Summary

Phase 10 has three orthogonal workstreams: (1) make LiffProvider support external browser login via `liff.login()`, (2) switch user-initiated actions from server-side `pushMessage` to client-side `liff.sendMessages()`, and (3) restructure all LIFF page URLs by removing the `/liff` prefix.

All three workstreams are well-understood. The LIFF SDK provides `liff.isInClient()` for browser detection and `liff.getContext()` for chat context (group/external). The `sendMessages()` API requires `chat_message.write` scope and only works inside a LINE chat session. External browser users who complete `liff.login()` will have `getContext().type === "external"`, meaning `sendMessages()` is unavailable — server fallback to `pushMessage` is correct per D-03.

The main structural change is: registration and cancel API responses must return the Flex card JSON so the client can call `sendMessages()` when inside LINE. The server no longer calls `repostFlexCard()` for user-initiated actions inside LINE. URL restructuring is straightforward: move pages, update the existing `redirects()` config in `next.config.ts`, and update all hard-coded `/liff/*` paths in card builders.

**Primary recommendation:** Detect chat context with `liff.getContext().type` post-init; use `sendMessages()` for non-external contexts; fall back to server-side `pushMessage` for external context and cron.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** LiffProvider detects external browser (no LINE context) and calls `liff.login()` to redirect through LINE Login OAuth. After authorization, user is redirected back with tokens and has full access.
- **D-02:** External browser users get full functionality — register, cancel, create events. Not view-only.
- **D-03:** When a user performs an action from an external browser, server falls back to `pushMessage` for the repost card since `liff.sendMessages()` has no group chat context outside LINE. This costs money but keeps the group updated.
- **D-04:** User-initiated actions inside LINE use `liff.sendMessages()` to post the updated Flex card into the current chat. Free, no Messaging API cost.
- **D-05:** Cards sent via `liff.sendMessages()` appear as the user's message, not the bot's. Acceptable — old cards become stale but still link to the event page.
- **D-06:** Admin creating an event via LIFF uses `liff.sendMessages()` to post the initial Flex card (sent as the admin). Cron-generated events continue using server-side `pushMessage`.
- **D-07:** Server-side `pushMessage` is used ONLY for: (1) cron-generated recurring events, (2) external browser fallback when sendMessages is unavailable.
- **D-08:** Remove `/liff` prefix. New paths: `/events/[id]`, `/setup`, `/profile`, `/events/create`, `/events/templates`, `/events/templates/[id]/edit`.
- **D-09:** Old `/liff/*` URLs get 301 redirects to new paths. Historical Flex cards in group chats continue to work when tapped.
- **D-10:** Single LIFF ID with Endpoint URL set to root domain. All pages route via path. One `NEXT_PUBLIC_LIFF_ID` env var.
- **D-11:** LiffProvider wraps all app pages at root layout level. Every page gets LIFF context. Simpler than selective wrapping.

### Claude's Discretion

- 301 redirect implementation (Next.js middleware vs redirects config vs route handler)
- LiffProvider initialization optimization (lazy init for non-LIFF pages if needed)
- How to detect LINE vs external browser context for sendMessages vs pushMessage decision
- Whether to refactor the Flex card building to support both send channels (client JSON vs server push)
- Error handling when sendMessages fails (retry, fallback to pushMessage, or show error)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@line/liff` | already installed | LIFF SDK — init, login, sendMessages, isInClient, getContext | Official LINE SDK |
| Next.js `redirects()` | already installed | 301 redirects in `next.config.ts` | Declarative, no runtime cost |

No new packages to install. All required capabilities are in `@line/liff` (already a dependency) and Next.js (already used).

**Version verification:** `@line/liff` is already installed; version confirmed by existing codebase usage. [VERIFIED: codebase grep]

## Architecture Patterns

### Recommended Project Structure After Refactor

```
apps/web/app/
├── layout.tsx                    # LiffProvider moves here (root layout)
├── events/
│   ├── [id]/page.tsx             # Moved from liff/events/[id]/page.tsx
│   └── create/page.tsx           # Moved from liff/events/create/page.tsx
│   └── templates/
│       ├── page.tsx
│       └── [id]/edit/page.tsx
├── setup/page.tsx                # Moved from liff/setup/page.tsx
├── profile/page.tsx              # Moved from liff/profile/page.tsx
└── liff/                         # DELETED after redirects are in place
```

### Pattern 1: Browser Detection in LiffProvider

**What:** After `liff.init()`, call `liff.isInClient()` (or check `liff.getContext().type`) to detect external browser and redirect to LINE Login.

**When to use:** In the `useEffect` inside LiffProvider, immediately after init resolves.

```typescript
// Source: LIFF v2 API reference — liff.isInClient(), liff.login()
liffInstance.init({ liffId }).then(() => {
  if (!liffInstance.isInClient()) {
    // External browser — trigger LINE Login OAuth redirect
    if (!liffInstance.isLoggedIn()) {
      liffInstance.login({ redirectUri: window.location.href });
      return; // login() triggers redirect; nothing more to do
    }
  }
  // Proceed with ID token auth (existing flow)
  const idToken = liffInstance.getIDToken();
  // ...
});
```

**Key facts:** [VERIFIED: developers.line.biz/en/reference/liff]
- `liff.login()` is a no-op inside the LIFF browser (automatically called during init)
- `liff.isLoggedIn()` returns false in external browser before login
- After login redirect returns, `liff.init()` runs again and `liff.isLoggedIn()` is true

### Pattern 2: Context-Aware sendMessages vs pushMessage

**What:** After init, read `liff.getContext().type` to determine the chat context. If `"group"`, `"room"`, or `"utou"`, use `sendMessages()`. If `"external"` or `"none"`, signal server to use `pushMessage` fallback.

**getContext().type values:** [VERIFIED: developers.line.biz/en/reference/liff]
- `"utou"` — one-on-one chat
- `"group"` — group chat (typical use case for this app)
- `"room"` — multi-person chat (deprecated by LINE but may still exist)
- `"external"` — opened in external browser (no chat context)
- `"none"` — other LINE screens (Wallet, etc.)

**Implementation approach — two options:**

**Option A: Client sends card JSON via sendMessages (recommended)**
1. Client calls registration/cancel API normally
2. API responds with the updated Flex card JSON in the response body (new field: `flexCard`)
3. Client calls `liff.sendMessages([flexCard])` — card appears in chat as user's message
4. Server skips `repostFlexCard()` for user-initiated in-LINE actions

**Option B: Signal header**
Client sends `X-LINE-Context: external` header when in external browser; server calls `repostFlexCard()` accordingly.

Option A is recommended: the server builds the card once, returns it, client decides whether to send. Server logic stays pure — it never calls `pushMessage` for user actions except when a flag is passed.

**Concrete API response shape to add:**
```typescript
// POST /registrations response (new)
{
  registrationId: string,
  registeredCount: number,
  flexCard: FlexMessage | null  // null when caller is external browser
}

// DELETE /registrations/:id response (new)
{
  registeredCount: number,
  flexCard: FlexMessage | null
}
```

When `flexCard` is non-null, client calls `liff.sendMessages([flexCard])`. When null (or `sendMessages` throws), server already handled `pushMessage`.

### Pattern 3: sendMessages() Usage

```typescript
// Source: LIFF v2 API reference — liff.sendMessages()
const context = liff.getContext();
const isInChat = ["group", "room", "utou"].includes(context?.type ?? "");

if (isInChat && flexCard) {
  try {
    await liff.sendMessages([flexCard]);
  } catch (err) {
    // sendMessages failed — show toast; server already has pushMessage fallback
    console.error("sendMessages failed:", err);
  }
}
```

**Constraint:** `sendMessages()` requires the `chat_message.write` scope enabled on the LIFF app in LINE Developers Console. [VERIFIED: developers.line.biz/en/reference/liff/#send-messages]

**Max messages per call:** 5. We send 1 card — no issue. [VERIFIED: developers.line.biz/en/reference/liff/#send-messages]

### Pattern 4: URL Restructuring with 301 Redirects

**What:** Next.js `redirects()` in `next.config.ts` handles 301s declaratively.

**Current state:** One redirect already exists in `next.config.ts` (`/liff/events/:id/register` → `/liff/events/:id`). Replace all `/liff/*` redirects with new ones pointing to clean paths.

```typescript
// next.config.ts
async redirects() {
  return [
    { source: "/liff/events/:id", destination: "/events/:id", permanent: true },
    { source: "/liff/events/:id/register", destination: "/events/:id", permanent: true },
    { source: "/liff/events/create", destination: "/events/create", permanent: true },
    { source: "/liff/events/templates", destination: "/events/templates", permanent: true },
    { source: "/liff/events/templates/:id/edit", destination: "/events/templates/:id/edit", permanent: true },
    { source: "/liff/setup", destination: "/setup", permanent: true },
    { source: "/liff/profile", destination: "/profile", permanent: true },
  ];
}
```

`permanent: true` produces HTTP 301. [ASSUMED — Next.js redirects config; behavior consistent with documentation]

### Pattern 5: LiffProvider in Root Layout

Move `LiffProvider` from `/liff/layout.tsx` to the root `apps/web/app/layout.tsx`. The `Nav` component currently renders on all pages. Two options:

**Option A (recommended):** Add `LiffProvider` alongside `Nav` in root layout. `Nav` remains on non-LIFF pages. `LiffProvider` does nothing harmful on non-LIFF pages because init is lazy (inside `useEffect`).

**Option B:** Create a new intermediate layout for LIFF pages without `Nav`. Requires restructuring under `app/(liff)/` route group.

Option A is simpler given D-11 says "every page gets LIFF context." The `Nav` component on event/profile/setup pages can be conditionally hidden if needed.

### Anti-Patterns to Avoid

- **Calling `liff.login()` inside LIFF browser:** `liff.login()` is ignored inside LINE app (LIFF browser already handles auth in `liff.init()`). Only call it when `!liff.isInClient()` and `!liff.isLoggedIn()`. [VERIFIED: LIFF docs]
- **Relying on `getContext()` before init:** `liff.getContext()` returns undefined before `liff.init()` resolves. Always access context after init.
- **Building Flex card JSON on the client:** Keep card builders in `apps/api/src/lib/flex-messages.ts`. Return the built JSON from API responses; don't duplicate card-building logic on the client.
- **Hardcoding `/liff/*` paths in card builders:** `repost-card.ts` currently builds `liffBase + "/events/" + event.id`. After D-08, the LIFF URL is still `https://liff.line.me/{liffId}/events/{id}` — not the web URL. This is correct and doesn't change. LIFF routing appends the path to the Endpoint URL (root domain), so `/events/{id}` routes correctly. No changes needed to LIFF URL construction in card builders.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| External browser detection | Custom UA parsing | `liff.isInClient()` | Official API; UA parsing is fragile |
| Auth redirect loop detection | Custom state tracking | `liff.isLoggedIn()` after `liff.init()` | SDK tracks login state post-redirect |
| Chat context detection | `window.location` heuristics | `liff.getContext().type` | SDK returns authoritative context from LINE platform |

## Common Pitfalls

### Pitfall 1: `liff.login()` Infinite Redirect Loop
**What goes wrong:** If `liff.login()` is called without checking `isLoggedIn()` first, returning from LINE Login OAuth re-triggers the `useEffect` which calls `login()` again.
**Why it happens:** After LINE OAuth redirect back, `liff.init()` runs again. If the guard checks `isInClient()` only (not `isLoggedIn()`), it calls `login()` every time.
**How to avoid:** Guard with `if (!liff.isInClient() && !liff.isLoggedIn()) { liff.login(...) }`. After OAuth return, `liff.isLoggedIn()` is `true` and the loop is broken.
**Warning signs:** Browser loops between app URL and LINE Login page.

### Pitfall 2: `sendMessages()` Requires `chat_message.write` Scope
**What goes wrong:** `sendMessages()` throws `FORBIDDEN` or `403` error even when called inside LINE.
**Why it happens:** The LIFF app in LINE Developers Console doesn't have `chat_message.write` scope enabled.
**How to avoid:** Verify scope is enabled in the LINE Developers Console before testing. This is a console setting, not a code change.
**Warning signs:** `liff.sendMessages()` rejects with `LiffError` code `FORBIDDEN`.

### Pitfall 3: Hardcoded `/liff/setup` Path in LiffProvider
**What goes wrong:** After URL restructuring, the redirect to `/liff/setup?returnTo=...` in LiffProvider (line 58) hits the old path, which 301s to `/setup` and loses the `returnTo` param.
**Why it happens:** The redirect drops query params unless explicitly configured.
**How to avoid:** Update the hardcoded path in LiffProvider from `/liff/setup` to `/setup` as part of this phase. Also add a `:path*` or `?*` variant to the redirects config to pass query params.
**Warning signs:** First-time users get redirected to `/setup` without `returnTo`, then land on homepage after profile creation.

### Pitfall 4: `sendMessages()` in Wrong Context (External Browser)
**What goes wrong:** `liff.sendMessages()` is called when `getContext().type === "external"` — it throws because there's no chat context.
**Why it happens:** Forgot to check context type before calling `sendMessages()`.
**How to avoid:** Always check `["group", "room", "utou"].includes(context?.type)` before calling `sendMessages()`.

### Pitfall 5: LIFF URL vs Web URL Confusion in Card Builders
**What goes wrong:** Card buttons point to the web URL (`https://yourdomain.com/events/123`) instead of the LIFF URL (`https://liff.line.me/{liffId}/events/123`).
**Why it happens:** Confusing D-08 (web app paths) with LIFF deep link URLs.
**How to avoid:** Card builders in `repost-card.ts` and `events.ts` already build `liffBase + "/events/" + id`. This stays unchanged — LIFF routing handles the path concatenation correctly. Only the web app file paths change.

## Code Examples

### LiffProvider External Browser Support

```typescript
// Source: LIFF API reference + existing liff-provider.tsx pattern
useEffect(() => {
  import("@line/liff")
    .then((mod) => mod.default)
    .then((liffInstance) =>
      liffInstance.init({ liffId }).then(() => {
        setLiff(liffInstance);

        // External browser: trigger LINE Login OAuth if not yet logged in
        if (!liffInstance.isInClient() && !liffInstance.isLoggedIn()) {
          liffInstance.login({ redirectUri: window.location.href });
          return; // redirect imminent; skip further processing
        }

        const idToken = liffInstance.getIDToken();
        if (idToken) {
          fetch("/api/auth/liff", { ... })
            .then(/* existing flow, but update /liff/setup path to /setup */);
        } else {
          // Should not happen after successful login; show error
          setLiffError("Could not get ID token.");
          setIsReady(true);
        }
      })
    )
    .catch((err: unknown) => {
      setLiffError(String(err));
      setIsReady(true);
    });
}, [liffId]);
```

### Client-side sendMessages After Registration

```typescript
// Source: LIFF API reference + existing handleRegisterToggle pattern
const { liff } = useLiff();

async function handleRegister() {
  const res = await fetch("/api/proxy/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId }),
  });
  if (res.status === 201) {
    const data = await res.json(); // { registrationId, registeredCount, flexCard }
    toast.success("ลงทะเบียนสำเร็จ");

    // Send Flex card update into the LINE chat (free, appears as user's message)
    const context = liff?.getContext();
    const isInChat = ["group", "room", "utou"].includes(context?.type ?? "");
    if (isInChat && data.flexCard && liff) {
      try {
        await liff.sendMessages([data.flexCard]);
      } catch (err) {
        // sendMessages failed — log but don't block UX; server fallback handles group update
        console.error("sendMessages failed:", err);
      }
    }

    await fetchData();
  }
}
```

### Determining Whether Server Should pushMessage

```typescript
// apps/api/src/routes/registrations.ts — new parameter approach
// Client passes isInLineContext: boolean in request body or header
// When false (external browser), server calls repostFlexCard(); when true, server returns flexCard JSON only

// OR: server always returns flexCard JSON; server always skips pushMessage for user-initiated routes
// Client calls sendMessages if in chat; server calls pushMessage only for cron
```

The cleanest approach: **server never calls `repostFlexCard()` for user-initiated routes**; instead it returns `flexCard` in the response. For external browser users (no sendMessages), client detects external context and POSTs a separate `/api/proxy/events/:id/notify` endpoint that triggers server-side `pushMessage`. This separates concerns cleanly.

Alternatively (simpler): **client sends `X-Liff-Context: external`** header when `getContext().type === "external"`; server calls `repostFlexCard()` only when that header is present.

**Recommendation (Claude's discretion):** Use the header approach — simpler, no extra endpoint, no API shape changes to existing response structures.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LIFF pages under `/liff/*` | Pages at root paths, LIFF routes via path concatenation | Phase 10 | Cleaner URLs, works in external browser |
| Server pushMessage for all user actions | Client sendMessages for in-LINE actions | Phase 10 | Free quota for user-driven updates |
| LiffProvider only on `/liff/*` subtree | LiffProvider at root layout | Phase 10 | Every page has LIFF context without per-layout wrapping |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `permanent: true` in Next.js `redirects()` produces HTTP 301 | Architecture Patterns — Pattern 4 | Would need to verify Next.js docs; likely MEDIUM risk — permanent/temporary is well-documented behavior |
| A2 | `liff.login()` called from external browser redirects and returns to `redirectUri` with valid tokens on return | Pattern 1 | Low risk — this is the standard OAuth flow; LIFF docs confirm it |

## Open Questions

1. **`chat_message.write` scope on current LIFF app**
   - What we know: The scope must be enabled in LINE Developers Console for `sendMessages()` to work
   - What's unclear: Whether the existing LIFF app already has this scope enabled
   - Recommendation: Verify in LINE Developers Console before planning test tasks; if not enabled, add a task to enable it (no code change needed)

2. **Nav bar on new LIFF pages**
   - What we know: Root layout has `<Nav />` which renders a navigation bar. LIFF pages previously had their own layout without Nav.
   - What's unclear: Whether Nav should render on `/events/[id]`, `/setup`, `/profile` pages
   - Recommendation: Planner should decide — either hide Nav on these routes (route group `(liff)`) or accept Nav appearing on LIFF pages. Simple approach: use a route group `(liff)/` for pages that need LIFF-only layout (no Nav), keep root layout with Nav for marketing/admin pages.

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all tooling already in use)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (apps/web), Bun test (apps/api) |
| Config file | Check existing test config |
| Quick run command | `cd apps/web && bun run test` |
| Full suite command | `cd apps/web && bun run test && cd ../api && bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| SC-1 | LiffProvider calls liff.login() in external browser, does not loop | unit | test LiffProvider with isInClient=false, isLoggedIn=false | New test needed |
| SC-2 | register/cancel calls liff.sendMessages() when in LINE group context | integration | test event page component with mocked liff | New test needed |
| SC-3 | Server skips pushMessage for user-initiated actions inside LINE | unit | test registration route returns flexCard, doesn't call pushMessage | New test needed |
| SC-4 | `/liff/events/:id` 301-redirects to `/events/:id` | smoke | `curl -I https://localhost:3000/liff/events/test-id` | Manually or via redirect test |

### Wave 0 Gaps

- [ ] Test for LiffProvider external browser login flow (mock `@line/liff`)
- [ ] Test for sendMessages call on register/cancel when in-chat context

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | LIFF SDK `liff.login()` OAuth — no hand-rolling |
| V3 Session Management | yes | Existing cookie session (unchanged) |
| V4 Access Control | yes | Existing `requireClubRole` middleware (unchanged) |
| V5 Input Validation | yes | Existing Elysia `t.Object()` validation (unchanged) |
| V6 Cryptography | no | No crypto changes in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| LIFF login redirect manipulation | Tampering | `redirectUri` must match Endpoint URL pattern — LINE enforces this server-side |
| Client sending fake `X-Liff-Context: external` header to force pushMessage cost | Spoofing | Low risk — pushMessage cost is borne by the app, not the user; malicious waste is bounded by rate limits |
| Open redirect via `returnTo` param | Tampering | Validate `returnTo` is a same-origin path before redirecting |

## Sources

### Primary (HIGH confidence)
- [VERIFIED: developers.line.biz/en/reference/liff/#send-messages] — sendMessages() signature, max 5 messages, chat_message.write scope, LIFF-browser-only constraint
- [VERIFIED: developers.line.biz/en/reference/liff/#initialize-liff-app] — liff.init(), isInClient(), isLoggedIn(), getContext() type values
- [VERIFIED: developers.line.biz/en/docs/liff/opening-liff-app/] — LIFF URL path concatenation with Endpoint URL
- [VERIFIED: codebase] — liff-provider.tsx, flex-messages.ts, repost-card.ts, events.ts, next.config.ts — actual current behavior

### Secondary (MEDIUM confidence)
- [ASSUMED] — Next.js `permanent: true` produces 301 (well-established Next.js behavior)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — LIFF APIs verified against official docs, existing code patterns examined
- Pitfalls: HIGH — verified against LIFF API constraints and existing code

**Research date:** 2026-04-12
**Valid until:** 2026-07-12 (stable LIFF v2 API; 90 days)
