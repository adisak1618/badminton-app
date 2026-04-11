---
phase: 08-data-validation-fixes
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - apps/api/src/routes/events.ts
  - apps/web/app/liff/layout.tsx
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-04-11
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the event routes API and LIFF layout component. The API file has several data validation gaps: no validation that `eventDate` is a valid/future date, no sanitization of `venueMapsUrl`, and a non-null assertion on `session.lineUserId` that could throw at runtime. The LIFF layout is clean.

## Warnings

### WR-01: No validation on eventDate string — invalid or past dates accepted

**File:** `apps/api/src/routes/events.ts:63`
**Issue:** `body.eventDate` is typed as `t.String()` with no format constraint. `new Date(body.eventDate)` silently produces `Invalid Date` for malformed input, which then gets inserted into the database. There is also no check that the date is in the future.
**Fix:** Add `{ format: "date-time" }` to the schema on line 147, and add a runtime guard:
```typescript
// Schema (line 147):
eventDate: t.String({ format: "date-time" }),

// Runtime (after line 63):
if (isNaN(eventDate.getTime())) {
  throw unprocessableEntity("Invalid eventDate");
}
```

### WR-02: venueMapsUrl accepts arbitrary strings — no URL format validation

**File:** `apps/api/src/routes/events.ts:149`
**Issue:** `venueMapsUrl` is `t.Optional(t.String({ maxLength: 500 }))` with no format check. Arbitrary strings (including `javascript:` URIs) could be stored and later rendered as clickable links, creating a potential stored XSS vector when the URL is used in Flex Messages or web views.
**Fix:**
```typescript
venueMapsUrl: t.Optional(t.String({ format: "uri", maxLength: 500 })),
```

### WR-03: Non-null assertion on session.lineUserId may throw

**File:** `apps/api/src/routes/events.ts:21,46,163`
**Issue:** `session.lineUserId!` is used three times. If the auth middleware ever passes a session without `lineUserId` populated, this will not throw a descriptive error — it will query the DB with `undefined`/`null` and silently return no results, leading to a confusing "Member not found" error.
**Fix:** Add an explicit guard at the top of each handler:
```typescript
if (!session.lineUserId) {
  throw new Error("Session missing lineUserId");
}
```

## Info

### IN-01: console.warn and console.error used for operational logging

**File:** `apps/api/src/routes/events.ts:114,119`
**Issue:** `console.warn` and `console.error` are used for LINE push failures. Consider using a structured logger if one is available in the project for better observability.
**Fix:** Replace with project logger if available.

---

_Reviewed: 2026-04-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
