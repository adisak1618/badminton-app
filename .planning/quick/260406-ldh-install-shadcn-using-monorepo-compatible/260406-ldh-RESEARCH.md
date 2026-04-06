# Quick Task 260406-ldh: Install shadcn Monorepo Setup - Research

**Researched:** 2026-04-06
**Domain:** shadcn/ui monorepo configuration with Tailwind v4
**Confidence:** MEDIUM

## Summary

The official shadcn monorepo guide prescribes a specific structure: `packages/ui` holds shared components with its own `components.json`, and each consuming app (`apps/web`) has its own `components.json` pointing aliases to the shared package. The CLI auto-routes primitive components (button, input) to `packages/ui` and composite components (login-form) to the app.

The main complexity is alias resolution. The official docs use `@workspace/ui/*` as the import convention, which requires tsconfig path mappings. Our project currently uses `@repo/ui` as the package name and import alias. We need to either adopt `@workspace/ui` (official convention) or configure `components.json` to use `@repo/ui` paths (our existing convention). The safest approach is to run `shadcn init` in both workspaces and adjust the generated `components.json` to use `@repo/ui` since that matches our existing package name and workspace resolution.

**Primary recommendation:** Run `shadcn init` separately in `packages/ui` and `apps/web` (not `--monorepo` which scaffolds a new project), configure `components.json` in both to use `@repo/ui` aliases, and ensure tsconfig paths resolve correctly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All shadcn components installed in packages/ui only
- Apps consume via @repo/ui workspace dependency
- Follows the official shadcn monorepo pattern
- Clean slate: reset packages/ui and re-init from scratch with shadcn CLI
- Remove existing manual component setup and let shadcn CLI configure everything
- Only apps/web consumes the shared UI package

### Specific Ideas
- Reference docs: https://ui.shadcn.com/docs/monorepo
- Tailwind v4 in use (^4.2.2)
- Next.js 16 in apps/web
- Existing packages/tailwind-config should be considered for shared config
</user_constraints>

## Current State Analysis

### What exists in packages/ui now
- `components.json` with style `new-york`, aliases using `@repo/ui/*` [VERIFIED: filesystem]
- 12 components in `src/components/`: badge, button, card, dialog, dropdown-menu, input, label, select, separator, skeleton, sonner, table [VERIFIED: filesystem]
- `src/lib/utils.ts` (cn utility) [VERIFIED: filesystem]
- `src/styles/globals.css` with full Tailwind v4 theme (oklch colors, CSS variables) [VERIFIED: filesystem]
- `src/styles/theme.css` does not exist (empty) [VERIFIED: filesystem]
- Legacy scaffold files at `src/` root: `button.tsx`, `card.tsx`, `code.tsx` (from create-turbo template) [VERIFIED: filesystem]
- Package exports use `@repo/ui` name with explicit export map [VERIFIED: package.json]

### What exists in apps/web now
- `components.json` with style `new-york`, aliases pointing to `@repo/ui/*` [VERIFIED: filesystem]
- `globals.css` imports from `@repo/ui/styles/theme.css` and uses `@source` directive for packages/ui [VERIFIED: filesystem]
- tsconfig has `@/*` path alias only [VERIFIED: filesystem]

### Key observation
The existing setup is partially correct but was done manually. The shadcn CLI should own the configuration to ensure future `shadcn add` commands work correctly.

## Architecture Patterns

### Official shadcn Monorepo Structure [CITED: ui.shadcn.com/docs/monorepo]

```
packages/ui/
  src/
    components/     # shadcn components live here
    hooks/          # shared hooks
    lib/
      utils.ts      # cn() utility
    styles/
      globals.css   # Tailwind v4 theme + base styles
  components.json   # shadcn config for this workspace
  package.json

apps/web/
  components/       # app-specific composite components
  components.json   # shadcn config for this workspace
  ...
```

### components.json for packages/ui [CITED: ui.shadcn.com/docs/monorepo]

The official docs use `@workspace/ui` but our project uses `@repo/ui`. The alias prefix must match the actual package name or have a tsconfig path mapping.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@repo/ui/components",
    "utils": "@repo/ui/lib/utils",
    "hooks": "@repo/ui/hooks",
    "lib": "@repo/ui/lib",
    "ui": "@repo/ui/components"
  }
}
```

### components.json for apps/web [CITED: ui.shadcn.com/docs/monorepo]

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@repo/ui/lib/utils",
    "ui": "@repo/ui/components"
  }
}
```

### Critical: Tailwind v4 config field
For Tailwind CSS v4, the `tailwind.config` field in `components.json` must be left as empty string `""`. [CITED: ui.shadcn.com/docs/monorepo]

### Critical: Both workspaces need components.json
Every workspace must have its own `components.json`. Both must use identical `style`, `iconLibrary`, and `baseColor` settings. [CITED: ui.shadcn.com/docs/monorepo]

## Clean Slate Plan

### What to remove from packages/ui
1. Legacy scaffold files: `src/button.tsx`, `src/card.tsx`, `src/code.tsx` (create-turbo leftovers)
2. All existing `src/components/*.tsx` files (will be re-added via CLI)
3. Existing `components.json` (will be regenerated)
4. `src/lib/utils.ts` (will be regenerated by CLI)

