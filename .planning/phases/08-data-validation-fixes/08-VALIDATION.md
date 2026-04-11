---
phase: 8
slug: data-validation-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if available) / manual grep verification |
| **Config file** | TBD — Wave 0 checks |
| **Quick run command** | `grep -n "maxLength" apps/api/src/routes/events.ts` |
| **Full suite command** | `pnpm test` (if configured) |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick verification commands
- **After every plan wave:** Run full suite if available
- **Before `/gsd-verify-work`:** All grep checks must pass
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | EVNT-01 | — | API rejects venueName > 255 chars | grep | `grep "maxLength.*255" apps/api/src/routes/events.ts` | ✅ | ⬜ pending |
| 8-01-02 | 01 | 1 | BOT-01 | — | LIFF_ID from validated env module | grep | `grep "env\." apps/web/app/liff/layout.tsx \| grep -v process.env` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — both fixes are single-line edits verifiable by grep.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
