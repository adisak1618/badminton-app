---
phase: 11
slug: club-hub-events-list
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 11 — Validation Strategy

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
| 11-01-01 | 01 | 1 | SC-1 | — | N/A | build | `cd apps/web && npx next build` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | SC-2 | — | N/A | build | `cd apps/web && npx next build` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 1 | SC-2 | — | N/A | manual | Browser check: events list renders | — | ⬜ pending |
| 11-02-02 | 02 | 1 | SC-3 | — | N/A | manual | Browser check: weekly schedule section renders | — | ⬜ pending |
| 11-03-01 | 03 | 2 | SC-4 | — | N/A | manual | Browser check: LIFF version accessible | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Club hub renders with upcoming events | SC-2 | UI rendering requires browser | Navigate to /clubs/[id], verify event cards display |
| Weekly schedule shows template patterns | SC-3 | Visual verification of Thai day names | Check schedule section shows active templates |
| LIFF version accessible inside LINE | SC-4 | Requires LINE app context | Open LIFF URL, verify hub loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
