---
phase: quick
plan: 260406-jr8
subsystem: frontend/css
tags: [tailwind, css, monorepo, package-exports, bugfix]
dependency_graph:
  requires: []
  provides: [working-css-imports-via-package-path]
  affects: [apps/web, packages/ui]
tech_stack:
  added: []
  patterns: [package-exports-glob-with-extension, explicit-css-exports]
key_files:
  created: []
  modified:
    - apps/web/app/globals.css
    - packages/ui/package.json
decisions:
  - Use "./styles/*.css" export pattern (not "./styles/*") so wildcard captures basename without extension, preventing double-.css suffix
  - Keep @source with relative path (Tailwind v4 @source does not support node module resolution)
  - Add explicit "./styles/theme.css" and "./styles/globals.css" exports for clarity and safety
metrics:
  duration: ~7min
  completed: 2026-04-06
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260406-jr8: Fix Shared Tailwind Config Import from Package Path

**One-liner:** Fixed `@import "@repo/ui/styles/theme.css"` via package path by correcting the exports glob pattern from `"./styles/*"` to `"./styles/*.css"` to prevent double-extension resolution.

## What Was Done

### Task 1 — Replace relative path with @repo/ui package import

Updated `apps/web/app/globals.css` to replace the fragile relative filesystem import with the proper package path import:

- Before: `@import "../../../packages/ui/src/styles/theme.css";`
- After: `@import "@repo/ui/styles/theme.css";`

The `@source` directive was intentionally kept as a relative path because Tailwind v4's `@source` directive only understands filesystem glob paths, not node module resolution.

**Commit:** `7938f7b`

### Task 2 — Fix package exports and verify build

The build initially failed with `Can't resolve '@repo/ui/styles/theme.css'`. Investigation revealed a bug in the `packages/ui/package.json` exports map:

```json
// Before (broken):
"./styles/*": "./src/styles/*.css"
// When resolving "@repo/ui/styles/theme.css", wildcard captures "theme.css"
// making the resolved path "./src/styles/theme.css.css" (double extension)

// After (fixed):
"./styles/*.css": "./src/styles/*.css"
// Wildcard now captures "theme" only, resolving to "./src/styles/theme.css"
```

Also added explicit exports for clarity:
```json
"./styles/globals.css": "./src/styles/globals.css",
"./styles/theme.css": "./src/styles/theme.css"
```

**Commit:** `feb21e7`

## Verification

- `apps/web/app/globals.css` uses `@import "@repo/ui/styles/theme.css"` (no relative path) ✓
- `pnpm --filter web build` completes successfully ✓
- Theme CSS variables remain functional (build output confirms no CSS errors) ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken exports glob pattern in packages/ui/package.json**
- **Found during:** Task 2 (build verification)
- **Issue:** The exports map `"./styles/*": "./src/styles/*.css"` had a double-extension bug: resolving `@repo/ui/styles/theme.css` would match wildcard `*` = `theme.css`, producing `./src/styles/theme.css.css`
- **Fix:** Changed to `"./styles/*.css": "./src/styles/*.css"` and added explicit entries for `globals.css` and `theme.css`
- **Files modified:** `packages/ui/package.json`
- **Commit:** `feb21e7`

## Known Stubs

None.

## Self-Check: PASSED

- `apps/web/app/globals.css` exists and contains `@import "@repo/ui/styles/theme.css"` ✓
- `packages/ui/package.json` exports updated ✓
- Commits `7938f7b` and `feb21e7` exist ✓
- Build passes ✓
