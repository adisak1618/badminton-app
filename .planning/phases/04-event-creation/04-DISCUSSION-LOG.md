# Phase 4: Event Creation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 04-event-creation
**Areas discussed:** Bot command design, LIFF admin panel, Flex Message card design, Event lifecycle & status

---

## Bot Command Design

| Option | Description | Selected |
|--------|-------------|----------|
| Slash command → LIFF form | /create replies with LIFF link. LIFF checks role server-side. | ✓ |
| Slash command + inline args | All fields in one message. Bot checks role before processing. | |
| No bot command — LIFF only | Event creation only via LIFF admin panel. No text command. | |

**User's choice:** Slash command → LIFF form
**Notes:** User raised important concern about non-admin access. Decided non-admins are silently ignored.

### Follow-up: Non-admin behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Silent ignore | Bot does nothing. Keeps group chat clean. | ✓ |
| Brief public reply | Bot replies "Admins only" in group. | |
| Reply with LIFF link anyway | Send link, LIFF blocks non-admins. | |

**User's choice:** Silent ignore

### Follow-up: Command aliases

| Option | Description | Selected |
|--------|-------------|----------|
| /create only | Single English command. | |
| /create + Thai (สร้างอีเวนท์) | English and Thai. | |
| Multiple aliases | /create, /new, สร้าง, สร้างอีเวนท์ — many aliases. | ✓ |

**User's choice:** Multiple aliases

---

## LIFF Admin Panel

### Club defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-fill all, editable | Form loads with all club defaults. Admin can override. | ✓ |
| Pre-fill only fees | Only fees and max players from defaults. | |
| No pre-fill | All fields start empty. | |

**User's choice:** Pre-fill all, editable

### Form layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single page form | All fields on one scrollable page. | ✓ |
| Two-step wizard | Step 1: date/venue. Step 2: fees/players. | |

**User's choice:** Single page form

### Event title

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generate from date+venue | e.g., "แบด 15 เม.ย. - สนามXYZ". Editable. | ✓ |
| Required manual entry | Admin must type a title. | |
| Optional field | Title optional, display date+venue if blank. | |

**User's choice:** Auto-generate from date+venue

---

## Flex Message Card Design

### Card info (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Date + time | When the event happens | ✓ |
| Venue + Google Maps link | Where to play, tappable link | ✓ |
| Fees (shuttlecock + court) | Cost breakdown | ✓ |
| Spots (0/max count) | Current registrations vs max players | ✓ |

**User's choice:** All four — date/time, venue+maps, fees, spots

### CTA buttons

| Option | Description | Selected |
|--------|-------------|----------|
| Register + Details | Two buttons: Register opens LIFF registration, Details opens event detail. | ✓ |
| Register only | Single button, details inside LIFF. | |
| Register + Maps + Details | Three buttons including direct maps link. | |

**User's choice:** Register + Details

### Fee formatting

| Option | Description | Selected |
|--------|-------------|----------|
| ลูกขน 50฿ / สนาม 200฿ | Thai labels with ฿ symbol. | ✓ |
| Shuttle: 50 / Court: 200 | English labels, no currency. | |
| Combined total per person | Single number: ค่าใช้จ่าย 250฿/คน. | |

**User's choice:** Thai labels with ฿ symbol

---

## Event Lifecycle & Status

### Post timing

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately on create | Event goes to 'open', card posted right away. | ✓ |
| Draft first, publish manually | Starts as 'draft', admin taps 'Publish'. | |
| Scheduled posting | Admin sets future time for card to appear. | |

**User's choice:** Immediately on create

### Repost behavior

| Option | Description | Selected |
|--------|-------------|----------|
| No repost in Phase 4 | Card posted once. Reposting is Phase 5 scope. | ✓ |
| Repost when admin edits | New card if date/venue/fees change. | |
| Delete old + repost | Recall old message and post new one. | |

**User's choice:** No repost in Phase 4

---

## Claude's Discretion

- Flex Message JSON structure and styling
- Date/time picker component choice
- LIFF-to-API communication pattern
- Error handling for LINE API failures
- Thai date formatting approach

## Deferred Ideas

- Event editing after creation — Phase 4.1 or Phase 5
- Draft/scheduled posting workflow
- Rich menu integration for admin commands