### What to preserve
1. `package.json` -- keep the `@repo/ui` name and workspace config, but dependencies will be updated by shadcn CLI as components are added
2. `tsconfig.json` -- keep as is
3. `eslint.config.mjs` -- keep as is
4. `src/styles/globals.css` -- keep the theme (oklch color tokens), but may need to be regenerated if shadcn init overwrites it

### What to preserve in apps/web
1. `globals.css` -- keep the `@import "@repo/ui/styles/theme.css"` pattern but verify it still works after re-init
2. `components.json` -- will be regenerated

## Package Exports Configuration

The `package.json` exports map in `packages/ui` must support the alias pattern. Current exports use file-level mappings. The shadcn CLI generates imports like `@repo/ui/components/button`. The exports field needs:

```json
{
  "exports": {
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./hooks/*": "./src/hooks/*.ts",
    "./styles/*": "./src/styles/*"
  }
}
```

This is close to what exists but the current exports also have legacy entries (`./*`) that should be cleaned up. [VERIFIED: current package.json]

## @workspace vs @repo Alias Resolution

The official docs use `@workspace/ui` as import paths. This works because the shadcn-generated tsconfig includes path mappings like `"@workspace/ui/*": ["../../packages/ui/src/*"]`. [CITED: github.com/shadcn-ui/ui/discussions/6752]

Our project uses `@repo/ui` as the package name with pnpm `workspace:*` resolution. This means `@repo/ui/components/button` resolves via pnpm workspace symlink + package.json exports map (not tsconfig paths). This is a valid and arguably cleaner approach. The `components.json` aliases just need to use `@repo/ui` instead of `@workspace/ui`. [ASSUMED: that shadcn CLI respects the alias prefix from components.json when generating import statements]

## Common Pitfalls

### Pitfall 1: Style name mismatch
The official docs now show `radix-nova` as a style. Our existing setup uses `new-york`. If `new-york` is deprecated or renamed, init may fail. Verify available styles during init. [ASSUMED: new-york may have been renamed to radix-nova]

### Pitfall 2: CSS source directive
`apps/web/globals.css` uses `@source "../../../packages/ui/src"` to tell Tailwind to scan packages/ui for class names. This is essential for monorepo Tailwind and must be preserved after re-init. [VERIFIED: current globals.css]

### Pitfall 3: packages/tailwind-config is likely unnecessary
With Tailwind v4, configuration lives in CSS (globals.css), not in a JS config file. The `packages/tailwind-config` directory appears to be vestigial (only contains node_modules). It can likely be ignored or removed. [VERIFIED: directory listing shows only node_modules]

### Pitfall 4: Dependency cleanup
After clean slate, `packages/ui/package.json` will have stale dependencies (radix packages for removed components). Running `shadcn add` for each component will re-add the correct dependencies.

## Execution Steps (for planner)

1. Remove legacy files from `packages/ui/src/` (button.tsx, card.tsx, code.tsx)
2. Remove all files in `packages/ui/src/components/`
3. Remove `packages/ui/src/lib/utils.ts`
4. Back up `packages/ui/src/styles/globals.css` theme
5. Write new `packages/ui/components.json` with correct aliases
6. Write new `apps/web/components.json` with correct aliases  
7. Run `pnpm dlx shadcn@latest init` from `packages/ui` to set up utils and base config
8. Run `pnpm dlx shadcn@latest add button card dialog dropdown-menu input label select separator skeleton sonner table badge` from `apps/web` (CLI will route primitives to packages/ui)
9. Verify `packages/ui/src/styles/globals.css` has theme tokens (restore if overwritten)
10. Verify `apps/web/app/globals.css` imports and `@source` directive are intact
11. Clean up stale dependencies from `packages/ui/package.json`
12. Run `pnpm install` and verify `pnpm build` succeeds

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | shadcn CLI respects alias prefix from components.json for import generation | Alias Resolution | CLI may hardcode @workspace, requiring post-add find-and-replace |
| A2 | `new-york` style still available (may be renamed to `radix-nova`) | Pitfalls | init may fail or produce different output |
| A3 | Running `shadcn add` from apps/web auto-routes primitives to packages/ui | Execution Steps | May need to run add from packages/ui directory instead |

## Open Questions

1. **Style name**: Is `new-york` still a valid style, or has it been renamed to `radix-nova`?
   - Recommendation: Run `shadcn init` interactively to see available options, or use `--defaults`

2. **CLI alias handling**: Does the shadcn CLI use the alias prefix from `components.json` when generating imports, or does it hardcode `@workspace`?
   - Recommendation: Test with one component first, inspect generated imports, fix components.json if needed

## Sources

### Primary (HIGH confidence)
- [shadcn/ui monorepo docs](https://ui.shadcn.com/docs/monorepo) - full setup guide
- [shadcn/ui CLI docs](https://ui.shadcn.com/docs/cli) - init command flags
- Filesystem verification of current project state

### Secondary (MEDIUM confidence)
- [GitHub Discussion #6752](https://github.com/shadcn-ui/ui/discussions/6752) - alias resolution via tsconfig
- [shadcn/ui changelog](https://ui.shadcn.com/docs/changelog) - monorepo support added Dec 2024

## Metadata

**Confidence breakdown:**
- Architecture/structure: HIGH - directly from official docs
- Alias resolution (@repo vs @workspace): MEDIUM - official docs use @workspace, our @repo approach needs verification
- Execution steps: MEDIUM - some steps depend on CLI behavior assumptions

**Research date:** 2026-04-06
**Valid until:** 2026-04-20
