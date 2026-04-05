# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- React components: camelCase (e.g., `button.tsx`, `card.tsx`, `code.tsx`)
- Component exports use PascalCase for the component name itself (e.g., `export const Button`, `export function Card`)
- Interfaces and types: PascalCase (e.g., `ButtonProps`)
- Configuration files: lowercase with dots (e.g., `eslint.config.js`, `next.config.js`)

**Functions:**
- Exported React components: PascalCase (e.g., `function Card(...)`, `const Button = (...)`)
- Helper functions and utilities: camelCase
- Arrow functions preferred for React components with hooks (e.g., `const Button = ({ ... }) => { ... }`)
- Traditional function declarations used for simple, non-hook components (e.g., `export function Card({ ... })`)

**Variables:**
- Local variables and parameters: camelCase
- Props interfaces: `[ComponentName]Props` (e.g., `ButtonProps`)
- Boolean variables: prefixed with `is` or similar intent (rarely used in current codebase)

**Types:**
- Type aliases: PascalCase (e.g., `Props`, `Metadata`)
- Use `type` keyword for props objects: `type Props = { ... }` or `interface [Name]Props`
- Imported types: explicitly marked with `type` keyword to distinguish from values (e.g., `import { type JSX } from "react"`, `import type { Metadata } from "next"`)

## Code Style

**Formatting:**
- Prettier v3.7.4 handles all formatting
- Command: `prettier --write "**/*.{ts,tsx,md}"`
- Enforced across monorepo with single root configuration
- No `.prettierrc` file - uses Prettier defaults

**Linting:**
- ESLint v9 with modern flat config format (`.config.js` files, not `.eslintrc`)
- Base config: `packages/eslint-config/base.js`
- Next.js apps: `packages/eslint-config/next.js`
- React libraries: `packages/eslint-config/react-internal.js`
- Strict mode: `--max-warnings 0` enforced (zero warnings allowed)
- Key rules inherited from:
  - `@eslint/js` recommended
  - `typescript-eslint/recommended`
  - `eslint-config-prettier` (conflict resolution)
  - `eslint-plugin-react` for React components
  - `eslint-plugin-react-hooks` for hook rules
  - `eslint-plugin-turbo` for monorepo consistency

**TypeScript Strictness:**
- Base config: `packages/typescript-config/base.json`
  - `"strict": true` - all strict checks enabled
  - `"noUncheckedIndexedAccess": true` - prevents unsafe indexed access
  - `"isolatedModules": true` - ensures transpilation safety
  - `"declaration": true` - generates .d.ts files
  - Target: ES2022
  - Module: NodeNext
- React libraries: extends base + `"jsx": "react-jsx"`
- Next.js apps: extends base + `"jsx": "preserve"` + allowJs: true
- Additional: `strictNullChecks: true` enforced on `packages/ui/tsconfig.json` and `apps/web/tsconfig.json`

## Import Organization

**Order:**
1. External packages and libraries (React, Next.js, etc.)
2. Type-only imports (marked with `import { type ... }`)
3. Workspace internal packages (e.g., `@repo/ui`, `@repo/eslint-config`)
4. Relative imports (not currently used in observed files)

**Examples:**
```typescript
// ✓ Correct - external first, then types, then workspace
import Image, { type ImageProps } from "next/image";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";

// ✓ Correct - explicit type imports
import { type JSX } from "react";
import type { Metadata } from "next";

// ✓ Correct - "use client" directive at top
"use client";
import { ReactNode } from "react";
```

**Path Aliases:**
- Not configured in current codebase
- Direct imports from workspace packages: `@repo/[package]/[export]`
- Monorepo uses Turborepo with workspace protocol (`workspace:*`)

## Error Handling

**Patterns:**
- No explicit error handling patterns found in current codebase
- Components assume valid props are provided
- No try-catch blocks in observed component code
- TypeScript strict mode catches null/undefined issues at compile time

**Future Considerations:**
- Error boundaries recommended for React components (not currently implemented)
- Validate required props with TypeScript interface definitions

## Logging

**Framework:** console only

**Patterns:**
- No logging framework configured
- Direct `console` usage not observed in current codebase
- Alert-based feedback used in client components (e.g., `Button` component)

## Comments

**When to Comment:**
- JSDoc blocks used for ESLint config exports
- Inline comments explain non-obvious logic
- Component purposes documented when complex

**JSDoc/TSDoc:**
- Used in configuration files: `@type` annotations for ESLint configs
- Not applied to component files currently observed
- Recommended for public API exports but not enforced

**Example from codebase:**
```typescript
/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  // configuration items
];
```

## Function Design

**Size:** 
- Prefer small, focused functions
- Single component per file approach (observed in `packages/ui/src/`)

**Parameters:**
- Use destructuring for props: `({ children, className, appName }: ButtonProps) => { ... }`
- Group related props into interfaces
- Use inline prop types with `{ prop: Type }` syntax

**Return Values:**
- Explicit return types on functions: `function Card(...): JSX.Element`
- Components return JSX elements
- React 19+ with new JSX transform (no need for React in scope)

**Examples:**
```typescript
// ✓ Function with destructured props and return type
export function Card({
  className,
  title,
  children,
  href,
}: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}): JSX.Element {
  return (
    <a className={className} href={`${href}?utm_source=...`}>
      <h2>{title} <span>-&gt;</span></h2>
      <p>{children}</p>
    </a>
  );
}

// ✓ Arrow function component with interface
interface ButtonProps {
  children: ReactNode;
  className?: string;
  appName: string;
}

export const Button = ({ children, className, appName }: ButtonProps) => {
  return (
    <button className={className} onClick={() => alert(`Hello from your ${appName} app!`)}>
      {children}
    </button>
  );
};
```

## Module Design

**Exports:**
- Use `export const` for components: `export const Button = (...) => { ... }`
- Use `export function` for named function components: `export function Card(...) { ... }`
- Single export per file (one component per file pattern)

**Barrel Files:**
- Not used in current codebase
- Each package exports individual components: `@repo/ui/button`, `@repo/ui/card`

**File Organization:**
```
packages/ui/src/
├── button.tsx       # Single component file
├── card.tsx         # Single component file
└── code.tsx         # Single component file
```

## TypeScript Specific Conventions

**Prop Types:**
- Two approaches observed and both acceptable:
  1. Inline type object: `function Card({ prop }: { prop: Type }): JSX.Element`
  2. Separate interface: `interface ButtonProps { ... }`
- Prefer consistency within a package
- Optional props marked with `?`
- Required props have no modifier

**React-Specific:**
- Use `React.ReactNode` or `ReactNode` for children
- Use `JSX.Element` for explicit return type
- Client-side components marked with `"use client"` directive
- Server-side as default (no directive needed)

---

*Convention analysis: 2026-04-05*
