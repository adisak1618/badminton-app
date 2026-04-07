# Phase 3: Member Identity - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Members can open any LIFF page inside LINE, authenticate via liff.getIDToken(), complete their profile once (display name, skill level, years playing), and be recognised across all clubs. Profile is global — keyed by Line userId, not per-club.

</domain>

<decisions>
## Implementation Decisions

### LIFF Authentication
- **D-01:** Use `liff.getIDToken()` for authentication inside LINE — no redirect needed. Send the ID token to a server-side API endpoint, verify via LINE's /verify endpoint, then set an iron-session cookie.
- **D-02:** Reuse the same `badminton-session` iron-session cookie from Phase 2. One session covers both web dashboard and LIFF pages. SessionData already has `lineUserId`, `memberId`, `displayName`.
- **D-03:** LIFF pages are LINE-only for v1. Normal browser access to LIFF routes deferred to v2 (WEB-03). Auth only via `liff.getIDToken()`, no browser fallback needed.

### Profile Setup Gate
- **D-04:** Hard gate — first-time members MUST complete their profile before any other LIFF action. Redirect to profile setup if no member record exists for their `lineUserId`.
- **D-05:** Pre-fill display name from the LINE ID token's `name` claim. Member can change it if they prefer a different name for badminton.
- **D-06:** Required fields: display name, skill level (Beginner/Intermediate/Advanced/Competitive), years playing badminton. All three must be filled before the member can proceed.

### Profile Edit UX
- **D-07:** Dedicated LIFF profile page at `/liff/profile` — accessible from LINE rich menu or bot command. Standalone page, not embedded in other flows.
- **D-08:** Immediate save on tap — no confirmation dialog. Toast notification confirms the save succeeded.

### LIFF Page Hosting
- **D-09:** LIFF pages live under `apps/web` as Next.js routes at `/liff/*` prefix. Shares the same session, components (shadcn/ui), and API proxy. One deployment.
- **D-10:** LIFF endpoint URL registered in LINE Developers Console points to `{APP_URL}/liff`.

### Claude's Discretion
- LIFF SDK initialization pattern (wrapper hook/provider)
- How the profile gate check is implemented (middleware vs layout vs component-level redirect)
- API endpoint design for profile CRUD (`/api/liff/auth`, `/api/liff/profile`, etc.)
- Error handling for expired/invalid ID tokens

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/02-club-setup/02-CONTEXT.md` — Phase 2 decisions: Line Login + iron-session, shadcn/ui, dashboard scope
- `.planning/phases/02-club-setup/02-01-SUMMARY.md` — Web auth layer implementation details (session.ts, middleware.ts, OAuth routes)

### Schema
- `packages/db/src/schema/members.ts` — Members table with lineUserId, displayName, skillLevel (enum), yearsPlaying
- `packages/db/src/schema/club-members.ts` — Club membership junction table

### Session
- `apps/web/lib/session.ts` — SessionData interface and sessionOptions (badminton-session cookie)

### Auth Patterns
- `apps/web/middleware.ts` — Next.js middleware protecting /clubs/* routes (pattern to extend for /liff/*)
- `apps/api/src/middleware/auth.ts` — API auth middleware using iron-session unsealData

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/ui/src/components/` — shadcn/ui components (button, card, input, label, select, dialog, sonner toast)
- `apps/web/lib/session.ts` — SessionData interface and iron-session config
- `apps/web/lib/api.ts` — Server-side API client with cookie forwarding
- `apps/web/app/api/proxy/[...path]/route.ts` — Proxy route for client-side API calls
- `apps/web/components/club-form.tsx` — React Hook Form + Zod validation pattern (reuse for profile form)

### Established Patterns
- Tailwind CSS v4 with @theme inline (no tailwind.config.ts)
- react-hook-form + zodResolver for form validation
- z.number() + valueAsNumber for numeric inputs
- Server components for data fetching, client components for mutations
- Sonner toast for notifications

### Integration Points
- `apps/web/middleware.ts` — extend matcher to include `/liff/*` routes
- `apps/api/src/index.ts` — mount new LIFF/member routes
- `packages/db/src/schema/members.ts` — members table already exists with all needed columns

</code_context>

<specifics>
## Specific Ideas

- LINE ID token contains `name` field — use this to pre-fill displayName on profile setup
- Skill level uses the existing `skillLevelEnum` from schema: beginner, intermediate, advanced, competitive
- Profile is global (MEMB-03) — same profile regardless of which club's LIFF the member opens

</specifics>

<deferred>
## Deferred Ideas

- Normal browser access to LIFF pages — v2 requirement (WEB-03)
- Inline profile view in registration flow — could add in Phase 5 if needed
- Profile picture upload — not in v1 requirements
- Rich menu setup for LINE bot — separate configuration task, not code

</deferred>

---

*Phase: 03-member-identity*
*Context gathered: 2026-04-07*
