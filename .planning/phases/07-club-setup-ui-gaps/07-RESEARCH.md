# Phase 7: Club Setup UI Gaps - Research

**Researched:** 2026-04-11
**Domain:** Next.js React UI — club detail page, settings page, Elysia.js API
**Confidence:** HIGH

## Summary

This phase closes two audit gaps: (1) displaying `homeCourtLocation` in the club detail page, and (2) adding an "Unlink Group" button to the club settings page that calls `DELETE /api/clubs/:id/link`.

Most of the work is already done or very close to done. The `ClubForm` component already includes `homeCourtLocation`. The `DELETE /api/clubs/:id/link` endpoint already exists in `club-link.ts`. The settings page `handleSubmit` type is missing `homeCourtLocation` — a one-line fix. The club detail page `Club` interface is missing `homeCourtLocation` and its grid has only 3 cards instead of 4.

The unlink flow requires a new client-side interaction: a confirmation dialog (from `@repo/ui/components/dialog`) and a success toast. The web app root layout does NOT include a `<Toaster />` — this must be added before toast notifications work on non-LIFF pages.

**Primary recommendation:** Three surgical changes — (1) update detail page interface + add 4th card, (2) fix settings page type + add unlink section, (3) add `<Toaster />` to root layout.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Unlink Group button goes on the club settings page only (not detail page)
- **D-02:** Clicking Unlink shows a confirmation dialog warning that bot notifications will stop — user must confirm before proceeding
- **D-03:** After unlinking, show success toast and refresh the page state
- **D-04:** Add homeCourtLocation as a 4th card in the club detail page grid (alongside Max Players, Shuttlecock Fee, Court Fee)
- **D-05:** If homeCourtLocation is empty/null, either hide the card or show "Not set"

### Claude's Discretion
- Warning text copy for unlink confirmation dialog
- Whether to show "Not set" or hide the location card when empty
- API endpoint implementation details for DELETE /api/clubs/:id/link

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLUB-01 | Club owner creates a club with name, home court/location, default shuttlecock fee, default court fee, default max players | `ClubForm` already has the field; API POST/PUT already accept `homeCourtLocation`; detail page needs the display card added |
| CLUB-02 | Owner adds Line bot to group; bot detects join event and links group; owner can unlink a group via settings | `DELETE /api/clubs/:id/link` already exists in `club-link.ts`; web UI proxy route supports DELETE; settings page needs the unlink button + dialog |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@repo/ui/components/dialog` | (monorepo) | Confirmation dialog for unlink | Already installed — Radix Dialog via shadcn [VERIFIED: codebase] |
| `@repo/ui/components/sonner` | (monorepo) | Toast notifications | Already installed — sonner via shadcn [VERIFIED: codebase] |
| `@repo/ui/components/card` | (monorepo) | homeCourtLocation display card | Already used in detail page [VERIFIED: codebase] |
| `@repo/ui/components/button` | (monorepo) | Unlink trigger button | Already used everywhere [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` (toast function) | (bundled) | Programmatic success toast | Call `toast.success(...)` after DELETE resolves |

**Installation:** No new packages needed. All components exist in `packages/ui/src/components/`. [VERIFIED: codebase]

## Architecture Patterns

### Recommended Project Structure

No new files/directories needed. Changes are confined to:

```
apps/web/
├── app/
│   ├── layout.tsx                    # Add <Toaster /> here
│   └── clubs/[id]/
│       ├── page.tsx                  # Add homeCourtLocation card + interface field
│       └── settings/
│           └── page.tsx              # Fix handleSubmit type + add unlink section
apps/api/
└── src/routes/
    └── club-link.ts                  # Already has DELETE /:id/link — no changes needed
```

### Pattern 1: Dialog-Confirmed Destructive Action (Settings Page)

**What:** Wrap the unlink button in a Dialog. The trigger opens a modal; the modal footer has Cancel and Confirm buttons. Confirm calls the DELETE endpoint.

**When to use:** Any destructive action requiring user acknowledgment — matches D-02.

```tsx
// Source: packages/ui/src/components/dialog.tsx (Radix Dialog pattern)
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@repo/ui/components/dialog";
import { toast } from "sonner";

// Inside the settings page client component:
const [unlinking, setUnlinking] = useState(false);

const handleUnlink = async () => {
  setUnlinking(true);
  try {
    const res = await fetch(`/api/proxy/clubs/${params.id}/link`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to unlink");
    toast.success("LINE Group unlinked successfully");
    // Refresh club state
    const updated = await fetch(`/api/proxy/clubs/${params.id}`);
    if (updated.ok) setClub(await updated.json());
  } catch {
    toast.error("Failed to unlink group");
  } finally {
    setUnlinking(false);
  }
};
```

