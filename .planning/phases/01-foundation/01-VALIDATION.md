---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in, no install) |
| **Config file** | None — Bun discovers `*.test.ts` files automatically |
| **Quick run command** | `bun test --filter packages/db` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter {changed_package}`
- **After every plan wave:** Run `bun test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | INFRA-01 | — | N/A | integration | `bun test packages/db/src/__tests__/tenant-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | INFRA-02 | T-01-01 | Invalid signature returns 401 | integration | `bun test apps/api/src/__tests__/webhook.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | INFRA-02 | — | Valid signature returns 200 | integration | `bun test apps/api/src/__tests__/webhook.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | INFRA-03 | — | Duplicate webhookEventId rejected | integration | `bun test packages/db/src/__tests__/idempotency.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 0 | INFRA-04 | — | Migration creates all tables | smoke | `drizzle-kit migrate` + introspection | ❌ W0 | ⬜ pending |
| 01-env-01 | 01 | 1 | INFRA-02 | — | Missing env var causes startup error | unit | `bun test apps/api/src/__tests__/env.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/db/src/__tests__/tenant-isolation.test.ts` — stubs for INFRA-01
- [ ] `apps/api/src/__tests__/webhook.test.ts` — stubs for INFRA-02
- [ ] `packages/db/src/__tests__/idempotency.test.ts` — stubs for INFRA-03
- [ ] `apps/api/src/__tests__/env.test.ts` — stubs for env validation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration runs against Neon and all tables exist | INFRA-04 | Requires live Neon connection string | Run `drizzle-kit migrate`, then `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
