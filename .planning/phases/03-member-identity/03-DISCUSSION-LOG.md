# Phase 3: Member Identity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 03-member-identity
**Areas discussed:** LIFF auth flow, Profile setup gate, Profile edit UX, LIFF page hosting

---

## LIFF Auth Flow

| Option | Description | Selected |
|--------|-------------|----------|
| liff.getIDToken() | LIFF SDK gets ID token automatically in-app. Send to server, verify, set session. No redirect. | ✓ |
| liff.login() redirect | Explicit OAuth redirect through LINE Login. More steps but gives access_token. | |
| You decide | Let Claude choose | |

**User's choice:** liff.getIDToken() (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Same cookie | Reuse badminton-session from Phase 2. One session covers LIFF and web. | ✓ |
| Separate LIFF cookie | Different cookie name. Isolates LIFF from web auth. | |

**User's choice:** Same cookie (Recommended)

---

## Profile Setup Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Hard gate | Must complete profile before any LIFF action. Ensures complete data. | ✓ |
| Soft prompt | Show reminder but allow skip. Lower friction, incomplete data. | |
| Auto-fill | Pre-fill defaults, zero friction, assumes defaults. | |

**User's choice:** Hard gate — must complete profile first (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-fill from LINE | Auto-fill displayName from LINE ID token. Member can change. | ✓ |
| Start blank | Member types name from scratch. | |

**User's choice:** Pre-fill from LINE (Recommended)

---

## Profile Edit UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated LIFF profile page | Standalone /liff/profile page accessible from rich menu or bot command. | ✓ |
| Inline in registration | Profile section embedded in registration page. | |
| Both | Standalone + inline. Most accessible but more work. | |

**User's choice:** Dedicated LIFF profile page

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate save | Save on tap, toast confirms. Simple and fast. | ✓ |
| Review before save | Confirmation dialog before saving. | |

**User's choice:** Immediate save (Recommended)

---

## LIFF Page Hosting

**User clarification:** Asked whether dedicated LIFF pages mean members can't register from normal web browsers. Explained that LIFF pages are just web pages — they CAN work in browsers with Line Login session. However, v1 requirements (WEB-03) defer web registration to v2.

| Option | Description | Selected |
|--------|-------------|----------|
| LINE-only for v1 | Auth only via liff.getIDToken(). Browser access deferred to v2 (WEB-03). | ✓ |
| Both LINE and browser | Detect context, fall back to Line Login in browser. More work. | |
| You decide | Let Claude choose | |

**User's choice:** LINE-only for v1 (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| /liff/* | Clear naming: /liff/profile, /liff/register/[eventId]. | ✓ |
| /m/* | Shorter URLs but less descriptive. | |

**User's choice:** /liff/* (Recommended)

---

## Claude's Discretion

- LIFF SDK initialization pattern
- Profile gate implementation approach
- API endpoint design for profile CRUD
- Error handling for expired/invalid ID tokens

## Deferred Ideas

- Normal browser access to LIFF pages (v2 — WEB-03)
- Inline profile view in registration flow (Phase 5)
- Profile picture upload (not in v1)
- Rich menu setup (configuration, not code)
