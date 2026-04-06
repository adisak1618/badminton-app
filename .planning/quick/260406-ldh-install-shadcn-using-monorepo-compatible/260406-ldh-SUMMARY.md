---
phase: quick-260406-ldh
plan: 01
subsystem: ui
tags: [shadcn, monorepo, tailwind, components]
dependency_graph:
  requires: []
  provides: [shadcn-monorepo-setup, shared-ui-components]
  affects: [packages/ui, apps/web]
tech_stack:
  added: [next-themes, radix-ui]
  patterns: [shadcn-monorepo, tsconfig-path-aliases, split-css-theme]
key_files:
  created:
    - packages/ui/src/components/badge.tsx
    - packages/ui/src/components/button.tsx
    - packages/ui/src/components/card.tsx
    - packages/ui/src/components/dialog.tsx
    - packages/ui/src/components/dropdown-menu.tsx
    - packages/ui/src/components/input.tsx
    - packages/ui/src/components/label.tsx
    - packages/ui/src/components/select.tsx
    - packages/ui/src/components/separator.tsx
    - packages/ui/src/components/skeleton.tsx
    - packages/ui/src/components/sonner.tsx
    - packages/ui/src/components/table.tsx
    - packages/ui/src/lib/utils.ts
    - packages/ui/src/styles/theme.css
  modified:
    - packages/ui/components.json
    - packages/ui/package.json
    - packages/ui/tsconfig.json
    - apps/web/components.json
    - apps/web/tsconfig.json
    - apps/web/app/globals.css
    - apps/web/package.json
decisions:
  - "Run shadcn CLI from packages/ui (not apps/web) after adding @repo/ui/* tsconfig path alias"
  - "Created theme.css (vars-only, no @import tailwindcss) to avoid CSS resolution issues when importing across workspaces"
  - "apps/web imports theme.css directly via relative path; tailwindcss and tw-animate-css imported from apps/web own context"
  - "Added tw-animate-css to apps/web as direct dependency for CSS resolution"
metrics:
  duration: "25 min"
  completed: "2026-04-06"
  tasks: 2
  files: 20
---

# Quick Task 260406-ldh: Install shadcn Using Monorepo Compatible Setup

**One-liner:** shadcn monorepo setup with CLI routing to packages/ui via tsconfig paths, 12 components reinstalled, globals.css theme split into importable theme.css for cross-workspace CSS resolution.

## What Was Done

Reset and re-initialized shadcn/ui with the official monorepo pattern. Both `packages/ui/components.json` and `apps/web/components.json` are now properly configured with `@repo/ui` aliases. All 12 shadcn components are CLI-managed in `packages/ui/src/components/`. The web app build passes.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Clean slate - remove legacy files and configure shadcn | fa2af6e | components.json x2, package.json |
| 2 | Re-add all components via shadcn CLI and verify build | 75cf783 | 12 components, utils.ts, theme.css, globals.css, tsconfigs |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn CLI was routing components to literal path instead of src/components/**

- **Found during:** Task 2
- **Issue:** CLI treated `@repo/ui/components` alias as a literal filesystem path, creating `packages/ui/@repo/ui/components/` and `apps/web/@repo/ui/components/` directories.
- **Fix:** Added `@repo/ui/*` tsconfig path mapping (`./src/*`) to `packages/ui/tsconfig.json`. CLI then correctly resolved alias to `src/components/`.
- **Decision:** Run CLI from `packages/ui` directory (not `apps/web`) since that's the workspace where components should live.
- **Files modified:** `packages/ui/tsconfig.json`, `apps/web/tsconfig.json`
- **Commit:** 75cf783

**2. [Rule 3 - Blocking] CLI did not generate utils.ts**

- **Found during:** Task 2
- **Issue:** After adding components, `packages/ui/src/lib/utils.ts` was not created by CLI. All components import `cn` from `@repo/ui/lib/utils`.
- **Fix:** Manually created `packages/ui/src/lib/utils.ts` with standard `cn()` using `clsx` + `tailwind-merge`.
- **Files modified:** `packages/ui/src/lib/utils.ts` (created)
- **Commit:** 75cf783

**3. [Rule 3 - Blocking] apps/web/app/globals.css could not resolve tw-animate-css**

- **Found during:** Task 2 build verification
- **Issue:** `apps/web/app/globals.css` imported `tw-animate-css` directly but the package was only a dependency of `@repo/ui`, not `apps/web`. Tailwind PostCSS failed to resolve it.
- **Root cause:** When importing `packages/ui/src/styles/globals.css` via relative path from apps/web, PostCSS resolves imports relative to that file's directory (`packages/ui/src/styles/`), where `tailwindcss` and `tw-animate-css` are not available.
- **Fix:** Created `packages/ui/src/styles/theme.css` containing only theme variables and Tailwind `@theme inline` block (no `@import "tailwindcss"` or `@import "tw-animate-css"`). Updated `apps/web/app/globals.css` to import `tailwindcss` and `tw-animate-css` from its own context, then import `theme.css` for the token definitions. Added `tw-animate-css` to `apps/web` direct dependencies.
- **Files modified:** `packages/ui/src/styles/theme.css` (created), `apps/web/app/globals.css`, `apps/web/package.json`
- **Commit:** 75cf783

### Out-of-Scope Issues (Deferred)

- `apps/api` build fails with `@line/bot-sdk` + bun bundler `node:buffer`/`node:crypto` import errors. Pre-existing issue, not caused by this task.

## Known Stubs

None - all components are fully wired via CLI.

## Threat Flags

None - developer tooling configuration task with no runtime user input or network boundaries.

## Verification Results

- packages/ui/src/components/ contains all 12 CLI-managed components: PASS
- packages/ui/src/lib/utils.ts exists with cn() export: PASS
- packages/ui/src/styles/globals.css has oklch theme tokens preserved: PASS
- packages/ui/components.json has @repo/ui aliases: PASS
- apps/web/components.json has @repo/ui ui alias: PASS
- Package name remains @repo/ui: PASS
- pnpm build (web workspace): PASS
- pnpm --filter @repo/ui check-types: PASS

## Self-Check: PASSED

All 17 key files verified present. Both commits (fa2af6e, 75cf783) confirmed in git log.
