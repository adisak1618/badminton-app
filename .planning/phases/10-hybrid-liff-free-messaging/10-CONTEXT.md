# Phase 10: Hybrid LIFF & Free Messaging - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor LIFF pages to work both inside LINE and in regular browsers, switch user-initiated actions from paid Messaging API pushMessage to free LIFF sendMessages, and restructure URLs (remove /liff prefix). Server-side pushMessage remains only for cron-generated events and external browser fallback.

</domain>

<decisions>
## Implementation Decisions

### External Browser Auth Flow
- **D-01:** LiffProvider detects external browser (no LINE context) and calls `liff.login()` to redirect through LINE Login OAuth. After authorization, user is redirected back with tokens and has full access.
- **D-02:** External browser users get full functionality — register, cancel, create events. Not view-only.
- **D-03:** When a user performs an action from an external browser, server falls back to `pushMessage` for the repost card since `liff.sendMessages()` has no group chat context outside LINE. This costs money but keeps the group updated.

### pushMessage → sendMessages Migration
- **D-04:** User-initiated actions inside LINE (register, cancel, create event) use `liff.sendMessages()` to post the updated Flex card into the current chat. Free, no Messaging API cost.
- **D-05:** Cards sent via `liff.sendMessages()` appear as the user's message, not the bot's. This is acceptable — each action creates a new card; old cards become stale but still link to the event page.
- **D-06:** Admin creating an event via LIFF uses `liff.sendMessages()` to post the initial Flex card (sent as the admin). Cron-generated events continue using server-side `pushMessage` (no user present).
- **D-07:** Server-side `pushMessage` is used ONLY for: (1) cron-generated recurring events, (2) external browser fallback when sendMessages is unavailable.

### URL Restructuring
- **D-08:** Remove `/liff` prefix. New paths: `/events/[id]`, `/setup`, `/profile`, `/events/create`, `/events/templates`, `/events/templates/[id]/edit`.
- **D-09:** Old `/liff/*` URLs get 301 redirects to new paths. Historical Flex cards in group chats continue to work when tapped.

### LIFF ID Strategy
- **D-10:** Single LIFF ID with Endpoint URL set to root domain. All pages route via path. One `NEXT_PUBLIC_LIFF_ID` env var.
- **D-11:** LiffProvider wraps all app pages at root layout level. Every page gets LIFF context. Simpler than selective wrapping.

### Claude's Discretion
- 301 redirect implementation (Next.js middleware vs redirects config vs route handler)
- LiffProvider initialization optimization (lazy init for non-LIFF pages if needed)
- How to detect LINE vs external browser context for sendMessages vs pushMessage decision
- Whether to refactor the Flex card building to support both send channels (client JSON vs server push)
- Error handling when sendMessages fails (retry, fallback to pushMessage, or show error)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### LIFF Provider & Auth
- `apps/web/components/liff/liff-provider.tsx` — Current LiffProvider, lines 72-76 show the external browser error that needs to become liff.login()
- `.planning/phases/03-member-identity/03-CONTEXT.md` — D-01 to D-03: original LIFF auth decisions (ID token flow, no browser fallback)

### Flex Message & Repost Card
- `apps/api/src/lib/flex-messages.ts` — `buildEventFlexCard`, `buildRepostFlexCard` — card builders that currently only serve server-side pushMessage
- `apps/api/src/lib/repost-card.ts` — Repost card data + pushMessage call (line 76)
- `.planning/phases/09-event-details-page/09-CONTEXT.md` — D-04 to D-07: Flex card CTA and notification line decisions
- `.planning/phases/05-registration-loop/05-CONTEXT.md` — D-05 to D-09: card repost strategy

### Routes Using pushMessage
- `apps/api/src/routes/events.ts` — Event creation route, pushMessage at line 116
- `apps/api/src/routes/cron.ts` — Cron route, pushMessage at line 123
- `apps/api/src/routes/event-templates.ts` — Template create-now, pushMessage at lines 266, 339

### Current LIFF Pages (to be moved)
- `apps/web/app/liff/layout.tsx` — LIFF layout with LiffProvider
- `apps/web/app/liff/events/[id]/page.tsx` — Event details/register page
- `apps/web/app/liff/setup/page.tsx` — Profile setup page
- `apps/web/app/liff/profile/page.tsx` — Profile edit page
- `apps/web/app/liff/events/create/page.tsx` — Event creation page
- `apps/web/app/liff/events/templates/` — Template pages

### LIFF URL Routing Reference
- Memory note: LIFF v2 path concatenates with Endpoint URL; use direct path, not ?path=

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LiffProvider` + `useLiff` hook — needs modification for external browser support but structure is reusable
- `buildEventFlexCard` / `buildRepostFlexCard` — Flex card JSON builders, currently return objects suitable for pushMessage; need to also work for client-side sendMessages
- `buildRepostAltText` — Alt text builder, reusable as-is

### Established Patterns
- LIFF pages use `useLiff()` hook for liff instance access
- API calls go through `/api/proxy` route handler (same-origin proxy to Elysia API)
- Auth flow: LIFF init → getIDToken → POST /api/auth/liff → set cookie
- Flex cards use bubble layout with body + footer sections

### Integration Points
- Root layout (`apps/web/app/layout.tsx`) — LiffProvider moves here from `/liff/layout.tsx`
- All Flex card URLs in card builders need updating from `/liff/events/[id]` to `/events/[id]`
- Registration/cancel API responses need to return Flex card JSON so the client can call sendMessages
- Next.js redirects config or middleware for /liff/* → /* 301s

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-hybrid-liff-free-messaging*
*Context gathered: 2026-04-12*
