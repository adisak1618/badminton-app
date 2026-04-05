# Feature Research

**Domain:** Line bot + LIFF event registration / casual sports club management (Thailand)
**Researched:** 2026-04-05
**Confidence:** MEDIUM (LINE platform docs HIGH; Thailand-specific usage patterns MEDIUM from community sources; badminton club feature set MEDIUM from competitor analysis)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are non-negotiable for a Line-based club management product. Missing any of these and the product feels incomplete or broken compared to existing manual flows.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bot posts event card in group chat | Core interaction loop — this is why the bot exists. If the event info doesn't appear in the group, no one registers. | LOW | Flex Message with event details, current/max count, CTA buttons |
| One-tap registration via LIFF | Thai Line users expect to register without leaving Line. Any redirect outside Line creates drop-off. | MEDIUM | LIFF gets `userId` automatically — no separate login screen |
| Live count update on card | After someone registers, the group card must show the updated count. If it doesn't update, members can't tell if the event is full. | MEDIUM | Bot edits its own Flex Message via `updateMessage` or reposts; counts pulled from DB |
| Full / closed state on card | "Register" button must visibly disable when full. Users expect this from booking systems everywhere. | LOW | Flex Message button action gated by count check |
| Members can cancel registration | Every booking app allows cancellation. Without it, admins get flooded with manual cancel requests in chat. | LOW | LIFF cancel action, updates count |
| Admin can create a one-time event | Baseline event creation is the starting point of every flow. | LOW | Bot command or LIFF admin panel |
| Member profile (first-time setup) | Users expect to enter their name once, not per event. Cross-club persistence is expected behavior in any modern app. | LOW | One-time LIFF form on first registration, tied to Line `userId` |
| Admin role in group | Someone needs to be able to manage events. The group admin/owner concept is a mental model Line users already have. | LOW | Two roles: Owner and Admin; enforced by Line `userId` checks |
| Event fields: venue, time, cost | Members need to know where, when, and how much. Missing any breaks trust. | LOW | date+time, venue name, Google Maps link, shuttlecock fee, court fee |
| Bot responds to commands | Line group bots in Thailand are expected to respond to simple text commands (e.g. `/event`, `/register`). Users will try commands if the bot is present. | LOW | Command routing in webhook handler |

### Differentiators (Competitive Advantage)

