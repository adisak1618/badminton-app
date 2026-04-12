---
phase: 10-hybrid-liff-free-messaging
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - apps/api/src/lib/repost-card.ts
  - apps/api/src/routes/event-templates.ts
  - apps/api/src/routes/events.ts
  - apps/api/src/routes/registrations.ts
  - apps/web/app/(liff)/events/[id]/page.tsx
  - apps/web/app/(liff)/events/create/page.tsx
  - apps/web/app/(liff)/events/templates/[id]/edit/page.tsx
  - apps/web/app/(liff)/events/templates/page.tsx
  - apps/web/app/(liff)/layout.tsx
  - apps/web/app/(liff)/profile/page.tsx
  - apps/web/app/(liff)/setup/page.tsx
  - apps/web/app/layout.tsx
  - apps/web/components/liff/liff-provider.tsx
  - apps/web/lib/liff-messaging.ts
  - apps/web/next.config.js
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-04-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase implements a hybrid LIFF / server-push messaging architecture: when an action (register, cancel, create event, cancel occurrence) originates from inside the LINE client, the server skips `pushMessage` and returns the flex card for the client to deliver via `liff.sendMessages`. When the action originates externally, the server pushes directly to the group.

The overall design is sound. The main concerns are: an open redirect vulnerability in `liff-provider.tsx`, a race condition in the registration flow, missing LIFF context headers on close/reopen, incorrect permanent redirects in `next.config.js`, and several unguarded edge cases.

---

## Critical Issues

### CR-01: Open Redirect via Unvalidated `returnTo` Parameter

**File:** `apps/web/components/liff/liff-provider.tsx:70-71`
**Issue:** The `returnTo` query param is read from `window.location.search` and appended to `/api/auth/login/line?returnTo=`. Although the value is `encodeURIComponent`-encoded before use, the `isRelativePath` guard (lines 85-87) is only applied for the `needsSetup` redirect branch — NOT for the external-browser redirect at line 71. An attacker who tricks a user into visiting the app with `?returnTo=https://evil.com` can cause the auth redirect to carry that value, and if the login handler on `/api/auth/login/line` reflects it back after login without validation, the user lands on the attacker's site.

**Fix:** Apply the same relative-path guard before constructing the external-browser login redirect URL:
```typescript
// Before redirecting to LINE Login, sanitize returnTo
const rawReturnTo = window.location.pathname + window.location.search;
const safeReturnTo = rawReturnTo.startsWith("/") && !rawReturnTo.includes("://")
  ? encodeURIComponent(rawReturnTo)
  : encodeURIComponent("/");
window.location.href = `/api/auth/login/line?returnTo=${safeReturnTo}`;
return;
```

---

## Warnings

### WR-01: Race Condition — Registration Count Check Is Not Atomic

**File:** `apps/api/src/routes/registrations.ts:120-126`
**Issue:** The `count()` check and the subsequent `insert` are two separate DB operations with no transaction or advisory lock. Under concurrent requests two users can both read `currentCount < maxPlayers` and both successfully insert, exceeding `maxPlayers`. The unique-constraint catch handles the duplicate-member case but does nothing to enforce the capacity cap.

**Fix:** Wrap the count check and insert in a transaction, or use a database-level check constraint / trigger. At minimum, re-count inside the same transaction and rollback if over capacity:
```typescript
const reg = await db.transaction(async (tx) => {
  const [{ value }] = await tx.select({ value: count() })
    .from(registrations).where(eq(registrations.eventId, body.eventId));
  if (Number(value) >= event.maxPlayers) {
    throw new ApiError(409, "EVENT_FULL", "งานนี้เต็มแล้ว");
  }
  const [r] = await tx.insert(registrations)
    .values({ eventId: body.eventId, memberId: member.id })
    .returning();
  return r;
});
```

### WR-02: Close/Reopen Action Does Not Pass `X-Liff-Context` Header

**File:** `apps/web/app/(liff)/events/[id]/page.tsx:183-187`
**Issue:** `handleToggleClose` calls `PATCH /events/:id/status` but omits the `getLiffContextHeader(liff)` header. The server-side handler (`events.ts:213`) calls `repostFlexCard`, which performs a server-side push unconditionally (it has no in-LINE branch). However, because the header is missing, the server cannot determine context — it always pushes. When the admin acts from inside LINE, both the server push and `trySendMessages` could fire (the latter is never called here either), resulting in a duplicate message or a push-API call that the LINE group did not request.

**Fix:** Add the LIFF context header and handle the returned `flexCard` (if the server is updated to conditionally skip push):
```typescript
const res = await fetch(`/api/proxy/events/${eventId}/status`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", ...getLiffContextHeader(liff) },
  body: JSON.stringify({ status: isClosed ? "open" : "closed" }),
});
if (res.ok) {
  const data = (await res.json()) as { status?: string; flexCard?: unknown };
  await trySendMessages(liff, data.flexCard);
  ...
}
```

