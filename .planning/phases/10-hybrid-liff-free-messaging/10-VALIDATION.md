---
phase: 10
slug: hybrid-liff-free-messaging
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (Bun built-in) |
| **Config file** | `apps/api/package.json` (test script) |
| **Quick run command** | `cd apps/api && bun test --bail` |
| **Full suite command** | `cd apps/api && bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && bun test --bail`
- **After every plan wave:** Run `cd apps/api && bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SC-1 | — | N/A | unit | `cd apps/api && bun test` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | SC-1 | — | liff.login() called for external browser | integration | manual | — | ⬜ pending |
| 10-02-01 | 02 | 1 | SC-2,SC-3 | — | sendMessages used for user-initiated, pushMessage only for cron/external | unit | `cd apps/api && bun test` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | SC-4 | — | 301 redirects from old /liff/* paths | integration | `curl -sI localhost:3000/liff/events/test` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update existing test mocks to support new response shapes (Flex card JSON in API responses)
- [ ] Add test cases for sendMessages vs pushMessage routing logic

*Existing test infrastructure covers base requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LIFF pages load in external browser | SC-1 | Requires real LINE Login OAuth flow | Open event URL in Chrome, verify liff.login() redirect and return |
| sendMessages posts Flex card in LINE chat | SC-2 | Requires LINE app + group chat context | Register for event inside LINE, verify card appears in group |
| Old /liff/* URLs redirect correctly | SC-4 | Requires running Next.js server | Navigate to old URL, verify 301 to new path |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