Features that set this product apart from the manual text-post + reply pattern currently used by Thai casual clubs.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Recurring event templates | Weekly sessions (same court, same time every Tuesday) are the norm for ก๊วนแบด. Manual creation every week is the #1 admin pain. Recurring templates eliminate this entirely. | HIGH | Day-of-week + time + registration window config; per-occurrence override capability (cancel, change venue, adjust fee) |
| Configurable registration open window | Clubs have their own culture around when registration opens (e.g. "opens 24h before"). This respects that culture without manual intervention. | MEDIUM | cron job or scheduler triggers bot to post at the right time |
| Per-club defaults with per-event overrides | Reduces admin effort for the 90% case (same venue, same cost) while allowing the 10% exception. | LOW | Club-level defaults stored; event inherits and can override each field |
| Global member profile across clubs | A member who plays at three clubs enters their name and skill level once. This is clearly better than any manual system. | LOW | Profile keyed to Line `userId` globally; shown in all clubs they participate in |
| Skill level on member profile | Beginners/Intermediate/Advanced/Competitive — useful for admins to see who's coming. Seeds future matchmaking features. | LOW | Free data to collect at registration time; low incremental cost |
| Registration list visible in LIFF | Members can see who else is coming before they commit. This is a social signal that drives registration ("oh, my friend is going"). | LOW | LIFF page shows registrant list with display names |
| Admin can remove member from list | Admins regularly need to remove no-shows or reserved spots. LIFF admin panel avoids the awkward public chat message. | LOW | Admin-gated remove action in LIFF |
| Early close / manual override | Unexpected full court (e.g. only 4 courts available today instead of 5) requires closing registration early. Bot command for this is essential. | LOW | `/close` command updates card state |
| Multi-tenant from day 1 | One platform for many clubs, with each club's data isolated. Enables Phase 2 public club pages without data migration. | HIGH | Club-scoped data model; Line group ID as club identifier after onboarding |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like natural additions but should be explicitly deferred or avoided in v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Payment tracking / fee collection | Every badminton session has fees. Admins want to track who has paid. | In-app payments require Thai financial compliance, bank integration, and significant UX work. Fee disputes create support burden. In-phase-1, cash-on-court is the norm — digital payment changes club culture, not just the app. | Show fee amounts in the event card so members know what to bring. Defer payment tracking to a later phase. |
| Text-template parsing (reply-to-register) | Admins and members are used to replying to a text template with their name. Some want the bot to parse those replies. | Natural language parsing is error-prone at scale and across Thai/English mixing. Adds significant complexity with low reliability payoff. Already scoped out in PROJECT.md. | LIFF tap-to-register is strictly better UX. Retire the text template pattern entirely. |
| Matchmaking / skill-based pairing | Competitive players want to be grouped by skill level. Admins sometimes want to auto-pair players for games. | Requires sufficient data (ratings, history), player consent to being paired, and complex UI. Algorithmically contentious. Premature for casual club settings. | Collect skill level data now (no incremental cost). Implement matchmaking in a later phase once data exists. |
| Win/loss recording + Elo ratings | A subset of players want a leaderboard. Glicko2 / Elo is technically feasible. | Competitive rating systems change club dynamics — casual clubs may not want this. Creates fairness disputes. Requires many data points before ratings are meaningful. | Leave a hook (skill level field) for future. Do not build in v1 or v2. |
| Public event discovery | Non-members finding and joining open sessions adds reach. | Multi-tenancy is complex enough in v1. Public discovery adds SEO, public API surface, and abuse vectors. Also changes the nature of a "club" — most ก๊วน groups are invite-only. | Phase 2 feature: public club pages with discoverable events. Scope out for now. |
| In-app member messaging | Admins want to message all registrants before an event (e.g. "bring extra shuttles"). | Line already does this — the group chat IS the messaging channel. Building a parallel messaging system inside the app duplicates what Line does natively. | Use Line group broadcast. If targeted messaging is needed, admin can use Line OA broadcast to members who have added the OA. |
| Court booking integration | Some clubs want to book courts through the app. | Thai court booking systems vary widely; no standard API. Integration is a separate product problem and adds dependency on third-party systems. | Show venue + Google Maps link. Let admins book courts externally as they do today. |
| Website-based registration for members | Some members may prefer a web page over Line. | Contradicts the core constraint: the platform is Line-first. Building a parallel web registration flow doubles the surface area and splits session state. | LIFF is accessible from any browser if needed. Phase 2 can add a public web registration page. |
| Automated waitlist with auto-promotion | When a spot opens (cancellation), auto-notify next in queue and auto-register them. | Requires reliable notification delivery (Line push messages cost money on paid tiers). Auto-registration without explicit consent creates confusion. Members may be mid-commute when promoted. | Show the registration list in LIFF; members can register when they see a spot open. Explicit registration is always better for casual contexts. |
| Multi-language admin UI | Some platforms add EN/TH toggle. | Thai clubs use Thai. English interface adds maintenance surface with no clear user benefit at this stage. | Build in Thai from day 1. Internationalization can be added if clubs outside Thailand are targeted. |

---

## Feature Dependencies

```
[Club setup on website]
    └──requires──> [Multi-tenant data model]
    └──enables──> [Bot linked to Line group]
                      └──enables──> [Event creation]
                                        └──enables──> [Flex Message card posted in group]
                                                          └──enables──> [Registration via LIFF]

[Member registration via LIFF]
    └──requires──> [LIFF + Line Login (userId)]
    └──requires──> [Member profile (first-time)]
                       └──stores──> [Line userId globally]
                                        └──enables──> [Cross-club profile reuse]

[Admin creates recurring event]
    └──requires──> [One-time event creation]
    └──requires──> [Scheduler/cron]
    └──enables──> [Per-occurrence overrides]

[Registration count on card]
    └──requires──> [Registration stored in DB]
    └──requires──> [Bot can edit/repost message]

[Full state on card]
    └──requires──> [Registration count]
    └──requires──> [Max players per event]

[Admin remove member]
    └──requires──> [Registration stored in DB]
    └──requires──> [Admin role check in LIFF]

[Early close command]
    └──requires──> [Admin role check via bot]
    └──enhances──> [Full state on card]

[Skill level field on profile]
    └──enables──> [Future: matchmaking]
    └──enables──> [Future: Elo ratings]
```

