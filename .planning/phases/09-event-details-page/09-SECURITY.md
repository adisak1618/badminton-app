---
phase: 09
slug: event-details-page
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-12
---

# Phase 09 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| LIFF page | No new trust boundaries — reuses existing LIFF auth from Phase 5 | Event data (public within club) |
| API -> Line Messaging API | Flex card content pushed to group chat | Event details, member names, registration counts |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-01 | Spoofing | /liff/events/[id] page | accept | No new auth surface; existing useLiff hook verifies identity | closed |
| T-09-02 | Information Disclosure | Event details page | accept | Event data already accessible via existing registration page; no change in access model | closed |
| T-09-03 | Information Disclosure | Notification line displays member name | accept | Member names already visible in registration list and alt text; no new exposure | closed |
| T-09-04 | Tampering | registerLiffUrl in Flex card | accept | URL points to authenticated LIFF page; no privilege escalation possible | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-09-01 | T-09-01 | Existing LIFF auth (useLiff hook) covers identity — no new surface | Phase plan | 2026-04-12 |
| AR-09-02 | T-09-02 | Event data was already accessible at /register path; route move doesn't change access | Phase plan | 2026-04-12 |
| AR-09-03 | T-09-03 | Member names already visible in registration list and Flex alt text | Phase plan | 2026-04-12 |
| AR-09-04 | T-09-04 | LIFF URLs require LINE authentication; no escalation vector | Phase plan | 2026-04-12 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-12 | 4 | 4 | 0 | gsd-secure-phase |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter
