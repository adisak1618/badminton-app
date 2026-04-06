# Phase 2: Club Setup — Context & Decisions

**Phase goal:** A club owner can create a club on the website, add the bot to their Line group, and assign admins — the club is ready for events.

**Requirements:** CLUB-01, CLUB-02, CLUB-03, CLUB-04, CLUB-05

## Decisions

### D1: Web authentication — Line Login + iron-session

- **Decision:** Club owners authenticate on the website via Line Login (OAuth 2.1 redirect flow). Session managed with iron-session (encrypted cookie).
- **Why:** Line Login keeps a single identity system — the owner's `line_user_id` is the persistent identifier from day one. iron-session is also planned for Phase 3 LIFF auth, so one session library covers both web and LIFF. Avoids NextAuth.js because LIFF auth (Phase 3) can't use NextAuth's provider pattern, which would result in two competing session systems.
- **Implementation notes:**
  - Build the Line OAuth redirect + callback handler manually (~50 lines)
  - Store `{ lineUserId, displayName }` in iron-session cookie
  - On callback, upsert the user into the `members` table and create/check `club_members` for role
  - Line OAuth scopes: `profile openid`

### D2: Group linking — Web-first with setup link

- **Decision:** Owner creates the club on the website first, then adds the bot to their Line group. On `join` event, the bot posts a setup link (web URL with `groupId` embedded). The owner taps the link, authenticates via their existing web session (Line Login), and selects which of their unlinked clubs to associate with this group.
- **Why:** This gives the owner full control over which club maps to which group. Authorization is enforced on the web side — only users with `role = 'owner'` in `club_members` can complete the linking. Random group members who tap the link but don't own a club see an error page.
- **Flow:**
  1. Owner creates club on web (CLUB-01)
  2. Owner adds bot to Line group
  3. Bot receives `join` webhook event with `source.groupId`
  4. Bot posts Flex Message: "Link this group to your club" with CTA button → web URL `https://{host}/clubs/link?groupId={groupId}`
  5. Owner taps link → web checks their session → shows their unlinked clubs → owner picks one
  6. Web updates `clubs.lineGroupId = groupId`
  7. Bot confirms in group: "Linked to {club name}!"
- **Edge case:** If multiple owners are in the group, first to complete linking wins. Owner can unlink from dashboard.
- **Research note:** ขุนทอง uses "group = workspace" (no external entity to link). Our case requires explicit linking because clubs have persistent web-side configuration.

### D3: UI framework — shadcn/ui + Tailwind CSS

- **Decision:** Use shadcn/ui component library with Tailwind CSS for all web UI.
- **Why:** Copy-paste components (not a package dependency) — we own the code. Built on Radix primitives for accessibility. Excellent form components (Input, Select, Button, Card, Dialog, Toast). Most popular choice in the Next.js ecosystem.
- **Implementation notes:**
  - Initialize shadcn/ui in `apps/web` with `npx shadcn@latest init`
  - Components will live in `apps/web/components/ui/` (shadcn default)
  - Existing `packages/ui` scaffold components can be replaced or kept for cross-app shared components

### D4: Club dashboard scope — Full dashboard

- **Decision:** Phase 2 delivers a complete club management dashboard: create club form, club list page, club settings page (edit name/fees/defaults), member list with role management (promote/demote), and group unlink capability.
- **Why:** Everything an owner needs to set up and manage a club before events arrive in Phase 4. Supports multi-club owners from the start (the schema already supports it via the `club_members` junction table).
- **Pages:**
  - `/clubs` — List of owner's clubs
  - `/clubs/create` — Club creation form (name, home court, default fees, default max players)
  - `/clubs/[id]` — Club dashboard / overview
  - `/clubs/[id]/settings` — Edit club details + defaults
  - `/clubs/[id]/members` — Member list with role management
  - `/clubs/link?groupId=...` — Group linking page (from bot setup link)

## Prior Decisions (from Phase 1, still apply)

- Route uses `.group('/api')` prefix — all API endpoints under `/api/`
- Elysia on Bun for API, Next.js for web — both on Vercel
- Schema: members table is global (no club_id); members join clubs via `club_members` junction table
- Vercel region: `hnd1` (Tokyo)

## Deferred Ideas

- Bot-first club creation (auto-create club when bot joins group) — considered but deferred; web-first gives more control
- Bot command parsing (`/link`, `/settings`) — deferred to Phase 4 when bot commands are needed for event creation
- Email notifications for role changes — out of scope for v1

## Open Questions for Research

1. **Line Login OAuth on Next.js:** Best practice for the OAuth callback route in App Router — does it go in `app/api/auth/callback/line/route.ts` or through middleware?
2. **iron-session with App Router:** Confirm iron-session works with Next.js 16 App Router server components and route handlers (v16 is very new)
3. **Bot reply on join event:** Can the bot send a Flex Message in response to a `join` event, or does it need to use the push API? (join events may not have a `replyToken`)
4. **shadcn/ui + Turborepo:** Any setup quirks when initializing shadcn in a Turborepo workspace app?