### Dependency Notes

- **Event creation requires club setup:** The bot must know which club a group belongs to before events can be created. Club-to-group linking (via bot invite) must happen at setup time.
- **Registration requires member profile:** On first registration, LIFF must collect profile data before completing registration. This is a one-time blocker, not an ongoing friction point.
- **Recurring events require scheduler:** A cron job or time-based trigger must exist to auto-post event cards at the configured open window. This is infrastructure, not just feature logic.
- **Card count updates require bot message-edit capability:** LINE Messaging API allows editing messages via `updateMessage` only for certain message types. Alternatively, the bot can repost. Architecture decision needed (edit vs. repost).
- **Multi-tenancy enhances all features:** Without club-scoped data isolation from day 1, all features above become tangled. This is not a feature — it's a prerequisite.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what eliminates the manual text-template pain point and provides immediate value.

- [ ] Multi-tenant data model (clubs, members, events scoped by club) — prerequisite for everything
- [ ] Club setup on website: create club, configure defaults, link Line group via bot invite
- [ ] One-time event creation (admin via bot command or LIFF admin panel)
- [ ] Flex Message event card posted in group (event info, count/max, Register + Details CTAs)
- [ ] Member registration via LIFF (one-time profile on first registration; tap-to-register thereafter)
- [ ] Live count update on card after each registration
- [ ] Full/closed state: button disabled, card shows "Full"
- [ ] Member cancellation via LIFF
- [ ] Admin remove member from LIFF admin panel
- [ ] Admin early-close via bot command

### Add After Validation (v1.x)

Features to add once core registration loop is working and clubs are using it.

- [ ] Recurring event templates — trigger: admins report that weekly manual creation is still painful (expected after first few weeks)
- [ ] Configurable registration open window — trigger: clubs request different open times
- [ ] Per-occurrence overrides on recurring events — trigger: admins need to cancel or change venue for one session
- [ ] Skill level display in registration list — trigger: admins want to see who's coming by skill

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Public club pages + public event discovery — why defer: changes the product from invite-only club tool to discovery platform; significant scope
- [ ] Website-based member registration — why defer: Line-first is the core constraint; web registration is secondary and adds surface area
- [ ] Payment tracking — why defer: requires financial product decisions; cash-on-court works fine for v1 Thai clubs
- [ ] Matchmaking / skill-based pairing — why defer: needs sufficient history data to be useful; premature
- [ ] Win/loss recording + ratings — why defer: changes club culture; contentious in casual settings
- [ ] Automated waitlist with auto-promotion — why defer: requires paid Line push tier and creates consent complexity

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Multi-tenant data model | HIGH | MEDIUM | P1 |
| Club setup (website) | HIGH | MEDIUM | P1 |
| Bot posts Flex Message event card | HIGH | MEDIUM | P1 |
| Registration via LIFF | HIGH | MEDIUM | P1 |
| Live count update on card | HIGH | MEDIUM | P1 |
| Full/closed state on card | HIGH | LOW | P1 |
| Member cancellation | HIGH | LOW | P1 |
| One-time member profile | HIGH | LOW | P1 |
| Admin remove member | MEDIUM | LOW | P1 |
| Admin early-close command | MEDIUM | LOW | P1 |
| Recurring event templates | HIGH | HIGH | P2 |
| Configurable registration open window | MEDIUM | MEDIUM | P2 |
| Per-occurrence overrides | MEDIUM | MEDIUM | P2 |
| Skill level on profile | MEDIUM | LOW | P2 |
| Registration list visible in LIFF | MEDIUM | LOW | P2 |
| Public club pages | MEDIUM | HIGH | P3 |
| Payment tracking | MEDIUM | HIGH | P3 |
| Matchmaking | LOW | HIGH | P3 |
| Elo / ratings | LOW | HIGH | P3 |
| Automated waitlist | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | PAiMo (web-based) | HelloClub (web-based) | Manual Line group | Our Approach |
|---------|------------------|-----------------------|-------------------|--------------|
| Event creation | Yes, web UI | Yes, web UI | Admin posts text block | Bot command + LIFF admin panel |
| Member registration | Web portal | Web portal | Reply to text block | LIFF inside Line group |
| Capacity / full state | Automated | Automated | Manual counting | Automated via DB + Flex Message update |
| Cancellation | Web portal | Web portal | Message admin | LIFF self-serve |
| Member profiles | Yes, with ratings | Yes, with membership tiers | None | One-time LIFF form, cross-club |
| Skill levels | Glicko2 ratings (complex) | Not mentioned | None | Simple enum (Beginner/Int/Adv/Competitive) |
| Recurring events | Yes | Yes | Manual re-post each week | Recurring templates with overrides |
| Notifications | Email/push | Email | Line group chat | Bot posts in existing group (no extra channel) |
| Multi-tenancy | Yes | Yes | Not applicable | Yes, from day 1 |
| Line integration | None | None | Native (manual) | Native (automated) — key differentiator |
| Thai market fit | Low (English-only, global UX) | Low (global platform) | High (everyone uses it) | High (lives inside existing Line group) |