### WR-03: `handleCreateNow` in Templates Page Does Not Pass LIFF Context Header

**File:** `apps/web/app/(liff)/events/templates/page.tsx:94-98`
**Issue:** The `POST /event-templates/:id/create-now` request omits `getLiffContextHeader(liff)`. The server checks `request.headers.get("x-liff-context")` (event-templates.ts:264) to decide whether to push or return the card. Without the header, the server will always push via the API, even when the admin is inside LINE, producing a push-only message with no `sendMessages` delivery by the client. The `liff` object is also not destructured from `useLiff()` in this component (only `isReady` and `isLoggedIn` are used).

**Fix:**
```typescript
// In TemplateList component
const { liff, isReady, isLoggedIn } = useLiff();

// In handleCreateNow
const res = await fetch(`/api/proxy/event-templates/${templateId}/create-now`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...getLiffContextHeader(liff) },
  body: JSON.stringify({ clubId }),
});
if (res.ok) {
  const data = (await res.json()) as { id?: string; flexCard?: unknown };
  await trySendMessages(liff, data.flexCard);
  toast.success("สร้างและโพสต์อีเวนท์สำเร็จ");
}
```

### WR-04: `next.config.js` Uses `permanent: true` (308) Redirects for LIFF Routes

**File:** `apps/web/next.config.js:5-12`
**Issue:** All seven redirects use `permanent: true` (HTTP 308). Permanent redirects are cached by browsers indefinitely. If the route structure changes in a future phase, users whose browsers cached the redirect will be sent to the old destination. For LIFF paths — which are often opened inside LINE's in-app browser (which may persist cache between sessions) — this is particularly risky.

**Fix:** Use `permanent: false` (307) for these internal LIFF-to-canonical redirects until the routing is stable:
```javascript
{ source: "/liff/events/:id", destination: "/events/:id", permanent: false },
```

### WR-05: Template PATCH Sends `clubId` in Body but API Does Not Accept It

**File:** `apps/web/app/(liff)/events/templates/[id]/edit/page.tsx:177`
**Issue:** `onSubmit` sends `{ ...data, clubId }` in the PATCH body. The server's PATCH handler (`event-templates.ts:182-195`) does not declare `clubId` in the body schema. In Elysia with TypeBox strict validation, extra properties are typically stripped or may cause a validation error, but it is misleading and could silently fail if schema mode changes. `clubId` is not used in the PATCH handler (authorization is done via the existing template's `clubId`), so it is dead weight in the payload.

**Fix:** Remove `clubId` from the PATCH payload in `onSubmit`:
```typescript
const res = await fetch(`/api/proxy/event-templates/${templateId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data), // no clubId
});
```

---

## Info

### IN-01: Duplicate LIFF URL Variables Are Unused

**File:** `apps/api/src/lib/repost-card.ts:23-24`
**Issue:** Both `registerLiffUrl` and `detailsLiffUrl` are constructed but assigned the same value (`${liffBase}/events/${event.id}`). The same pattern appears in `events.ts:96-97` and `event-templates.ts:248-249`. If they are intended to be distinct (e.g., separate register vs. read-only view paths) this is a latent bug waiting to appear; if they are intentionally identical, the variable duplication is unnecessary.

**Fix:** Collapse into a single variable or add a comment explaining why they are kept separate for future differentiation:
```typescript
const eventLiffUrl = `https://liff.line.me/${env.LIFF_ID}/events/${event.id}`;
// Pass eventLiffUrl for both registerLiffUrl and detailsLiffUrl
```

### IN-02: `profile/page.tsx` — Loading State Never Clears If `res.status === 404`

**File:** `apps/web/app/(liff)/profile/page.tsx:27-30`
**Issue:** When the server returns 404, the code calls `window.location.replace("/liff/setup")` and returns `null`. `setLoading(false)` is never called on that code path. While the browser will navigate away before the stale `loading=true` state matters, the pattern is fragile and would break if the redirect is ever made asynchronous or conditional.

**Fix:**
```typescript
if (res.status === 404) {
  window.location.replace("/liff/setup");
  setLoading(false); // ensure state is consistent before navigation
  return null;
}
```

### IN-03: Commented-out / TODO-style Inline Code Comments

**File:** `apps/api/src/routes/registrations.ts:149` and `apps/web/app/(liff)/events/[id]/page.tsx:149`
**Issue:** Several inline comments reference spec IDs (D-01, D-03, REG-02, etc.) that are useful for tracing decisions but create noise if the spec evolves. This is an informational note — the convention is fine if the team maintains it actively.

---

_Reviewed: 2026-04-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
