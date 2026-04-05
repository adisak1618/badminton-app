# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript 5.9.2 - Used throughout all apps and packages with strict mode enabled
- JavaScript/JSX - Used in Next.js configuration files

**Secondary:**
- CSS - Used for styling (CSS Modules in Next.js apps)

## Runtime

**Environment:**
- Node.js 18+ (specified in `package.json` engines field)

**Package Manager:**
- pnpm 9.0.0 - Monorepo package manager with workspace support
- Lockfile: `pnpm-lock.yaml` (version 9.0, present and committed)

## Frameworks

**Core:**
- Next.js 16.2.0 - Web framework for both `apps/web` and `apps/docs` applications
- React 19.2.0 - UI library for all React components
- React DOM 19.2.0 - React rendering for browser

**Build/Dev:**
- Turbo 2.9.3 - Monorepo build system and task orchestration
  - Config: `turbo.json` at project root
  - Manages build, lint, check-types, and dev tasks across workspace
- Prettier 3.7.4 - Code formatter
  - Format command: `npm run format` (formats `**/*.{ts,tsx,md}`)

**Linting:**
- ESLint 9.39.1 - Code linting engine
- @next/eslint-plugin-next 16.2.0 - Next.js specific linting rules
- eslint-plugin-react 7.37.5 - React linting rules
- eslint-plugin-react-hooks 5.2.0 - React Hooks linting
- eslint-plugin-turbo 2.7.1 - Turborepo task linting
- typescript-eslint 8.50.0 - TypeScript ESLint support

**Type Checking:**
- TypeScript 5.9.2 - Static type checking with strict configuration
  - Each app has `check-types` script: `next typegen && tsc --noEmit`

## Key Dependencies

**Critical:**
- next 16.2.0 - React framework with App Router, server components, static generation
- react 19.2.0 - UI library with latest features
- react-dom 19.2.0 - React browser rendering

**Infrastructure:**
- @repo/ui (workspace) - Shared React component library
  - Location: `packages/ui`
  - Exports components via wildcard: `@repo/ui/*`
- @repo/eslint-config (workspace) - Shared ESLint configurations
  - Exports three configs: base, next-js, react-internal
- @repo/typescript-config (workspace) - Shared TypeScript configurations
  - Exports three configs: base.json, nextjs.json, react-library.json

## Configuration

**Environment:**
- No `.env` files detected - configuration managed through Next.js defaults
- Turbo monitors `.env*` files for build inputs (see `turbo.json`)

**Build:**
- `turbo.json` - Monorepo configuration at `/Users/adisakchaiyakul/project/badminton/turbo.json`
  - Outputs: `.next/**` (excluding cache)
  - Inputs: default files plus `.env*`
- `tsconfig.json` - Per-workspace TypeScript configuration
  - Root workspace uses base configs from `@repo/typescript-config`
  - Apps extend `@repo/typescript-config/nextjs.json`
  - UI library extends `@repo/typescript-config/react-library.json`
  - Strict mode enabled with strictNullChecks
- `next.config.js` - Minimal Next.js configuration (both apps use default config)
  - Location: `apps/web/next.config.js` and `apps/docs/next.config.js`

**Workspace Configuration:**
- `pnpm-workspace.yaml` - Defines workspace structure:
  - Apps: `apps/*`
  - Shared packages: `packages/*`

## Platform Requirements

**Development:**
- Node.js >= 18
- pnpm 9.0.0
- Works on macOS, Linux, Windows (monorepo is platform agnostic)

**Production:**
- Next.js deployment (compatible with Vercel, Node.js servers, edge runtimes)
- No database or external service dependencies detected
- Static generation and server-side rendering capable

---

*Stack analysis: 2026-04-05*