### Pattern 2: Conditional Card Display (Detail Page)

**What:** Add `homeCourtLocation` to the `Club` interface; render the 4th card conditionally or show "Not set".

```tsx
// apps/web/app/clubs/[id]/page.tsx
interface Club {
  // ... existing fields ...
  homeCourtLocation: string | null;  // ADD THIS
}

// In the grid (change md:grid-cols-3 to md:grid-cols-4 or keep 3 and add separately):
{(club.homeCourtLocation || true) && (  // Always render, show "Not set" if empty — or use D-05 discretion
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Home Court
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">
        {club.homeCourtLocation ?? "Not set"}
      </p>
    </CardContent>
  </Card>
)}
```

### Pattern 3: Settings Page Type Fix

**What:** `handleSubmit` type is missing `homeCourtLocation`. It already passes `homeCourtLocation` via `defaultValues` to `ClubForm`, but the type omits it — so TypeScript would error when submitting.

```tsx
// apps/web/app/clubs/[id]/settings/page.tsx — current (WRONG):
const handleSubmit = async (data: {
  name: string;
  defaultMaxPlayers: number;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;  // missing homeCourtLocation
}) => { ... }

// Fixed — add homeCourtLocation?:
const handleSubmit = async (data: {
  name: string;
  homeCourtLocation?: string;
  defaultMaxPlayers: number;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;
}) => { ... }
```

### Pattern 4: Root Layout Toaster

**What:** `<Toaster />` is only in the LIFF layout. The settings page is under the web layout (`apps/web/app/layout.tsx`), which has no `<Toaster />`. Toast calls will silently do nothing without it.

```tsx
// apps/web/app/layout.tsx — add:
import { Toaster } from "@repo/ui/components/sonner";

// Inside <body>:
<Toaster />
```

### Anti-Patterns to Avoid

- **Calling DELETE on the API URL directly from the browser:** The proxy pattern (`/api/proxy/clubs/:id/link`) is already established — always use the proxy route, not the API server URL directly.
- **Using `router.refresh()` alone for state:** The settings page is a client component that manages state in `useState`. After unlinking, re-fetch the club from the proxy and call `setClub(updated)` to reflect the new `lineGroupId: null` in the badge.
- **Adding Toaster to `app/layout.tsx` without `"use client"` wrapper:** `Toaster` is already a `"use client"` component via the `@repo/ui/components/sonner` export. The layout itself can stay a server component — just import and render the Toaster directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal with portal + overlay | `@repo/ui/components/dialog` (Radix) | Handles focus trap, keyboard dismiss, aria-modal [VERIFIED: codebase] |
| Toast notifications | Custom alert div | `sonner` via `@repo/ui/components/sonner` | Already wired in LIFF layout; consistent UX [VERIFIED: codebase] |

## Common Pitfalls

### Pitfall 1: Toaster Not in Root Layout
**What goes wrong:** `toast.success(...)` called on settings page produces no visible toast.
**Why it happens:** `<Toaster />` only exists in LIFF layout (`apps/web/app/liff/layout.tsx`). The club settings page (`/clubs/:id/settings`) uses the root layout which has no Toaster.
**How to avoid:** Add `<Toaster />` to `apps/web/app/layout.tsx`.
**Warning signs:** `toast` import works but nothing appears on screen.

### Pitfall 2: Club Interface Missing homeCourtLocation in Detail Page
**What goes wrong:** TypeScript error or runtime `undefined` when accessing `club.homeCourtLocation` on the detail page.
**Why it happens:** The `Club` interface in `page.tsx` does not include `homeCourtLocation` even though the API already returns it (`GET /api/clubs/:id` selects it in the Drizzle query).
**How to avoid:** Add `homeCourtLocation: string | null` to the interface.

### Pitfall 3: Settings Page handleSubmit Type Mismatch
**What goes wrong:** TypeScript error: `homeCourtLocation` not in type when `ClubForm` calls `onSubmit(data)`.
**Why it happens:** `handleSubmit` prop type omits `homeCourtLocation` even though `ClubForm`'s `onSubmit` signature includes it.
**How to avoid:** Add `homeCourtLocation?: string` to the `handleSubmit` parameter type.

### Pitfall 4: DELETE proxy route may not exist
**What goes wrong:** `fetch('/api/proxy/clubs/:id/link', { method: 'DELETE' })` returns 404.
**Why it happens:** The proxy route at `apps/web/app/api/proxy/[...path]/route.ts` uses a catch-all — need to verify it proxies DELETE method.
**How to avoid:** Check the proxy handler before assuming DELETE works.

## Code Examples

