---
phase: 04-event-creation
plan: 03
subsystem: ui
tags: [nextjs, react-hook-form, zod, liff, shadcn, tailwind, thai-locale]

# Dependency graph
requires:
  - phase: 04-02
    provides: POST /api/events, GET /api/events/club-defaults, requireClubRole, proxy route
  - phase: 03-member-identity
    provides: LiffProvider, useLiff hook, LIFF session auth, /api/proxy pattern
  - phase: 02-club-setup
    provides: club defaults schema (shuttlecockFee, courtFee, maxPlayers, homeCourtLocation)
provides:
  - LIFF event creation form at /liff/events/create with 7 fields and club defaults pre-fill
  - eventCreateSchema — Zod schema for client-side event form validation
  - Database schema synced to Neon (events table + event_status enum live)
affects: [05-registration, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useForm + zodResolver + form.reset() after async fetch for pre-fill pattern
    - z.number() with valueAsNumber: true on register() — avoids z.coerce type inference issue in Zod v4
    - Native <input type="datetime-local"> styled with shadcn Input classNames (no date picker library)
    - Append ":00+07:00" to datetime-local value before POST for Thai timezone handling

key-files:
  created:
    - apps/web/app/liff/events/create/page.tsx
    - apps/web/lib/validations/event.ts
  modified: []

key-decisions:
  - "z.number() + valueAsNumber: true used instead of z.coerce.number() — Zod v4 coerce returns unknown output type causing zodResolver type mismatch"
  - "form.reset() called after club defaults fetch to pre-fill fields (defaultValues set on form init, then overridden)"
  - "Database schema push confirmed no changes needed — events table already existed in Neon from prior work"

patterns-established:
  - "Pattern: LIFF page number inputs use z.number() schema + valueAsNumber: true on register() — not z.coerce"
  - "Pattern: Async pre-fill in LIFF pages: useForm with numeric defaultValues, then form.reset() after fetch resolves"

requirements-completed: [EVNT-01, EVNT-02]

# Metrics
duration: 25min
completed: 2026-04-08
---

# Phase 4 Plan 03: LIFF Event Creation Form Summary

**LIFF event creation form at /liff/events/create with 7 fields, club-defaults pre-fill, Thai timezone handling, and Zod validation — TypeScript clean, schema synced to Neon**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08
- **Tasks:** 1 of 2 complete (Task 2 is checkpoint:human-verify — awaiting user verification)
- **Files modified:** 2 (both new)

## Accomplishments

- LIFF event creation page at /liff/events/create: fetches club defaults on mount, pre-fills venueName/fees/maxPlayers (EVNT-02)
- All 7 form fields per UI-SPEC with Thai labels, correct input types, and aria-describedby error associations
- Form submits POST /api/proxy/events with Thai timezone offset (+07:00) appended to eventDate (Pitfall 5 from RESEARCH.md)
- Admin role check via API (403 → Thai error), club-not-linked check (422 → toast), success toast + liff.closeWindow()
- eventCreateSchema (Zod) exported from apps/web/lib/validations/event.ts with Thai validation messages
- Database schema confirmed live in Neon (drizzle-kit push: no changes detected)

## Task Commits

1. **Task 1: Create LIFF event creation form page with validation and schema push** - `ad93b4b` (feat)
2. **Task 2: Verify end-to-end event creation flow in LINE** - awaiting human verification (checkpoint:human-verify)

## Files Created/Modified

- `apps/web/app/liff/events/create/page.tsx` — LIFF event creation page with 7-field form, club defaults pre-fill, Thai timezone handling, success/error flows
- `apps/web/lib/validations/event.ts` — Zod eventCreateSchema with Thai error messages, venueMapsUrl URL-or-empty pattern

## Decisions Made

- `z.number()` with `valueAsNumber: true` on number inputs instead of `z.coerce.number()` — Zod v4's `coerce` produces `unknown` output type that breaks zodResolver type inference; this matches the pattern used in ProfileForm
- `form.reset()` called inside the fetch `.then()` callback after defaults load — form is initialized with numeric defaults first, then reset to actual club values once available
- Database schema push confirmed "no changes detected" — events table already synced to Neon from Phase 01/02 work

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced z.coerce.number() with z.number() + valueAsNumber: true**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** z.coerce.number() in Zod v4 returns unknown output type causing zodResolver type mismatch — tsc exited 2 with "Type 'unknown' is not assignable to type 'number'"
- **Fix:** Changed schema to z.number() and added { valueAsNumber: true } to form.register() for all 3 number fields (shuttlecockFee, courtFee, maxPlayers)
- **Files modified:** apps/web/lib/validations/event.ts, apps/web/app/liff/events/create/page.tsx
- **Verification:** npx tsc --noEmit exits 0 in apps/web
- **Committed in:** ad93b4b (Task 1 commit)

**2. [Rule 1 - Bug] Removed unused `defaults` state variable**
- **Found during:** Task 1 (code review before commit)
- **Issue:** Initial draft had `const [defaults, setDefaults] = useState<ClubDefaults | null>(null)` but the value was stored in state and never used in render — form.reset() receives the data directly
- **Fix:** Removed the state variable; data flows directly from fetch callback to form.reset()
- **Files modified:** apps/web/app/liff/events/create/page.tsx
- **Verification:** No TS error, no unused variable warning
- **Committed in:** ad93b4b (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs found during TypeScript verification)
**Impact on plan:** Both fixes required for correct TypeScript compilation and clean code. No scope creep.

## Issues Encountered

- `npx tsc --noEmit` cannot run in the worktree (no node_modules installed there — worktree shares git object store but not pnpm workspace). Verification ran against the main project by copying files temporarily — this is the correct approach for parallel worktree execution.

## Known Stubs

None — all form fields are wired to real API endpoints (club-defaults pre-fill and events POST).

## Threat Flags

No new threat surface introduced beyond what was declared in the plan's threat_model. All three threats (T-04-11, T-04-12, T-04-13) are mitigated as designed:
- clubId validated server-side by requireClubRole in Plan 02 API
- +07:00 timezone appended client-side and stored in TIMESTAMP WITH TIME ZONE
- Client-side Zod validation is UX convenience; server-side Elysia t.Object() is enforcement boundary

## Self-Check

- [x] apps/web/app/liff/events/create/page.tsx — created in worktree at `ad93b4b`
- [x] apps/web/lib/validations/event.ts — created in worktree at `ad93b4b`
- [x] tsc --noEmit exits 0 (verified against main project with copied files)
- [x] drizzle-kit push: "No changes detected" — schema live in Neon

## Self-Check: PASSED

## Next Phase Readiness

- LIFF form ready for end-to-end testing in LINE (Task 2 checkpoint awaits human verification)
- After verification, Phase 5 (registration) can build the /liff/events/:id/register page that the Flex card CTAs link to
- lineMessageId stored in events table for Phase 5 BOT-02 (repost with updated count)

---
*Phase: 04-event-creation*
*Completed: 2026-04-08*