**Key insight:** No competitor combines Line-native UX with automated event management. PAiMo and HelloClub are feature-rich but require members to adopt a new platform. This product has zero adoption friction — it slots into the existing Line group.

---

## LINE Platform-Specific Feature Constraints

These are platform facts that shape feature decisions (HIGH confidence — from official LINE Developers documentation).

| Constraint | Impact on Features |
|------------|-------------------|
| `liff.getProfile()` requires LIFF context — works inside Line app, not OpenChat | Registration LIFF must be opened from the group chat button, not OpenChat. Do not support OpenChat in v1. |
| `liff.sendMessages()` requires fresh LIFF open — fails after reload from recent services | After registration, confirm via LIFF UI only; do not rely on `sendMessages` for confirmation. Bot handles group notification instead. |
| Line Messaging API `updateMessage` is limited to certain scenarios | Evaluate edit-vs-repost strategy for live count updates early. Reposting creates chat noise; editing has API constraints. |
| Line OA free tier has a monthly active user message limit | Bot-initiated push messages (e.g. scheduled event reminders) cost money at scale. Phase 1 bot posts only on explicit actions (event creation, registration). Avoid polling or unprompted broadcasts in v1. |
| Line group bot cannot see message history when first added | Club setup must happen via website + explicit bot invite flow; cannot bootstrap from chat history. |
| LIFF `userId` is stable per Line user across apps | This is what makes cross-club profile reuse work. Rely on it as the primary identifier. |

---

## Sources

- [PAiMo — Badminton Club Management](https://paimo.io/) — competitor feature analysis
- [Hello Club — Badminton Club Software](https://helloclub.com/solutions/badminton-club-software) — competitor feature analysis
- [LINE Developers — LIFF Overview](https://developers.line.biz/en/docs/liff/overview/) — platform capabilities and constraints (HIGH confidence)
- [LINE Developers Thailand — Sunday Codelab 4: Register Bot](https://www.mikkipastel.com/sunday-codelab-4-register-bot-by-line-developer-thailand/) — Line bot registration implementation patterns
- [LINE Developers Thailand — Introduction to LIFF](https://medium.com/linedevth/introduction-to-liff-7d708e2f42ec) — LIFF capabilities in Thai Line ecosystem
- [LINE Developers — Send Flex Messages](https://developers.line.biz/en/docs/messaging-api/using-flex-messages/) — Flex Message capabilities
- [LINE OA Features Overview Thailand](https://unicornhouse.me/en/line-oa-features/) — LINE OA feature set in Thai market
- [Club Automation — Waitlist and Capacity Features](https://www.clubautomation.com/resources/never-miss-a-spot-waitlist-and-capacity-features-in-club-apps) — sports club waitlist best practices
- [Gymcatch — Health and Sports Club Management](https://gymcatch.com/business/healthandsportsclubs/) — recurring session management patterns

---

*Feature research for: Line bot + LIFF badminton club management platform (Thailand)*
*Researched: 2026-04-05*
