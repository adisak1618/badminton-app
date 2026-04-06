# Quick Task: Fix Vercel Deployment Error - Research

**Researched:** 2026-04-07
**Domain:** Bun ESM module linking / @line/bot-sdk / Vercel runtime
**Confidence:** HIGH

## Summary

The "Requested module is not instantiated yet" error is a known Bun runtime issue on Vercel caused by circular dependencies in large ESM dependency graphs during the module linking phase. The @line/bot-sdk (both v10 and v11) ships ~3400 files and has a complex barrel export that triggers this Bun bug. As of March 2026, the Bun team and Vercel have not fully resolved this issue in the Bun runtime. [CITED: community.vercel.com/t/bun-runtime-requested-module-is-not-instantiated-yet/26380]

**Primary recommendation:** Switch the Vercel deployment from Bun runtime to Node.js runtime using `@elysiajs/node` adapter (v1.4.5). This is the most reliable fix and is explicitly recommended in the Vercel community thread. Version-pinning @line/bot-sdk will NOT help -- both v10 and v11 have ~3400 files with similar module structures.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Root cause: `@line/bot-sdk` v11's massive barrel export fails during Bun's module linking phase on Vercel
- User confirmed `lineWebhook` module is the trigger
- Approach: Find a fix that resolves the module linking error on Vercel

### Claude's Discretion
- DB client initialization -- not causing this issue
- Dependency compatibility (Zod v4 + @t3-oss/env-core) -- not causing this issue

## Key Findings

### 1. Version pinning will NOT solve this

Both v10.8.0 and v11.0.0 have nearly identical package structures (~3400 files each) and identical `exports` field configurations. The `messagingApi`, `webhook`, and `validateSignature` APIs exist in both v9.x, v10.x, and v11.x (introduced in v8.0.0). [VERIFIED: npm registry]

| Version | Total Files | exports field | API compatibility |
|---------|-------------|---------------|-------------------|
| v9.9.0  | ~3400       | import/require/default | Has messagingApi, webhook, validateSignature |
| v10.8.0 | 3406        | import/require/default | Same APIs |
| v11.0.0 | 3379        | import/require/default | Same APIs (removed legacy Client/OAuth) |

Since the error occurs at the module linking phase (before code execution), and all versions have similar ESM structures, downgrading will not fix the circular dependency issue in Bun. [ASSUMED]

### 2. The reliable fix: switch to Node.js runtime on Vercel

The Vercel community thread confirms that switching from Bun to Node.js runtime is the most reliable workaround. [CITED: community.vercel.com/t/bun-runtime-requested-module-is-not-instantiated-yet/26380]

Elysia officially supports Node.js deployment on Vercel via `@elysiajs/node` adapter:

```typescript
// src/index.ts - updated for Node.js runtime
import { Elysia } from "elysia";
import { node } from "@elysiajs/node";

const app = new Elysia({ adapter: node() })
  .get("/health", () => ({ status: "ok" }))
  // ... rest of routes

export default app;
```

**@elysiajs/node version:** 1.4.5 [VERIFIED: npm registry]

**vercel.json change:** Remove `"bunVersion": "1.x"` (or simply delete the file -- Vercel defaults to Node.js for Elysia).

**Impact on existing code:**

The `request.text()` call used for webhook signature verification works in both Bun and Node.js Elysia adapters. No changes needed to webhook handler logic. [CITED: elysiajs.com/integrations/vercel]

### 3. Alternative: dynamic import to break the module graph

If staying on Bun runtime is strongly preferred, a dynamic import could defer the module linking:

```typescript
// Lazy load to avoid module linking phase failure
const { validateSignature, webhook } = await import("@line/bot-sdk");
```

This is less reliable than switching runtimes because:
- It only works if the circular dep is in the initial linking, not in the lazy-loaded subgraph
- It adds complexity and may break TypeScript type narrowing
- The underlying Bun bug remains unfixed

**Not recommended** -- the Node.js adapter is the cleaner fix. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Node.js adapter for Elysia | Custom HTTP handler | `@elysiajs/node` | Official adapter, maintains Elysia DX |
| LINE signature validation | Custom HMAC | `validateSignature` from `@line/bot-sdk` | Same API works on both runtimes |

## Common Pitfalls

### Pitfall 1: request.text() behavior difference
**What goes wrong:** The Node.js adapter might handle request body streams differently than Bun native.
**How to avoid:** Test webhook signature verification end-to-end after switching. The Elysia docs confirm `request.text()` works on both adapters. [CITED: elysiajs.com/integrations/node]

### Pitfall 2: Forgetting to remove bunVersion from vercel.json
**What goes wrong:** If `"bunVersion": "1.x"` remains in vercel.json, Vercel continues using Bun runtime.
**How to avoid:** Either remove the line or delete vercel.json entirely (Elysia defaults to Node on Vercel).

### Pitfall 3: @elysiajs/node is marked experimental
**What goes wrong:** Node adapter may have edge cases not present in Bun native runtime.
**How to avoid:** This project's usage is simple (HTTP routes, no WebSocket, no streaming). The experimental label is mainly about advanced features. [CITED: elysiajs.com/integrations/node]

## Implementation Steps (for planner)

1. Install `@elysiajs/node`: `bun add @elysiajs/node`
2. Update `apps/api/src/index.ts`: add `import { node } from "@elysiajs/node"` and pass `adapter: node()` to Elysia constructor
3. Update `apps/api/vercel.json`: remove `"bunVersion": "1.x"` (keep file for future Vercel config, or delete if empty)
4. Deploy and verify `/health` endpoint works
5. Verify webhook endpoint with LINE signature validation

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Version pinning will not fix the Bun module linking issue | Finding 1 | LOW -- if wrong, user can still try pinning as fallback |
| A2 | Dynamic import workaround is less reliable than runtime switch | Finding 3 | LOW -- it's presented as alternative, not primary |

## Sources

### Primary (HIGH confidence)
- [Vercel Community: Bun runtime module instantiation error](https://community.vercel.com/t/bun-runtime-requested-module-is-not-instantiated-yet/26380) - Root cause and workarounds
- [Elysia Vercel deployment docs](https://elysiajs.com/integrations/vercel) - Official deployment guide
- [Elysia Node.js integration](https://elysiajs.com/integrations/node) - @elysiajs/node adapter docs
- npm registry: verified @line/bot-sdk v9/v10/v11 file counts and exports fields

### Secondary (MEDIUM confidence)
- [jsDocs.io @line/bot-sdk](https://www.jsdocs.io/package/@line/bot-sdk) - API surface verification
- [GitHub line-bot-sdk-nodejs releases](https://github.com/line/line-bot-sdk-nodejs/releases) - v8+ introduced messagingApi namespace
