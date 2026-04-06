---
phase: quick-260406-ldh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/ui/components.json
  - packages/ui/package.json
  - packages/ui/src/styles/globals.css
  - packages/ui/src/lib/utils.ts
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
  - apps/web/components.json
autonomous: true
requirements: []

must_haves:
  truths:
    - "Running `pnpm dlx shadcn@latest add button` from apps/web installs button into packages/ui/src/components/"
    - "apps/web can import components via @repo/ui/components/button"
    - "pnpm build succeeds across all workspaces"
    - "All 12 previously-installed components are present and CLI-managed"
  artifacts:
    - path: "packages/ui/components.json"
      provides: "shadcn CLI config for shared UI package"
      contains: "@repo/ui"
    - path: "apps/web/components.json"
      provides: "shadcn CLI config for web app"
      contains: "@repo/ui"
    - path: "packages/ui/src/lib/utils.ts"
      provides: "cn() utility"
      exports: ["cn"]
    - path: "packages/ui/src/components/button.tsx"
      provides: "Button component managed by shadcn CLI"
  key_links:
    - from: "apps/web/components.json"
      to: "packages/ui/src/styles/globals.css"
      via: "tailwind.css path"
      pattern: "../../packages/ui/src/styles/globals.css"
    - from: "apps/web/app/globals.css"
      to: "packages/ui/src"
      via: "@source directive for Tailwind class scanning"
      pattern: "@source.*packages/ui/src"
---

<objective>
Reset and re-initialize shadcn/ui using the official monorepo setup so the CLI correctly manages components in packages/ui and apps/web can consume them via @repo/ui.

Purpose: The existing shadcn setup was done manually and has legacy scaffold files. A clean slate re-init ensures `shadcn add` commands work correctly going forward, routing primitive components to packages/ui and composite components to apps/web.

Output: Working shadcn monorepo configuration with all 12 existing components re-installed via CLI.
</objective>

<execution_context>
@/Users/adisakchaiyakul/project/badminton/.claude/get-shit-done/workflows/execute-plan.md
@/Users/adisakchaiyakul/project/badminton/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260406-ldh-install-shadcn-using-monorepo-compatible/260406-ldh-CONTEXT.md
@.planning/quick/260406-ldh-install-shadcn-using-monorepo-compatible/260406-ldh-RESEARCH.md

