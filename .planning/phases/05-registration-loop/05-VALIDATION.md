---
phase: 5
slug: registration-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | packages/db/vitest.config.ts, apps/api/vitest.config.ts |
| **Quick run command** | `pnpm --filter @repo/db test && pnpm --filter api test` |
| **Full suite command** | `pnpm --filter @repo/db test && pnpm --filter api test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @repo/db test && pnpm --filter api test`
- **After every plan wave:** Run `pnpm --filter @repo/db test && pnpm --filter api test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | REG-01 | — | N/A | unit | `pnpm --filter api test` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | REG-02 | — | N/A | unit | `pnpm --filter api test` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | REG-03 | — | N/A | unit | `pnpm --filter api test` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | REG-04 | — | N/A | unit | `pnpm --filter api test` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | REG-05 | — | N/A | unit | `pnpm --filter api test` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | BOT-02 | — | N/A | unit | `pnpm --filter api test` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | BOT-04 | — | N/A | unit | `pnpm --filter api test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/routes/__tests__/registrations.test.ts` — stubs for REG-01 through REG-05
- [ ] `apps/api/src/routes/__tests__/event-status.test.ts` — stubs for BOT-02, BOT-04

*Existing infrastructure covers test framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LIFF opens from Flex Message card tap | REG-01 | Requires LINE app + LIFF environment | Open LINE group, tap Register CTA on event card, verify LIFF page loads |
| Live member list visible to multiple users | REG-02 | Requires concurrent LIFF sessions | Open registration page on 2 devices, register on one, verify list updates on focus switch on other |
| Full/Closed badge renders in LIFF | REG-04 | Visual UI verification | Register max players, verify disabled button + "เต็มแล้ว" badge |
| Flex Message card reposts to LINE group | BOT-04 | Requires LINE Messaging API + group | Register for event, check group chat for new card with notification title |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
