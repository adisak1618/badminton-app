---
phase: 4
slug: event-creation
status: verified
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `cd apps/api && bun test src/__tests__/text-message.test.ts` |
| **Full suite command** | `set -a && source .env.local && set +a && bun test` |
| **Estimated runtime** | ~3 seconds per file |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && bun test`
- **After every plan wave:** Run `cd apps/api && bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test File | Test Count | Status |
|---------|------|------|-------------|-----------|------------|--------|
| 04-01-01 | 01 | 1 | BOT-03 | text-message.test.ts | 10 | ✅ green |
| 04-02-01 | 02 | 1 | EVNT-01 | events.test.ts | 5 | ✅ green |
| 04-02-02 | 02 | 1 | EVNT-02 | events.test.ts | 2 | ✅ green |
| 04-02-03 | 02 | 1 | BOT-01 | events.test.ts | 3 | ✅ green |
| 04-03-01 | 03 | 2 | EVNT-01, EVNT-02 | (LIFF page — manual) | — | ✅ UAT passed |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Details

### text-message.test.ts (BOT-03) — 10 tests
- Admin /create → LIFF link reply with clubId
- Admin สร้าง → same LIFF link
- Admin สร้างอีเวนท์ → same LIFF link
- Admin /new → same LIFF link
- Non-admin /create → silent ignore (D-03)
- Unknown user /create → no reply
- Unlinked group /create → no reply
- Non-command text → no reply
- Trailing whitespace trim → still triggers
- Owner /create → LIFF link reply

### events.test.ts (EVNT-01, EVNT-02, BOT-01) — 10 tests
- GET club-defaults → returns defaults for admin
- GET club-defaults → 403 for non-admin
- POST events → creates with status=open, returns 201
- POST events → calls pushMessage, returns lineMessageId
- POST events → 422 when club has no lineGroupId
- POST events → 403 for non-admin
- POST events → auto-generates title when omitted
- POST events → event saved even when pushMessage fails
- POST events → 401 without session
- Flex card → contains Thai fees, spots, CTA labels, colors

---

## Known Issues

| Issue | Impact | Mitigation |
|-------|--------|------------|
| Bun module mock leaks between test files | events.test.ts fails when run alongside text-message.test.ts | Run each test file independently; CI should use `--bail` per file |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Flex Message renders correctly in LINE app | BOT-01 | LINE Flex Message rendering requires real LINE client | ✅ UAT passed |
| LIFF admin form pre-fills club defaults | EVNT-02 | LIFF webview requires LINE app context | ✅ UAT passed |
| Thai command aliases work in real LINE group | BOT-03 | Requires real LINE bot webhook | ✅ UAT passed |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-04-08

## Validation Audit 2026-04-08
| Metric | Count |
|--------|-------|
| Gaps found | 2 (missing exports in mock, missing default export) |
| Resolved | 2 |
| Escalated | 0 |
