---
phase: 9
slug: event-details-page
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun test |
| **Config file** | apps/api (built-in bun test runner) |
| **Quick run command** | `cd apps/api && bun test src/__tests__/flex-messages.test.ts` |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | BOT-01 | manual | LIFF browser test | — | ⚠️ manual-only |
| 09-01-02 | 01 | 1 | BOT-01 | config | `npx next build` | apps/web/next.config.js | ✅ green |
| 09-02-01 | 02 | 1 | BOT-01 | unit | `bun test src/__tests__/flex-messages.test.ts` | apps/api/src/__tests__/flex-messages.test.ts | ✅ green |
| 09-02-02 | 02 | 1 | BOT-01 | unit | `bun test src/__tests__/flex-messages.test.ts` | apps/api/src/__tests__/flex-messages.test.ts | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ manual-only*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LIFF page opens from Flex Message CTA | BOT-01 | Requires LINE app + LIFF browser | Tap button on Flex Message card in LINE, verify page loads with event data |
| Cancelled event badge and disabled button | BOT-01 | Requires LIFF rendering with cancelled event | Set event status to cancelled, open LIFF page, verify red badge and disabled button |
| Venue maps link display | BOT-01 | Requires LIFF rendering | Open event with venueMapsUrl, verify Google Maps link appears |

---

## Validation Audit 2026-04-12

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only reason
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified
