---
phase: 6
slug: recurring-events
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | none — bun detects test files automatically |
| **Quick run command** | `cd apps/api && bun test --testPathPattern=event-templates` |
| **Full suite command** | `cd apps/api && bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && bun test --testPathPattern=event-templates`
- **After every plan wave:** Run `cd apps/api && bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | EVNT-03 | — | N/A | integration | `bun test --testPathPattern=event-templates` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | EVNT-05 | — | N/A | integration | `bun test --testPathPattern=event-templates` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | EVNT-04 | T-6-01 | Bearer token with timingSafeEqual | integration | `bun test --testPathPattern=cron` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | EVNT-04 | — | Idempotency guard | integration | `bun test --testPathPattern=cron` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | EVNT-06 | T-6-02 | requireClubRole check | integration | `bun test --testPathPattern=event-templates` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | EVNT-06 | T-6-03 | maxPlayers validation | integration | `bun test --testPathPattern=event-templates` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/__tests__/event-templates.test.ts` — stubs for EVNT-03, EVNT-05, EVNT-06
- [ ] `apps/api/src/__tests__/cron.test.ts` — stubs for EVNT-04 (mock clock for timezone tests)

*(Existing test infrastructure: bun:test already configured, LINE SDK mock pattern established in events.test.ts)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Flex Message visual layout in LINE | EVNT-04 | LINE rendering cannot be automated in CI | Post test Flex Message via bot, verify card appearance in LINE app |
| Cancellation notice visual | EVNT-06 | LINE rendering | Cancel test occurrence, verify cancellation Flex Message in LINE group |
| LIFF recurring toggle UX | EVNT-03 | Browser UI interaction | Open LIFF form, toggle "Recurring", verify schedule fields appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
