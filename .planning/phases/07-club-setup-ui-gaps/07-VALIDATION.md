---
phase: 7
slug: club-setup-ui-gaps
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `apps/web/vitest.config.ts` |
| **Quick run command** | `cd apps/web && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd apps/web && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/web && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd apps/web && npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | CLUB-01 | — | N/A | manual | Visual check: homeCourtLocation card on detail page | N/A | ⬜ pending |
| 7-01-02 | 01 | 1 | CLUB-01 | — | N/A | manual | Visual check: homeCourtLocation in settings form | N/A | ⬜ pending |
| 7-02-01 | 02 | 1 | CLUB-02 | T-7-01 | Owner-only unlink enforced by API | manual | Visual check: Unlink Group button + dialog | N/A | ⬜ pending |
| 7-02-02 | 02 | 1 | — | — | N/A | manual | Visual check: Toaster renders on web layout | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| homeCourtLocation card renders on detail page | CLUB-01 | UI rendering check | Navigate to /clubs/[id], verify 4th grid card shows homeCourtLocation |
| homeCourtLocation submits via form | CLUB-01 | Form integration | Edit club, change homeCourtLocation, save, verify value persists |
| Unlink Group button appears for owners | CLUB-02 | Auth + UI interaction | Navigate to /clubs/[id]/settings as owner, click Unlink Group, confirm dialog, verify line_group_id cleared |
| Toast notification appears after unlink | CLUB-02 | UI interaction | After unlink, verify toast shows success message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
