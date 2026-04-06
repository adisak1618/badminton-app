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
  - apps/web/app/globals.css
autonomous: true
requirements: []

must_haves:
  truths:
    - "Running `pnpm dlx shadcn@latest add button` from apps/web installs button into packages/ui/src/components/"
    - "apps/web can import components via @workspace/ui/components/button"
    - "pnpm build succeeds across all workspaces"
    - "All 12 previously-installed components are present and CLI-managed"
  artifacts:
    - path: "packages/ui/components.json"
      provides: "shadcn CLI config for shared UI package"
      contains: "@workspace/ui"
    - path: "apps/web/components.json"
      provides: "shadcn CLI config for web app"
      contains: "@workspace/ui"
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
Reset and re-initialize shadcn/ui using the official monorepo setup so the CLI correctly manages components in packages/ui and apps/web can consume them.

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
- Style name is now `radix-nova` (not `new-york`)
- Official docs use `@workspace/ui` alias convention (not `@repo/ui`)
- Tailwind v4: `tailwind.config` field in components.json must be empty string `""`
- Both workspaces need their own `components.json` with matching style/iconLibrary/baseColor
- CLI routes primitives to packages/ui when run from apps/web
- Existing theme in globals.css uses oklch color tokens — must be preserved
- Legacy scaffold files (src/button.tsx, src/card.tsx, src/code.tsx) must be removed
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clean slate — remove legacy files and update package naming to @workspace/ui</name>
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

Step 4: Update packages/ui/package.json — change the package name from `@repo/ui` to `@workspace/ui` to match the official shadcn monorepo convention. Update the exports map to:
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
Remove the legacy `./*` catch-all export. Remove the redundant `./styles/globals.css` and `./styles/theme.css` entries since `./styles/*` covers them. Keep all other fields (scripts, dependencies, devDependencies) as-is.

Step 5: Update ALL workspace references from `@repo/ui` to `@workspace/ui` across the monorepo. Search for `@repo/ui` in:
- `apps/web/package.json` (dependency reference)
- `apps/web/app/globals.css` (import of theme.css)
- `apps/web/tsconfig.json` or any tsconfig files
- Any other files importing from `@repo/ui`

For `apps/web/app/globals.css`, update the import to:
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@workspace/ui/styles/theme.css";

@source "../../../packages/ui/src";
```

Step 6: Write new `packages/ui/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
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
    "components": "@workspace/ui/components",
    "utils": "@workspace/ui/lib/utils",
    "hooks": "@workspace/ui/hooks",
    "lib": "@workspace/ui/lib",
    "ui": "@workspace/ui/components"
  }
}
```

Step 7: Write new `apps/web/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
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
    "utils": "@workspace/ui/lib/utils",
    "ui": "@workspace/ui/components"
  }
}
```

Step 8: Run `pnpm install` from the monorepo root to update workspace symlinks for the renamed package.

IMPORTANT: The style MUST be `radix-nova` (the current shadcn style name). The old `new-york` style may not be recognized by the latest CLI.

IMPORTANT: Back up the contents of `packages/ui/src/styles/globals.css` BEFORE any CLI operations — it contains the full oklch theme. If shadcn init overwrites it, restore the backup. The theme.css file (if it exists and is non-empty) should also be backed up.
  </action>
  <verify>
    <automated>cd /Users/adisakchaiyakul/project/badminton && test ! -f packages/ui/src/button.tsx && test ! -f packages/ui/src/card.tsx && test ! -f packages/ui/src/code.tsx && test ! -d packages/ui/src/components || test -z "$(ls packages/ui/src/components/ 2>/dev/null)" && grep -q '"@workspace/ui"' packages/ui/package.json && grep -q 'radix-nova' packages/ui/components.json && grep -q 'radix-nova' apps/web/components.json && grep -q '@workspace/ui' apps/web/app/globals.css && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>
    - Legacy scaffold files (button.tsx, card.tsx, code.tsx) removed from packages/ui/src/
    - All component files removed from packages/ui/src/components/
    - Package renamed from @repo/ui to @workspace/ui
    - All references updated from @repo/ui to @workspace/ui across monorepo
    - Both components.json files written with radix-nova style and correct aliases
    - globals.css theme backed up / preserved
    - pnpm install succeeds with updated package name
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
pnpm --filter @workspace/ui check-types
pnpm build
```

If type errors occur related to `@workspace/ui` imports, check that tsconfig path mappings or pnpm workspace resolution is working. The workspace symlink at node_modules/@workspace/ui should point to packages/ui.

Step 6: Verify the CLI is properly configured for future use by doing a dry check — confirm that `components.json` in both workspaces has valid paths and all referenced directories exist.

IMPORTANT: If the style `radix-nova` causes the CLI to generate components with different import patterns or different CSS variable names than what exists in globals.css, you may need to let the CLI regenerate globals.css and then merge back the oklch color values into the new structure.
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

No trust boundaries applicable — this is a developer tooling configuration task with no runtime user input, network boundaries, or data processing.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | T (Tampering) | pnpm dlx shadcn@latest | accept | CLI fetched from npm registry; standard dev tooling risk accepted for all npm packages |
</threat_model>

<verification>
1. `pnpm build` succeeds from monorepo root
2. `packages/ui/src/components/` contains all 12 component files
3. `packages/ui/components.json` and `apps/web/components.json` both have `radix-nova` style and `@workspace/ui` aliases
4. No references to `@repo/ui` remain in the codebase (replaced with `@workspace/ui`)
5. `packages/ui/src/styles/globals.css` has oklch theme tokens preserved
6. Running `pnpm dlx shadcn@latest add button --overwrite` from apps/web correctly targets packages/ui
</verification>

<success_criteria>
- Clean shadcn monorepo setup: both components.json files follow official pattern
- All 12 previously-existing components reinstalled via CLI
- Full build passes (pnpm build)
- Future `shadcn add` commands work correctly from apps/web
- Package renamed to @workspace/ui following official convention
</success_criteria>

<output>
After completion, create `.planning/quick/260406-ldh-install-shadcn-using-monorepo-compatible/260406-ldh-SUMMARY.md`
</output>
