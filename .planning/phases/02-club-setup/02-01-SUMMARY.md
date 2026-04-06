---
phase: 02-club-setup
plan: 01
subsystem: web-auth
tags: [shadcn-ui, tailwind-v4, iron-session, line-login, oauth, next-middleware]
dependency_graph:
  requires: []
  provides:
    - web-auth-layer
    - shadcn-ui-components
    - line-login-oauth-flow
    - iron-session-config
    - protected-routes
  affects:
    - apps/web
    - packages/ui
tech_stack:
  added:
    - tailwindcss@^4 (apps/web)
    - "@tailwindcss/postcss (apps/web)"
    - iron-session@^8 (apps/web)
    - "@t3-oss/env-nextjs (apps/web)"
    - react-hook-form (apps/web)
    - "@hookform/resolvers (apps/web)"
    - zod (apps/web)
    - class-variance-authority (packages/ui)
    - clsx (packages/ui)
    - tailwind-merge (packages/ui)
    - tw-animate-css (packages/ui)
    - "@radix-ui/react-slot (packages/ui)"
    - "@radix-ui/react-label (packages/ui)"
    - "@radix-ui/react-select (packages/ui)"
    - "@radix-ui/react-dialog (packages/ui)"
    - "@radix-ui/react-dropdown-menu (packages/ui)"
    - "@radix-ui/react-separator (packages/ui)"
    - lucide-react (packages/ui)
    - sonner (packages/ui)
  patterns:
    - Tailwind CSS v4 with @theme inline — no tailwind.config.ts needed
    - shadcn/ui components in packages/ui with @repo/ui alias
    - iron-session cookies with AES-256-GCM encryption
    - OAuth CSRF protection via crypto.randomBytes state parameter
    - Next.js middleware uses (request, response, options) signature (not cookies())
    - Server components use await cookies() with iron-session
key_files:
  created:
    - apps/web/postcss.config.mjs
    - apps/web/components.json
    - apps/web/lib/env.ts
    - apps/web/lib/session.ts
    - apps/web/middleware.ts
    - apps/web/components/nav.tsx
    - apps/web/app/api/auth/login/line/route.ts
    - apps/web/app/api/auth/callback/line/route.ts
    - apps/web/app/api/auth/logout/route.ts
    - packages/ui/components.json
    - packages/ui/src/lib/utils.ts
    - packages/ui/src/styles/globals.css
    - packages/ui/src/components/button.tsx
    - packages/ui/src/components/card.tsx
    - packages/ui/src/components/input.tsx
    - packages/ui/src/components/label.tsx
    - packages/ui/src/components/select.tsx
    - packages/ui/src/components/dialog.tsx
    - packages/ui/src/components/sonner.tsx
    - packages/ui/src/components/dropdown-menu.tsx
    - packages/ui/src/components/separator.tsx
    - packages/ui/src/components/skeleton.tsx
    - packages/ui/src/components/badge.tsx
    - packages/ui/src/components/table.tsx
  modified:
    - apps/web/package.json
    - apps/web/app/globals.css
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx
    - apps/web/tsconfig.json
    - packages/ui/package.json
decisions:
  - "shadcn/ui CLI skipped in favor of manual component creation — interactive CLI cannot be automated non-interactively; all components created from canonical shadcn source"
  - "Added @/* path alias to apps/web/tsconfig.json — required for TypeScript to resolve @/lib/session and @/components/* imports"
  - "packages/ui exports updated with lib/*, hooks/*, styles/*, components/* paths to support monorepo alias resolution"
metrics:
  duration: 8min
  completed: "2026-04-06"
  tasks: 3
  files_created: 24
  files_modified: 6
---

# Phase 02 Plan 01: Web Auth Layer + shadcn/ui Setup Summary

**One-liner:** Line Login OAuth flow with iron-session cookies, Next.js middleware route protection, and shadcn/ui Tailwind v4 component library initialized in the monorepo.

## What Was Built

### Task 1: shadcn/ui + Tailwind CSS v4 (commit: 3a21fcf)

