---
phase: 05-registration-loop
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - apps/api/src/routes/registrations.ts
  - apps/api/src/routes/events.ts
  - apps/api/src/lib/flex-messages.ts
  - apps/api/src/lib/repost-card.ts
  - apps/api/src/__tests__/registrations.test.ts
  - apps/web/app/liff/events/[id]/register/page.tsx
  - apps/web/app/api/proxy/[...path]/route.ts
  - apps/api/src/index.ts
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The registration loop implementation is well-structured with clear separation between route handlers, flex message builders, and the repost helper. Authentication is consistently applied, authorization is checked for admin-only actions, and best-effort semantics for LINE API calls are correctly isolated. The test suite is thorough and covers the main happy/sad paths.

Five warnings were identified, primarily around race conditions in capacity enforcement, silent data loss in the proxy layer, and missing `submitting` guard on an admin action. Three informational issues cover dead interface fields, missing error feedback on cancel, and the lack of a `cancelled` status handler.

---

## Warnings

### WR-01: TOCTOU Race — Capacity Check is Not Atomic

**File:** `apps/api/src/routes/registrations.ts:98-121`

**Issue:** The registration POST handler performs a `SELECT count(*)` to check capacity (line 98-101), then separately inserts the row (line 110-113). Between these two statements, another concurrent request can insert a row, causing the event to exceed `maxPlayers`. The unique constraint only prevents duplicate registrations by the same member — it does not prevent exceeding capacity.

**Fix:** Wrap the count check and insert inside a database transaction with a row-level lock, or use a conditional insert:

```typescript
// Option A: transaction with advisory lock / serializable isolation
const [reg] = await db.transaction(async (tx) => {
  const [{ value: currentCount }] = await tx
    .select({ value: count() })
    .from(registrations)
    .where(eq(registrations.eventId, body.eventId))
    .for("update"); // lock rows being counted

  if (Number(currentCount) >= event.maxPlayers) {
    throw new ApiError(409, "EVENT_FULL", "งานนี้เต็มแล้ว");
  }
  return tx
    .insert(registrations)
    .values({ eventId: body.eventId, memberId: member.id })
    .returning();
});
```

---

### WR-02: Proxy Swallows Non-JSON API Responses and Always Sets `Content-Type: application/json`

**File:** `apps/web/app/api/proxy/[...path]/route.ts:27-37`

**Issue:** The proxy unconditionally sets `Content-Type: application/json` on every response (line 36), even when the upstream API returns an HTML error page (e.g., 502 Bad Gateway from a load balancer) or a non-JSON body. The client at `apps/web/app/liff/events/[id]/register/page.tsx:121-122` calls `res.json()` on a 409, which will throw a parse error when the body is HTML, leaving the user with an unhandled rejection rather than a toast.

**Fix:** Forward the actual `Content-Type` header from the upstream response:

```typescript
const upstreamContentType = res.headers.get("Content-Type") ?? "application/json";
return new NextResponse(data, {
  status: res.status,
  headers: { "Content-Type": upstreamContentType },
});
```

And add a try/catch around `res.json()` in the client cancel handler (WR-03 below).

---

### WR-03: Cancel Error Handler Calls `res.json()` Without Try/Catch

**File:** `apps/web/app/liff/events/[id]/register/page.tsx:121-122`

**Issue:** In `handleRegisterToggle`, when the DELETE returns a non-OK status, the code calls `(await res.json()) as { message?: string }` without guarding against a non-JSON body. If the proxy or network layer returns HTML (e.g., a 502 from the load balancer), this throws an unhandled exception that escapes the `finally` block and leaves `submitting` stuck at `true`, freezing the UI.

**Fix:**

```typescript
} else {
  let message: string | undefined;
  try {
    const data = await res.json() as { message?: string };
    message = data.message;
  } catch {
    // non-JSON body — ignore
  }
  toast.error(message ?? "ยกเลิกไม่สำเร็จ กรุณาลองใหม่");
}
```

---

### WR-04: `handleRemoveMember` Does Not Set `submitting` — Concurrent Calls Are Not Guarded

**File:** `apps/web/app/liff/events/[id]/register/page.tsx:153-167`