### Proxy Route Verification Needed
Before implementing the unlink fetch, verify the catch-all proxy at `apps/web/app/api/proxy/[...path]/route.ts` exports a `DELETE` handler (or uses a generic passthrough). [ASSUMED — not yet read]

### Dialog Import Pattern
```tsx
// Source: packages/ui/src/components/dialog.tsx (verified exists)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@repo/ui/components/dialog";
```

### Club Interface Update (Detail Page)
```tsx
interface Club {
  id: string;
  name: string;
  lineGroupId: string | null;
  homeCourtLocation: string | null;  // ADD
  defaultMaxPlayers: number;
  defaultShuttlecockFee: number;
  defaultCourtFee: number;
  createdAt: string;
  role: string;
}
```

## Open Questions

1. **Proxy DELETE method support**
   - What we know: Proxy catch-all exists at `/api/proxy/[...path]/route.ts`
   - What's unclear: Whether it exports a `DELETE` handler or only GET/POST/PUT
   - Recommendation: Read `apps/web/app/api/proxy/[...path]/route.ts` in Wave 1 before writing the unlink fetch call. If DELETE is missing, add it alongside the existing methods.

2. **Grid columns for 4th card**
   - What we know: Current grid is `md:grid-cols-3`
   - What's unclear: Whether Claude's discretion means keeping 3 columns on md and going 4 on lg, or changing md to 4
   - Recommendation: Claude discretion — use `md:grid-cols-2 lg:grid-cols-4` so cards wrap gracefully on small screens.

## Environment Availability

Step 2.6: SKIPPED — this phase is purely UI/API code changes within the existing monorepo. No new external tools, services, CLIs, or runtimes are required.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (API) / no web component tests detected |
| Config file | `apps/api/src/__tests__/clubs.test.ts` |
| Quick run command | `cd apps/api && bun test src/__tests__/clubs.test.ts` |
| Full suite command | `cd apps/api && bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLUB-01 | `homeCourtLocation` returned by GET /api/clubs/:id | unit | `cd apps/api && bun test src/__tests__/clubs.test.ts` | ✅ |
| CLUB-01 | `homeCourtLocation` accepted by PUT /api/clubs/:id | unit | `cd apps/api && bun test src/__tests__/clubs.test.ts` | ✅ |
| CLUB-02 | DELETE /api/clubs/:id/link clears lineGroupId | unit | `cd apps/api && bun test src/__tests__/clubs.test.ts` | ✅ (verify coverage) |

### Sampling Rate
- **Per task commit:** `cd apps/api && bun test src/__tests__/clubs.test.ts`
- **Per wave merge:** `cd apps/api && bun test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Verify `clubs.test.ts` covers `DELETE /api/clubs/:id/link` — add test if missing
- [ ] No web UI component tests — manual verification via browser is the gate for UI changes

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Session cookie via existing `authMiddleware` on all `/api/clubs` routes |
| V4 Access Control | yes | `requireClubRole(params.id, member.id, ["owner"])` already enforced in DELETE handler |
| V5 Input Validation | yes | Elysia `t.Object` schema on all routes; Zod on ClubForm |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized unlink (non-owner triggers DELETE) | Elevation of Privilege | `requireClubRole(..., ["owner"])` in `club-link.ts` already enforces this |
| CSRF on unlink button | Tampering | Next.js API proxy routes use same-origin cookie — CSRF risk low in same-origin SPA; no additional token needed for MVP |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Catch-all proxy at `/api/proxy/[...path]/route.ts` forwards DELETE method | Open Questions | Unlink fetch returns 404/405; proxy handler needs a DELETE export added |
| A2 | `clubs.test.ts` already has a test for `DELETE /api/clubs/:id/link` | Validation Architecture | Missing coverage; plan must include adding the test |

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `apps/api/src/routes/clubs.ts` [VERIFIED: codebase]
- Codebase direct read — `apps/api/src/routes/club-link.ts` [VERIFIED: codebase — DELETE endpoint exists]
- Codebase direct read — `apps/web/components/club-form.tsx` [VERIFIED: homeCourtLocation field exists]
- Codebase direct read — `apps/web/app/clubs/[id]/page.tsx` [VERIFIED: Club interface missing homeCourtLocation]
- Codebase direct read — `apps/web/app/clubs/[id]/settings/page.tsx` [VERIFIED: handleSubmit type missing homeCourtLocation]
- Codebase direct read — `packages/ui/src/components/` [VERIFIED: dialog.tsx and sonner.tsx exist]
- Codebase direct read — `apps/web/app/layout.tsx` [VERIFIED: no Toaster in root layout]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase
- Architecture: HIGH — all patterns derived from existing code
- Pitfalls: HIGH — gaps confirmed by direct code reading

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable codebase, no fast-moving dependencies)
