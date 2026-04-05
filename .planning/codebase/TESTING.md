# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- No test framework currently configured (Jest, Vitest, etc. not present)
- Testing not yet implemented in codebase

**Assertion Library:**
- Not configured

**Run Commands:**
```bash
# No test commands available
# Testing setup required
```

## Test File Organization

**Location:**
- No test files found in codebase
- Pattern to establish: tests should be co-located with source files or in a `__tests__` directory
- Recommended approach: one test file per component in same directory

**Naming:**
- Recommended pattern: `[ComponentName].test.tsx` or `[ComponentName].spec.tsx`
- Example: `Button.test.tsx` for `button.tsx`

**Structure:**
```
packages/ui/src/
├── button.tsx              # Source
├── button.test.tsx         # Test file (recommended pattern)
├── card.tsx                # Source
├── card.test.tsx           # Test file (recommended pattern)
└── code.tsx                # Source
```

## Test Structure

**Suite Organization:**
```typescript
// Recommended pattern (not yet implemented)
describe("Button", () => {
  describe("rendering", () => {
    it("should render with children", () => {
      // test code
    });

    it("should apply className prop", () => {
      // test code
    });
  });

  describe("interactions", () => {
    it("should trigger alert on click", () => {
      // test code
    });
  });
});
```

**Patterns:**
- Recommended: Arrange-Act-Assert (AAA) pattern
- No setup/teardown patterns established yet

**Example for Button component (recommended approach):**
```typescript
describe("Button", () => {
  it("should render children correctly", () => {
    // Arrange
    const { getByText } = render(
      <Button appName="test">Click me</Button>
    );
    
    // Act
    const button = getByText("Click me");
    
    // Assert
    expect(button).toBeInTheDocument();
  });

  it("should show alert with appName on click", () => {
    // Arrange
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();
    const { getByText } = render(
      <Button appName="myapp">Click</Button>
    );
    
    // Act
    fireEvent.click(getByText("Click"));
    
    // Assert
    expect(alertSpy).toHaveBeenCalledWith("Hello from your myapp app!");
    
    // Cleanup
    alertSpy.mockRestore();
  });
});
```

## Mocking

**Framework:** 
- Not configured yet

**Patterns:**
- Recommended for Button component: mock `window.alert` for click handler testing
- Recommended for Card component: mock href attributes if needed
- No data fetching currently in components, so no API mocking needed

**What to Mock:**
- Browser APIs (window.alert, window.location, etc.)
- External click handlers and event listeners
- Module dependencies if needed (rare in simple component library)

**What NOT to Mock:**
- React components in same package (test real interactions)
- Simple HTML elements

## Fixtures and Factories

**Test Data:**
- Recommended for component props:
```typescript
// Fixture example for Button
const defaultButtonProps = {
  children: "Click me",
  appName: "test",
  className: "custom-class",
};

// Factory example for Card
const createCardProps = (overrides = {}) => ({
  title: "Test Title",
  children: "Test Content",
  href: "https://example.com",
  className: "card",
  ...overrides,
});
```

**Location:**
- Recommended: `__tests__/fixtures.ts` or `*.fixtures.ts` alongside test files

## Coverage

**Requirements:** 
- Not enforced yet
- Recommended target: 80%+ for critical components

**View Coverage:**
```bash
# Not configured - would be added with test framework setup
# Example for Jest: npm run test:coverage
# Example for Vitest: npm run coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual React components in isolation
- Approach: Test prop handling, rendering, and onClick handlers
- Example targets:
  - `Button.tsx`: Render with props, verify alert behavior
  - `Card.tsx`: Render with all prop combinations, verify href construction
  - `Code.tsx`: Render with children and className

**Integration Tests:**
- Scope: Multiple components working together
- Not yet implemented
- Example: Test Button within a page layout

**E2E Tests:**
- Framework: Not currently used
- Recommended: Playwright or Cypress for next phases
- Would test: Full user workflows across apps

## Common Patterns

**Async Testing:**
- Not currently applicable (no async operations in components)
- Pattern when needed:
```typescript
it("should handle async prop update", async () => {
  const { rerender } = render(<Component initialProp="a" />);
  
  await waitFor(() => {
    rerender(<Component initialProp="b" />);
  });
  
  expect(screen.getByText("b")).toBeInTheDocument();
});
```

**Error Testing:**
- Not currently applicable (no error states in components)
- Pattern when needed:
```typescript
it("should handle missing required props", () => {
  // This would be caught by TypeScript, but runtime testing:
  expect(() => render(<Button />)).toThrow();
});
```

## Recommended Testing Setup Path

**Phase 1 - Setup:**
1. Install test framework (Jest recommended for monorepo, Vitest for faster alternative)
2. Add to `package.json`: `"test": "jest"`, `"test:watch": "jest --watch"`
3. Create `jest.config.js` or `vitest.config.ts`
4. Add testing library: `@testing-library/react` and `@testing-library/jest-dom`

**Phase 2 - Component Tests:**
1. Write unit tests for all components in `packages/ui/src/`
2. Target: 80%+ coverage
3. Include: render, prop handling, interactions

**Phase 3 - App Tests:**
1. Add integration tests for `apps/web` and `apps/docs`
2. Test component composition and page layouts

**Phase 4 - E2E Tests:**
1. Add Playwright or Cypress
2. Test user workflows

## Configuration Files to Create

**jest.config.js (recommended for monorepo):**
```javascript
export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/packages", "<rootDir>/apps"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  moduleNameMapper: {
    "^@repo/(.*)$": "<rootDir>/packages/$1",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
};
```

**Alternative: vitest.config.ts:**
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

---

*Testing analysis: 2026-04-05*

## Status

**Current:** Testing framework not yet implemented. Zero test files exist.

**Recommendation:** Implement Jest or Vitest before adding significant new features. All components in `packages/ui/` should have test coverage. Start with Phase 1 setup immediately.