**Issue:** `handleRemoveMember` is called from each admin remove button in the registration list (line 266). It performs a `fetch` + `fetchData` chain but never sets `submitting = true`, so there is no UI guard preventing a double-click or simultaneous removal of two members in quick succession. The second request could race with `fetchData()` from the first and render stale state.

**Fix:** Disable the remove button while a removal is in progress. A simple approach is to track a per-registration pending state, or reuse `submitting`:

```tsx
// Set submitting to block concurrent admin actions
async function handleRemoveMember(registrationId: string) {
  setSubmitting(true);
  try {
    const res = await fetch(`/api/proxy/registrations/${registrationId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("ลบสำเร็จ");
      await fetchData();
    } else {
      toast.error("ลบไม่สำเร็จ");
    }
  } catch {
    toast.error("ลบไม่สำเร็จ");
  } finally {
    setSubmitting(false);
  }
}
```

---

### WR-05: `buildRepostAltText` With `action="register"` or `action="cancel"` Interpolates `undefined` Into String

**File:** `apps/api/src/lib/flex-messages.ts:129-131`

**Issue:** `buildRepostAltText` returns `` `${memberName} ลงทะเบียนแล้ว...` `` for `"register"` and `` `${memberName} ยกเลิกแล้ว...` `` for `"cancel"`. The `memberName` parameter is typed as `string | undefined`. When `memberName` is `undefined` (which can happen because `registrations.ts:199` passes `undefined` for `admin_remove` — fine — but the TypeScript signature allows callers to call with `action="register"` and omit `memberName`), the alt text becomes the string `"undefined ลงทะเบียนแล้ว ..."`, which would be sent to LINE users.

While the current callers do supply `memberName` for `"register"` and `"cancel"` actions, the type signature does not enforce this. An overload or runtime guard should be added.

**Fix:** Add a runtime guard or narrow the type:

```typescript
case "register":
  return `${memberName ?? "(unknown)"} ลงทะเบียนแล้ว (${registeredCount}/${maxPlayers} คน)`;
case "cancel":
  return `${memberName ?? "(unknown)"} ยกเลิกแล้ว (${registeredCount}/${maxPlayers} คน)`;
```

---

## Info

### IN-01: `RepostCardData` Interface Has Fields Never Used by `buildRepostFlexCard` Consumers

**File:** `apps/api/src/lib/flex-messages.ts:3-17`

**Issue:** The `RepostCardData` interface (lines 3-17) is only used internally within `flex-messages.ts` and is not exported. This is fine, but it declares a `notificationAltText` field that is built separately by `buildRepostAltText` and passed in by the caller — coupling the construction order. This is a minor design note, not a bug.

**Fix:** No action required; document the coupling if the interface is ever exported.

---

### IN-02: `EventData.status` in Register Page Includes `"cancelled"` — Not in API Schema

**File:** `apps/web/app/liff/events/[id]/register/page.tsx:17`

**Issue:** The `EventData` interface on line 17 declares `status: "open" | "closed" | "cancelled"`, but the API only knows `"open"` and `"closed"` (see `events.ts` PATCH body schema). The `"cancelled"` state is never returned by the API and is never handled in the UI logic (lines 108-109 only check for `"closed"`). This dead union member creates a misleading contract.

**Fix:** Remove `"cancelled"` from the local interface unless the status is added to the DB schema and API:

```typescript
status: "open" | "closed";
```

---

### IN-03: Test for EVENT_FULL Cleans Up Registrations Mid-Test Rather Than Using `afterEach`

**File:** `apps/api/src/__tests__/registrations.test.ts:235-238`

**Issue:** The `"returns 409 EVENT_FULL"` test (lines 201-239) deletes registrations inline at lines 235-238 after assertions. The `beforeEach` hook at line 155 already calls `cleanRegistrations()`, so the inline cleanup for the extra registrations is only partially necessary (extra members must still be cleaned). However, the inline member cleanup runs after the delete of registrations, which is the correct FK order — this pattern works but is fragile. If the assertions at lines 228-232 throw, cleanup is skipped and the extra `members` rows are orphaned.

**Fix:** Move ephemeral fixture creation to a local `try/finally` or use `afterEach`-scoped cleanup helpers to ensure cleanup always runs regardless of assertion failure.

---

_Reviewed: 2026-04-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
