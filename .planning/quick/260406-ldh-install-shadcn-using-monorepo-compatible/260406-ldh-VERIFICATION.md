---
phase: quick-260406-ldh
verified: 2026-04-06T00:00:00Z
status: human_needed
score: 3/4 must-have truths verified
human_verification:
  - test: "Run `pnpm dlx shadcn@latest add button --overwrite` from apps/web and confirm button.tsx is written to packages/ui/src/components/button.tsx (not into apps/web)"
    expected: "CLI resolves the `ui` alias in apps/web/components.json to @repo/ui/components and writes the file to packages/ui/src/components/"
    why_human: "Cannot safely invoke a write-path CLI command in verification mode; requires a live terminal session to observe routing behavior"
---

# Quick Task 260406-ldh: Install Shadcn Using Monorepo Compatible Setup — Verification Report

**Task Goal:** Install shadcn using monorepo compatible setup following https://ui.shadcn.com/docs/monorepo
**Verified:** 2026-04-06
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `pnpm dlx shadcn@latest add button` from apps/web installs button into packages/ui/src/components/ | ? HUMAN | Cannot run write-path CLI in verification; SUMMARY documents decision to run from packages/ui instead of apps/web — CLI routing needs live confirmation |
| 2 | apps/web can import components via @repo/ui/components/button | VERIFIED | apps/web components and app pages actively import from `@repo/ui/components/badge`, `@repo/ui/components/button`, etc. via workspace resolution |
| 3 | pnpm build succeeds across all workspaces | VERIFIED (web only) | `pnpm --filter web build` passes. `pnpm build` fails on apps/api due to `@line/bot-sdk` node:buffer error — pre-existing issue explicitly noted in SUMMARY as out-of-scope, apps/api not touched in commits fa2af6e or 75cf783 |
| 4 | All 12 previously-installed components are present and CLI-managed | VERIFIED | All 12 files confirmed in packages/ui/src/components/: badge, button, card, dialog, dropdown-menu, input, label, select, separator, skeleton, sonner, table |

**Score:** 3/4 truths verified (1 requires human confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/ui/components.json` | shadcn CLI config for shared UI package | VERIFIED | Present, contains `@repo/ui` aliases throughout, style `new-york`, Tailwind v4 config `""` |
| `apps/web/components.json` | shadcn CLI config for web app | VERIFIED | Present, contains `@repo/ui` for utils and ui aliases, correct css path `../../packages/ui/src/styles/globals.css` |
| `packages/ui/src/lib/utils.ts` | cn() utility | VERIFIED | Exports `cn()` using `clsx` + `tailwind-merge` |
| `packages/ui/src/components/button.tsx` | Button component managed by shadcn CLI | VERIFIED | 64 lines, full CVA-based implementation, imports `cn` from `@repo/ui/lib/utils`, exports `Button` and `buttonVariants` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `apps/web/components.json` | `packages/ui/src/styles/globals.css` | tailwind.css path | VERIFIED | `"css": "../../packages/ui/src/styles/globals.css"` present in components.json; file exists at that path |
| `apps/web/app/globals.css` | `packages/ui/src` | @source directive for Tailwind class scanning | VERIFIED | `@source "../../../packages/ui/src";` present in globals.css; directory exists |

### Data-Flow Trace (Level 4)

Not applicable — this task produces configuration files and component library code, not runtime data-rendering components.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| packages/ui type-check passes | `pnpm --filter @repo/ui check-types` | Exit 0, no errors | PASS |
| apps/web build succeeds | `pnpm --filter web build` | 10 routes built, dynamic server-rendered routes listed | PASS |
| All 12 component files present | `ls packages/ui/src/components/*.tsx` | 12 files listed | PASS |
| utils.ts exports cn() | Read file | `export function cn(...)` present | PASS |
| globals.css preserves oklch tokens | `grep oklch packages/ui/src/styles/globals.css` | `:root` and `.dark` blocks with oklch values confirmed | PASS |
| apps/web imports resolve @repo/ui | Grep components/ and app/ for @repo/ui imports | Multiple files actively importing via @repo/ui/components/* | PASS |

### Requirements Coverage

No requirement IDs declared in PLAN frontmatter (`requirements: []`). Task is standalone tooling configuration; no REQUIREMENTS.md entries apply.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No anti-patterns detected across component files or configuration files. All 12 components have substantive implementations (13–257 lines each). No TODO/FIXME/placeholder comments found. No empty return patterns.

### Human Verification Required

#### 1. shadcn CLI Routing Confirmation

**Test:** From the `apps/web` directory, run:
```
pnpm dlx shadcn@latest add button --overwrite
```
**Expected:** The CLI reads `apps/web/components.json`, resolves the `ui` alias (`@repo/ui/components`) through the tsconfig path mapping (`@repo/ui/*` → `../../packages/ui/src/*`), and writes the component to `packages/ui/src/components/button.tsx`.

**Why human:** Cannot safely invoke a write-path CLI command during automated verification. The SUMMARY documents that the actual execution deviated from the plan — the CLI was run from `packages/ui` (not `apps/web`) because the `ui` alias routing from apps/web was unreliable. The critical question is whether running from apps/web now correctly routes to packages/ui with the current tsconfig path configuration. This requires a live terminal test.

**Note from SUMMARY:** The decision was made to "Run shadcn CLI from packages/ui (not apps/web)" as a workaround. The must-have truth as written (run from apps/web) may not hold under the implemented approach. If the accepted workflow is now "always run from packages/ui", the must-have truth may need to be updated to match the actual supported workflow.

### Gaps Summary

No hard gaps found. All configuration artifacts are present, correctly structured, and wired. The web app build passes and components are actively imported and consumed. One truth requires live human confirmation: whether the shadcn CLI correctly routes components to packages/ui when invoked from apps/web. The SUMMARY notes a deviation where the CLI was run from packages/ui instead — this routing behavior cannot be verified programmatically without running a write operation.

---

_Verified: 2026-04-06_
_Verifier: Claude (gsd-verifier)_
