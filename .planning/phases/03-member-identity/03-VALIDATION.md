---
phase: 03
slug: member-identity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built into Bun runtime) |
| **Config file** | none — `bun test` discovers `*.test.ts` automatically |
| **Quick run command** | `cd apps/api && bun test src/__tests__/liff-auth.test.ts src/__tests__/liff-profile.test.ts` |
| **Full suite command** | `cd apps/api && bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && bun test src/__tests__/liff-auth.test.ts src/__tests__/liff-profile.test.ts`
- **After every plan wave:** Run `cd apps/api && bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | MEMB-01 | T-03-01 | ID token verified server-side; no client userId trusted | integration | `cd apps/api && bun test src/__tests__/liff-auth.test.ts -t "auth"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | MEMB-01 | T-03-01 | Invalid/missing token rejected | integration | `cd apps/api && bun test src/__tests__/liff-auth.test.ts -t "invalid token"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | MEMB-02 | — | N/A | integration | `cd apps/api && bun test src/__tests__/liff-profile.test.ts -t "create"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | MEMB-02 | — | All 3 fields required | integration | `cd apps/api && bun test src/__tests__/liff-profile.test.ts -t "validation"` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | MEMB-03 | — | Profile keyed by lineUserId, not club | integration | `cd apps/api && bun test src/__tests__/liff-profile.test.ts -t "global"` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 2 | MEMB-04 | — | N/A | integration | `cd apps/api && bun test src/__tests__/liff-profile.test.ts -t "update"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/__tests__/liff-auth.test.ts` — stubs for MEMB-01
- [ ] `apps/api/src/__tests__/liff-profile.test.ts` — stubs for MEMB-02, MEMB-03, MEMB-04

*Existing test infrastructure: bun:test framework in apps/api, sealData helper pattern in clubs.test.ts — no new framework install needed*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LIFF opens inside LINE app and authenticates | MEMB-01 | Requires real LINE app with LIFF registration | Open LIFF URL in LINE, verify auth completes |
| Profile gate redirects first-time member to /liff/setup | MEMB-02 | Requires LIFF browser context | Open LIFF URL as new member, verify redirect |
| SameSite cookie works in LINE IAB | MEMB-01 | Requires real iOS/Android LINE IAB | Navigate between LIFF pages, verify session persists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
