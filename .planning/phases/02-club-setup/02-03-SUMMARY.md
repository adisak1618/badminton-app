---
phase: 02-club-setup
plan: 03
subsystem: ui
tags: [nextjs, react, shadcn-ui, react-hook-form, zod, typescript]

# Dependency graph
requires:
  - phase: 02-01
    provides: Line Login OAuth, iron-session, middleware, layout with nav
  - phase: 02-02
    provides: Elysia API routes for clubs, members, role management, group linking

provides:
  - API client helper (apiClient) with session cookie forwarding for server components
  - Next.js proxy route /api/proxy/[...path] for client-side API calls with session
  - Club list page /clubs showing user's clubs with role badges and linked status
  - Club creation page /clubs/create with validated form
  - Club detail page /clubs/[id] with defaults display
  - Club settings page /clubs/[id]/settings for editing defaults
  - Club members page /clubs/[id]/members with owner role management
  - Group linking page /clubs/link?groupId=... for bot setup flow
  - Reusable components: ClubCard, ClubForm, MemberList

affects:
  - 02-04 (bot setup link page is the destination for the bot's setup URL)
  - 04-events (event creation will reuse ClubForm patterns and default values)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server components use apiClient (cookies() forwarding) for data fetching
    - Client components use /api/proxy/[...path] route for mutations
    - react-hook-form + zod (z.number() + valueAsNumber) for numeric input validation

key-files:
  created:
    - apps/web/lib/api.ts
    - apps/web/components/club-card.tsx
    - apps/web/components/club-form.tsx
    - apps/web/components/member-list.tsx
    - apps/web/app/clubs/page.tsx
    - apps/web/app/clubs/create/page.tsx
    - apps/web/app/api/proxy/[...path]/route.ts
    - apps/web/app/clubs/[id]/page.tsx
    - apps/web/app/clubs/[id]/settings/page.tsx
    - apps/web/app/clubs/[id]/members/page.tsx
    - apps/web/app/clubs/link/page.tsx
  modified:
    - apps/web/components/club-form.tsx (type fix during Task 3)

key-decisions:
  - "Use z.number() + valueAsNumber in react-hook-form instead of z.coerce.number() to avoid zod v4 unknown input type inference breaking hookform/resolvers compatibility"
  - "Proxy route /api/proxy/[...path] handles all client-side mutations by forwarding session cookie — avoids exposing API_BASE_URL to the browser"
  - "Link page wraps useSearchParams() in Suspense boundary per Next.js 16 requirement for client components using search params"

patterns-established:
  - "Pattern 1: Server component data fetching uses apiClient.get() which reads cookies() server-side"
  - "Pattern 2: Client component mutations POST/PUT/DELETE to /api/proxy/* which adds session cookie before forwarding to API"
  - "Pattern 3: Numeric form fields use z.number() + { valueAsNumber: true } registration to avoid zod v4 coerce type issues"

requirements-completed: [CLUB-01, CLUB-02, CLUB-03, CLUB-04, CLUB-05]

# Metrics
duration: 25min
completed: 2026-04-06
---

# Phase 02 Plan 03: Club Management Dashboard Summary

**Full club dashboard with server-side API client, proxy route, and 6 pages (list, create, detail, settings, members, group linking) using shadcn/ui components**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-06T00:00:00Z
- **Completed:** 2026-04-06T00:25:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Built apiClient server-side helper that forwards iron-session cookie to Elysia API — enables type-safe data fetching in server components
- Created /api/proxy/[...path] catch-all route so client components can call the API without exposing the backend URL or handling auth manually
- Delivered all 6 club management pages: list, create, detail, settings, members, and LINE group linking

## Task Commits

Each task was committed atomically:

1. **Task 1: Create API client helper and reusable components** - `b8c7b36` (feat)
2. **Task 2: Create club list page and club creation page** - `280499a` (feat)
3. **Task 3: Create club detail, settings, members, and group linking pages** - `7cbbcc6` (feat)

## Files Created/Modified

- `apps/web/lib/api.ts` - Server-side ApiClient class; exports apiClient singleton with get/post/put/delete methods that forward badminton-session cookie
- `apps/web/components/club-card.tsx` - Club card with role badge, linked/not-linked badge, and default settings display
- `apps/web/components/club-form.tsx` - Reusable form for create and edit flows; uses react-hook-form + zod; valueAsNumber for numeric fields
- `apps/web/components/member-list.tsx` - Table with role badges and promote/demote buttons (owner-only); optimistic local state update
- `apps/web/app/clubs/page.tsx` - Server component; fetches club list via apiClient; shows ClubCard list or empty state CTA
- `apps/web/app/clubs/create/page.tsx` - Client component; renders ClubForm; POSTs to /api/proxy/clubs; redirects to /clubs
- `apps/web/app/api/proxy/[...path]/route.ts` - Catch-all proxy; reads badminton-session cookie; forwards GET/POST/PUT/DELETE to API_BASE_URL
- `apps/web/app/clubs/[id]/page.tsx` - Server component; shows club name, role, linked status, 3 defaults cards, Settings/Members nav for owner/admin
- `apps/web/app/clubs/[id]/settings/page.tsx` - Client component; loads club via proxy on mount; renders ClubForm pre-filled; PUTs on save
- `apps/web/app/clubs/[id]/members/page.tsx` - Client component; loads members + current role in parallel; renders MemberList with optimistic role updates
- `apps/web/app/clubs/link/page.tsx` - Client component with Suspense wrapper; reads groupId from URL; shows owner's unlinked clubs; POSTs to /api/proxy/clubs/link

## Decisions Made

- Used `z.number()` with `{ valueAsNumber: true }` in react-hook-form registration instead of `z.coerce.number()` — zod v4 changed coerce input inference to `unknown`, which breaks hookform/resolvers type compatibility. The `valueAsNumber` approach lets the browser coerce the string to number before validation.
- Wrapped `/clubs/link` page's `useSearchParams()` usage in a `Suspense` boundary — Next.js 16 requires this for client components that access search params during SSR.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed zod v4 + react-hook-form type error in club-form.tsx**
- **Found during:** Task 3 type check run
- **Issue:** `z.coerce.number()` in zod v4 infers input type as `unknown`, causing `Resolver` type mismatch with react-hook-form's `ClubFormData` type
- **Fix:** Changed to `z.number()` and added `{ valueAsNumber: true }` to each numeric `register()` call — this achieves the same runtime coercion without breaking the type contract
- **Files modified:** `apps/web/components/club-form.tsx`
- **Verification:** `pnpm --filter web check-types` passes with no errors
- **Committed in:** `7cbbcc6` (Task 3 commit)

**2. [Rule 2 - Missing Critical] Added Suspense boundary to /clubs/link page**
- **Found during:** Task 3 implementation
- **Issue:** Next.js 16 requires `useSearchParams()` to be wrapped in Suspense when used in client components — without it, the page throws at build/runtime
- **Fix:** Extracted inner content to `LinkGroupContent` component, wrapped in `<Suspense>` in the default export
- **Files modified:** `apps/web/app/clubs/link/page.tsx`
- **Verification:** TypeScript check passes; no build-time error
- **Committed in:** `7cbbcc6` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes essential for type safety and Next.js correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Club dashboard is fully operational — owners can create clubs, edit settings, manage members, and link LINE groups
- `/clubs/link?groupId=...` is the web destination for the bot setup link in Plan 04
- ClubForm pattern (z.number + valueAsNumber) should be reused for event creation forms in Phase 4

---
*Phase: 02-club-setup*
*Completed: 2026-04-06*

## Self-Check: PASSED

All 11 implementation files confirmed present. All 3 task commits verified (b8c7b36, 280499a, 7cbbcc6).
