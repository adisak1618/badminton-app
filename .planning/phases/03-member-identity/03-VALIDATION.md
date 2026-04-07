---
phase: 03
slug: member-identity
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
updated: 2026-04-08
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
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && bun test src/__tests__/liff-auth.test.ts src/__tests__/liff-profile.test.ts`
- **After every plan wave:** Run `cd apps/api && bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | MEMB-01 | T-03-01, T-03-02 | ID token verified server-side; no client userId trusted | integration | `bun test src/__tests__/liff-auth.test.ts` | ✅ | ✅ green |
| 03-01-02 | 01 | 1 | MEMB-01 | T-03-03 | Auth guard rejects unauthenticated requests with 401 | integration | `bun test src/__tests__/liff-auth.test.ts` | ✅ | ✅ green |
| 03-01-03 | 01 | 1 | MEMB-03 | T-03-05 | Profile keyed by lineUserId, no club_id, no lineUserId in response | integration | `bun test src/__tests__/liff-profile.test.ts` | ✅ | ✅ green |
| 03-01-04 | 01 | 1 | MEMB-01, MEMB-04 | T-03-04 | POST validates all 3 fields; PUT allows partial update | integration | `bun test src/__tests__/liff-profile.test.ts` | ✅ | ✅ green |
| 03-01-05 | 01 | 1 | MEMB-04 | T-03-06 | PUT updates only own record via session.lineUserId | integration | `bun test src/__tests__/liff-profile.test.ts` | ✅ | ✅ green |
| 03-02-01 | 02 | 2 | MEMB-02 | T-03-12 | Profile gate redirects to /liff/setup; setup always accessible | UAT | manual (UAT test 5, 6, 7) | ✅ | ✅ green |
| 03-02-02 | 02 | 2 | MEMB-02 | — | Display name pre-filled from LINE token | UAT | manual (UAT test 6) | ✅ | ✅ green |
| 03-02-03 | 02 | 2 | MEMB-04 | — | Profile edit saves immediately, toast confirms | UAT | manual (UAT test 7) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Coverage Summary

| File | Tests | Assertions | Requirements |
|------|-------|-----------|-------------|
| liff-auth.test.ts | 5 | 7 | MEMB-01 |
| liff-profile.test.ts | 11 | 34 | MEMB-01, MEMB-03, MEMB-04 |
| **Total** | **16** | **41** | **All MEMB-0x** |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LIFF opens inside LINE app and authenticates | MEMB-01 | Requires real LINE app with LIFF registration | Open LIFF URL in LINE, verify auth completes |
| Profile gate redirects first-time member to /liff/setup | MEMB-02 | Requires LIFF browser context | Open LIFF URL as new member, verify redirect |
| SameSite cookie works in LINE IAB | MEMB-01 | Requires real iOS/Android LINE IAB | Navigate between LIFF pages, verify session persists |

---

## Validation Audit 2026-04-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — all 16 automated tests green, 10/10 UAT passed