Initialized the UI foundation across the monorepo:
- `packages/ui/src/styles/globals.css` — Tailwind v4 theme with oklch color system, dark mode, and full CSS variable palette
- `packages/ui/src/lib/utils.ts` — `cn()` helper using clsx + tailwind-merge
- `apps/web/app/globals.css` — imports shared styles via `@repo/ui/styles/globals.css`
- `apps/web/postcss.config.mjs` — Tailwind v4 PostCSS plugin
- shadcn/ui components in `packages/ui/src/components/`: button, card, input, label, select, dialog, sonner, dropdown-menu, separator, skeleton, badge, table
- Installed: iron-session, react-hook-form, @hookform/resolvers, zod, @t3-oss/env-nextjs in apps/web

### Task 2: iron-session + Line Login OAuth (commit: a53c19a)

Implemented the complete Line Login OAuth flow:
- `apps/web/lib/session.ts` — `SessionData` interface + `sessionOptions` (14-day encrypted cookie, httpOnly, secure in prod)
- `apps/web/lib/env.ts` — Type-safe env validation for LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET, LINE_LOGIN_CALLBACK_URL, SESSION_SECRET, API_BASE_URL
- `/api/auth/login/line` — generates crypto state+nonce, saves to session, redirects to Line authorize URL (CSRF protection)
- `/api/auth/callback/line` — validates state, exchanges code for token, verifies ID token via Line /verify endpoint, sets session
- `/api/auth/logout` — destroys session and redirects home

### Task 3: Middleware + Nav + Layout (commit: eb0e3d6)

- `apps/web/middleware.ts` — protects `/clubs/*` routes using `getIronSession(request, response, options)` (middleware-specific signature)
- `apps/web/components/nav.tsx` — async server component reads session via `getIronSession(await cookies(), sessionOptions)`, shows login/logout state
- `apps/web/app/layout.tsx` — updated with Nav component, Tailwind classes, `lang="th"`
- `apps/web/app/page.tsx` — simple landing page with LINE Login CTA

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @/* path alias to tsconfig.json**
- **Found during:** Task 3 (type check step)
- **Issue:** TypeScript could not resolve `@/lib/session` or `@/components/nav` — the scaffold tsconfig had no `paths` mapping
- **Fix:** Added `"paths": { "@/*": ["./*"] }` to `apps/web/tsconfig.json`
- **Files modified:** `apps/web/tsconfig.json`
- **Commit:** eb0e3d6

**2. [Rule 3 - Blocking] shadcn/ui CLI replaced with manual component creation**
- **Found during:** Task 1 (shadcn init step)
- **Issue:** `pnpm dlx shadcn@latest init --monorepo` is fully interactive — prompts for component library selection and preset; cannot be piped or automated
- **Fix:** Created all required component files manually from canonical shadcn/ui source (new-york style + Radix UI v1 primitives). Result is identical to what the CLI would produce.
- **Files modified:** All `packages/ui/src/components/*.tsx` files
- **Commit:** 3a21fcf

## Known Stubs

None — all auth routes connect to real Line OAuth endpoints. Session data is persisted to encrypted cookies. No placeholder data flows to UI.

## Threat Flags

None — all STRIDE threats from the plan's threat model are mitigated:
- T-02-01: CSRF via crypto.randomBytes state parameter — implemented
- T-02-02: ID token verification via Line /verify endpoint — implemented
- T-02-03: iron-session AES-256-GCM encryption — implemented
- T-02-04: httpOnly + secure + sameSite cookie — implemented
- T-02-05: Next.js middleware isLoggedIn check — implemented
- T-02-06: SESSION_SECRET min-32 validation — implemented

## Self-Check: PASSED

Files exist:
- apps/web/postcss.config.mjs: FOUND
- apps/web/lib/session.ts: FOUND
- apps/web/lib/env.ts: FOUND
- apps/web/middleware.ts: FOUND
- apps/web/components/nav.tsx: FOUND
- apps/web/app/api/auth/login/line/route.ts: FOUND
- apps/web/app/api/auth/callback/line/route.ts: FOUND
- packages/ui/src/lib/utils.ts: FOUND
- packages/ui/src/styles/globals.css: FOUND

Commits:
- 3a21fcf: feat(02-01): initialize shadcn/ui + Tailwind CSS v4 in monorepo
- a53c19a: feat(02-01): configure iron-session and Line Login OAuth routes
- eb0e3d6: feat(02-01): add middleware, nav, and updated layout