Key facts from research:
- Package name stays as @repo/ui (per locked CONTEXT.md decision: "Apps consume via @repo/ui workspace dependency")
- Official docs use @workspace/ui as a configurable example; we use @repo/ui which works via pnpm workspace resolution
- Tailwind v4: `tailwind.config` field in components.json must be empty string `""`
- Both workspaces need their own `components.json` with matching style/iconLibrary/baseColor
- CLI routes primitives to packages/ui when run from apps/web
- Existing theme in globals.css uses oklch color tokens -- must be preserved
- Legacy scaffold files (src/button.tsx, src/card.tsx, src/code.tsx) must be removed
- Style name: RESEARCH.md flags `radix-nova` as ASSUMED (may not exist). Must verify before using; fall back to `new-york` if unavailable.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clean slate -- remove legacy files and configure shadcn for @repo/ui</name>
  <files>
    packages/ui/src/button.tsx
    packages/ui/src/card.tsx
    packages/ui/src/code.tsx
    packages/ui/src/components/*.tsx
    packages/ui/src/lib/utils.ts
    packages/ui/package.json
    packages/ui/components.json
    apps/web/components.json
  </files>
  <action>
Step 1: Remove legacy scaffold files from packages/ui/src root:
- Delete `packages/ui/src/button.tsx`
- Delete `packages/ui/src/card.tsx`
- Delete `packages/ui/src/code.tsx`

Step 2: Remove all existing component files in packages/ui/src/components/ (they will be re-added by CLI):
- Delete all .tsx files in `packages/ui/src/components/`

Step 3: Remove existing utils (will be regenerated):
- Delete `packages/ui/src/lib/utils.ts`

Step 4 (PRE-FLIGHT -- style name verification): Determine the correct style name before writing components.json. Run:
```bash
pnpm dlx shadcn@latest init --help 2>&1
```
Check the help output or registry for valid style names. If `radix-nova` is NOT listed as a valid style, use `new-york` instead. If `new-york` is also not listed, use `default`. Capture the verified style name for use in Steps 6 and 7.

Additionally, check what styles are available by attempting:
```bash
pnpm dlx shadcn@latest init --list-styles 2>&1 || true
```
If that flag does not exist, try a dry-run init or inspect the schema at https://ui.shadcn.com/schema.json to confirm valid style values. The key goal: DO NOT write a style name that will cause CLI failures.

Step 5: Update packages/ui/package.json exports map. Keep the package name as `@repo/ui` (do NOT rename). Update exports to:
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
Remove the legacy `./*` catch-all export. Remove the redundant `./styles/globals.css` and `./styles/theme.css` entries since `./styles/*` covers them. Keep all other fields (name, version, private, scripts, dependencies, devDependencies) as-is.

Step 6: Write new `packages/ui/components.json` using the VERIFIED style name from Step 4:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "{VERIFIED_STYLE}",
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

Step 7: Write new `apps/web/components.json` using the VERIFIED style name from Step 4:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "{VERIFIED_STYLE}",
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

Step 8: Run `pnpm install` from the monorepo root to ensure workspace symlinks are up to date after exports change.

IMPORTANT: Back up the contents of `packages/ui/src/styles/globals.css` BEFORE any CLI operations -- it contains the full oklch theme. If shadcn init overwrites it, restore the backup.
  </action>
  <verify>
    <automated>cd /Users/adisakchaiyakul/project/badminton && test ! -f packages/ui/src/button.tsx && test ! -f packages/ui/src/card.tsx && test ! -f packages/ui/src/code.tsx && test -z "$(ls packages/ui/src/components/*.tsx 2>/dev/null)" && grep -q '"@repo/ui"' packages/ui/package.json && grep -q '@repo/ui' packages/ui/components.json && grep -q '@repo/ui' apps/web/components.json && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>
    - Legacy scaffold files (button.tsx, card.tsx, code.tsx) removed from packages/ui/src/
    - All component files removed from packages/ui/src/components/
    - Package name remains @repo/ui (not renamed)
    - Package exports map cleaned up (wildcard patterns only)
    - Both components.json files written with verified style name and @repo/ui aliases
    - globals.css theme backed up / preserved
    - pnpm install succeeds
  </done>
</task>

<task type="auto">
  <name>Task 2: Re-add all components via shadcn CLI and verify build</name>
  <files>
    packages/ui/src/components/badge.tsx
    packages/ui/src/components/button.tsx
    packages/ui/src/components/card.tsx
    packages/ui/src/components/dialog.tsx
    packages/ui/src/components/dropdown-menu.tsx
    packages/ui/src/components/input.tsx
    packages/ui/src/components/label.tsx
    packages/ui/src/components/select.tsx
    packages/ui/src/components/separator.tsx
    packages/ui/src/components/skeleton.tsx
    packages/ui/src/components/sonner.tsx
    packages/ui/src/components/table.tsx
    packages/ui/src/lib/utils.ts
    packages/ui/src/styles/globals.css
  </files>
  <action>
Step 1: From the `apps/web` directory, run shadcn CLI to add all 12 components that previously existed. The CLI should auto-route primitives to packages/ui:
```bash
cd apps/web
pnpm dlx shadcn@latest add badge button card dialog dropdown-menu input label select separator skeleton sonner table --yes --overwrite
```

Use `--yes` to skip prompts and `--overwrite` to handle any conflicts.

If the CLI does NOT route components to packages/ui (i.e., it installs them in apps/web instead), then run the add command from the packages/ui directory instead:
```bash
cd packages/ui
pnpm dlx shadcn@latest add badge button card dialog dropdown-menu input label select separator skeleton sonner table --yes --overwrite
```

Step 2: After adding components, verify that `packages/ui/src/lib/utils.ts` was regenerated by the CLI. It should export the `cn()` function using `clsx` and `tailwind-merge`.

Step 3: Verify `packages/ui/src/styles/globals.css` still has the full oklch theme tokens (`:root` block with `--background`, `--foreground`, etc.). If the CLI overwrote it, restore the backup from Task 1. The file must contain:
- `@import "tailwindcss"`
- `@import "tw-animate-css"`
- `@custom-variant dark`
- `@theme inline` block with all color mappings
- `:root` block with oklch values
- `.dark` block with oklch values
- `@layer base` block

Step 4: Run `pnpm install` from monorepo root to ensure all new dependencies from added components are installed.

Step 5: Run type check and build:
```bash
cd /Users/adisakchaiyakul/project/badminton
pnpm --filter @repo/ui check-types
pnpm build
```

If type errors occur related to `@repo/ui` imports, check that pnpm workspace resolution is working. The workspace symlink at node_modules/@repo/ui should point to packages/ui.

Step 6: Verify the CLI is properly configured for future use by doing a dry check -- confirm that `components.json` in both workspaces has valid paths and all referenced directories exist.

IMPORTANT: If the CLI generates components with different import patterns than expected (e.g., using a different alias prefix), inspect the generated component files and fix the components.json aliases accordingly. The generated imports in component files MUST resolve via the @repo/ui package exports.
  </action>
  <verify>
    <automated>cd /Users/adisakchaiyakul/project/badminton && test -f packages/ui/src/components/button.tsx && test -f packages/ui/src/components/card.tsx && test -f packages/ui/src/components/dialog.tsx && test -f packages/ui/src/components/badge.tsx && test -f packages/ui/src/components/sonner.tsx && test -f packages/ui/src/components/table.tsx && test -f packages/ui/src/lib/utils.ts && grep -q 'oklch' packages/ui/src/styles/globals.css && pnpm build 2>&1 | tail -5 && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>
    - All 12 components (badge, button, card, dialog, dropdown-menu, input, label, select, separator, skeleton, sonner, table) exist in packages/ui/src/components/
    - packages/ui/src/lib/utils.ts exists with cn() export
    - globals.css preserves oklch theme tokens
    - pnpm build succeeds across all workspaces
    - shadcn CLI is properly configured for future `shadcn add` commands from apps/web
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No trust boundaries applicable -- this is a developer tooling configuration task with no runtime user input, network boundaries, or data processing.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | T (Tampering) | pnpm dlx shadcn@latest | accept | CLI fetched from npm registry; standard dev tooling risk accepted for all npm packages |
</threat_model>

<verification>
1. `pnpm build` succeeds from monorepo root
2. `packages/ui/src/components/` contains all 12 component files
3. `packages/ui/components.json` and `apps/web/components.json` both have correct verified style and `@repo/ui` aliases
4. Package name in `packages/ui/package.json` is still `@repo/ui`
5. `packages/ui/src/styles/globals.css` has oklch theme tokens preserved
6. Running `pnpm dlx shadcn@latest add button --overwrite` from apps/web correctly targets packages/ui
</verification>

<success_criteria>
- Clean shadcn monorepo setup: both components.json files follow official pattern with @repo/ui aliases
- All 12 previously-existing components reinstalled via CLI
- Full build passes (pnpm build)
- Future `shadcn add` commands work correctly from apps/web
- Package name unchanged as @repo/ui
</success_criteria>

<output>
After completion, create `.planning/quick/260406-ldh-install-shadcn-using-monorepo-compatible/260406-ldh-SUMMARY.md`
</output>
