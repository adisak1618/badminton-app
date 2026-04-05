# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Monorepo with Turborepo task orchestration

**Key Characteristics:**
- Workspace-based package management using pnpm with explicit `pnpm-workspace.yaml`
- Turborepo task coordination with cached build artifacts
- Shared configuration packages (`@repo/eslint-config`, `@repo/typescript-config`)
- Shared component library (`@repo/ui`) consumed by multiple apps
- Next.js 16 App Router as primary frontend framework
- TypeScript-first with strict type checking enabled globally

## Layers

**Application Layer (Apps):**
- Purpose: User-facing Next.js applications built with the App Router pattern
- Location: `apps/web/` and `apps/docs/`
- Contains: Server components, client components, page layouts, styling
- Depends on: `@repo/ui`, `@repo/typescript-config`, `@repo/eslint-config`
- Used by: End users through Next.js server

**Component Library Layer (Packages):**
- Purpose: Reusable UI components shared across applications
- Location: `packages/ui/`
- Contains: React components exported via wildcard exports (`./*` maps to `./src/*.tsx`)
- Depends on: React, TypeScript config, ESLint config
- Used by: `apps/web`, `apps/docs`

**Configuration Layer (Packages):**
- Purpose: Shared development configuration and standards
- Location: `packages/typescript-config/`, `packages/eslint-config/`
- Contains: Base TypeScript configurations, ESLint rule sets, Prettier integration
- Depends on: TypeScript, ESLint plugins, Prettier
- Used by: All apps and packages in the monorepo

**Task Orchestration (Root):**
- Purpose: Centralized build, lint, dev task management
- Location: Root `package.json`, `turbo.json`, `pnpm-workspace.yaml`
- Contains: Turbo task definitions, workspace package globs, shared dependencies
- Depends on: Turbo, pnpm
- Used by: All packages and apps

## Data Flow

**Development Build:**

1. Developer runs `turbo build` at repository root
2. Turbo reads task definitions from `turbo.json`
3. Tasks execute in dependency order: builds `@repo/typescript-config`, `@repo/eslint-config`, `@repo/ui` first
4. App builds (`web`, `docs`) run after their dependencies complete
5. Next.js builds output to `.next/` directory (excluded from cache with `!.next/cache/**`)
6. Artifacts cached in local Turbo cache (can be connected to Vercel Remote Cache)

**Development Server:**

1. Developer runs `turbo dev` at repository root
2. Turbo starts concurrent dev servers for web (port 3000) and docs (port 3001)
3. HMR updates propagate through component library changes
4. TypeScript incremental checking runs parallel to dev servers

**Import Resolution:**

1. Apps reference workspace packages via `@repo/*` namespace
2. `pnpm-workspace.yaml` defines workspace scope: `apps/*` and `packages/*`
3. pnpm resolves workspace: dependencies to local packages with symlinks
4. Wildcard exports in `@repo/ui` (`"./*": "./src/*.tsx"`) allow direct component imports: `@repo/ui/button`

**Linting/Formatting Flow:**

1. Each package/app has `eslint.config.js` or `eslint.config.mjs` that extends shared base
2. `@repo/eslint-config/base.js` provides foundation (js.recommended, TypeScript rules, Turbo plugin)
3. Environment-specific configs overlay: `next.js` for Next.js apps, `react-internal.js` for React libraries
4. Prettier integration via `eslint-config-prettier` disables conflicting ESLint rules
5. Root `prettier --write "**/*.{ts,tsx,md}"` applies formatting across monorepo

**State Management:**

- No centralized state management detected
- Component props used for local state within UI library
- Next.js client/server component boundary implicit in App Router
- Individual app pages manage their own component hierarchy

## Key Abstractions

**Workspace Package:**
- Purpose: Isolate concerns into installable units
- Examples: `packages/ui`, `packages/typescript-config`, `apps/web`
- Pattern: Each package has own `package.json` with scoped name (`@repo/*`), TypeScript config, ESLint config

**UI Component:**
- Purpose: Exportable React component for reuse across apps
- Examples: `Button` (interactive with "use client"), `Card` (container with link), `Code` (text wrapper)
- Pattern: Functional components with typed props, JSX.Element return type annotation, exported from `packages/ui/src/*.tsx`

**App Entry Point:**
- Purpose: Next.js application root with layout and routing
- Examples: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- Pattern: Next.js App Router with RSC defaults, client components opt-in via "use client"

**Configuration Preset:**
- Purpose: Standardized config for all workspaces
- Examples: TypeScript base config (`base.json`), Next.js ESLint config (`next.js`)
- Pattern: Base config extends are chained; environment-specific overlays add rules

## Entry Points

**Web Application:**
- Location: `apps/web/app/layout.tsx` and `apps/web/app/page.tsx`
- Triggers: `next dev --port 3000` or deployed to Vercel
- Responsibilities: Renders home page with Turborepo branding, demonstrates UI library usage (Button component), metadata setup

**Docs Application:**
- Location: `apps/docs/app/layout.tsx` and `apps/docs/app/page.tsx`
- Triggers: `next dev --port 3001` or deployed to Vercel
- Responsibilities: Secondary Next.js app with identical structure, demonstrates monorepo multi-app capability

**Build Task:**
- Location: `turbo.json` task definition `build`
- Triggers: `turbo build` or CI/CD pipeline
- Responsibilities: Orchestrate sequential builds, cache outputs, produce `.next/` artifacts

**Dev Task:**
- Location: `turbo.json` task definition `dev`
- Triggers: `turbo dev`
- Responsibilities: Start concurrent dev servers (web on 3000, docs on 3001), enable HMR, no caching

## Error Handling

**Strategy:** No explicit error handling detected in application code (sample template)

**Patterns:**
- TypeScript strict mode catches compile-time errors (strict: true in base tsconfig.json)
- ESLint enforces code quality rules across codebase
- Next.js type generation (`next typegen`) validates page/component contracts
- Component type safety enforced at import time via TypeScript

## Cross-Cutting Concerns

**Logging:** Not implemented (no logger dependency in packages)

**Validation:** TypeScript type system provides structural validation; no runtime schema validation detected

**Authentication:** Not implemented (no auth dependency or middleware detected)

**Formatting & Linting:** 
- ESLint v9 with flat config (eslint.config.js/mjs pattern)
- Prettier integration via eslint-config-prettier
- Root package.json command: `format` runs `prettier --write` across monorepo
- App-specific: `lint` command with `--max-warnings 0` enforcement

---

*Architecture analysis: 2026-04-05*
