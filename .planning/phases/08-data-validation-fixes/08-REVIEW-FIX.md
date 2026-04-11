---
phase: 08-data-validation-fixes
fixed_at: 2026-04-11T00:00:00Z
review_path: .planning/phases/08-data-validation-fixes/08-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-04-11
**Source review:** .planning/phases/08-data-validation-fixes/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: No validation on eventDate string

**Files modified:** `apps/api/src/routes/events.ts`
**Commit:** 62233a7
**Applied fix:** Added `{ format: "date-time" }` to the eventDate schema field and added a runtime guard `isNaN(eventDate.getTime())` that throws `unprocessableEntity("Invalid eventDate")` after parsing.

### WR-02: venueMapsUrl accepts arbitrary strings

**Files modified:** `apps/api/src/routes/events.ts`
**Commit:** 62233a7
**Applied fix:** Added `format: "uri"` to the `venueMapsUrl` schema field so Elysia validates it as a proper URI before the handler runs.

### WR-03: Non-null assertion on session.lineUserId may throw

**Files modified:** `apps/api/src/routes/events.ts`
**Commit:** 62233a7
**Applied fix:** Replaced all three `session.lineUserId!` non-null assertions with explicit guards that throw `new Error("Session missing lineUserId")` if the value is falsy. Removed the `!` operator from each usage.

---

_Fixed: 2026-04-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
