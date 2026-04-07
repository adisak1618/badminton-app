---
phase: 4
slug: event-creation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (vitest-compatible) |
| **Config file** | apps/api/src/__tests__/ (existing pattern) |
| **Quick run command** | `cd apps/api && bun test` |
| **Full suite command** | `cd apps/api && bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && bun test`
- **After every plan wave:** Run `cd apps/api && bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | EVNT-01 | — | N/A | unit | `cd apps/api && bun test` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | EVNT-02 | — | N/A | unit | `cd apps/api && bun test` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | BOT-01 | — | N/A | unit | `cd apps/api && bun test` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | BOT-03 | — | N/A | unit | `cd apps/api && bun test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/__tests__/events.test.ts` — stubs for EVNT-01, EVNT-02
- [ ] `apps/api/src/__tests__/bot-event-post.test.ts` — stubs for BOT-01, BOT-03

*Existing test infrastructure (bun:test, treaty client) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Flex Message renders correctly in LINE app | BOT-03 | LINE Flex Message rendering requires real LINE client | Send test event, verify card appearance in LINE group |
| LIFF admin form pre-fills club defaults | EVNT-02 | LIFF webview requires LINE app context | Open LIFF URL in LINE, verify form defaults |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
