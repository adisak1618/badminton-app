# Phase 8: Data Validation Fixes - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two integration gaps from v1.0 milestone audit: venueName maxLength mismatch between API and DB, and raw process.env access for LIFF_ID in the LIFF layout.

</domain>

<decisions>
## Implementation Decisions

### venueName Length Alignment
- **D-01:** Shrink API validation maxLength from 500 to 255 to match DB varchar(255). No DB migration needed.

### LIFF_ID Environment Access
- **D-02:** Replace `process.env.NEXT_PUBLIC_LIFF_ID` in `apps/web/app/liff/layout.tsx` with import from `apps/web/lib/env.ts` validated env module.

### Claude's Discretion
None — both fixes are fully specified.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API Validation
- `apps/api/src/routes/events.ts` — venueName TypeBox validation (line ~148, maxLength: 500)

### DB Schema
- `packages/db/src/schema/events.ts` — venueName column definition (varchar 255)

### Env Validation
- `apps/web/lib/env.ts` — validated env module with NEXT_PUBLIC_LIFF_ID
- `apps/web/app/liff/layout.tsx` — current raw process.env usage to fix

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/lib/env.ts`: Already exports validated env with NEXT_PUBLIC_LIFF_ID defined in schema

### Established Patterns
- TypeBox schema validation in API routes (t.String with constraints)
- Validated env modules via @t3-oss/env-nextjs

### Integration Points
- `apps/api/src/routes/events.ts` line ~148: TypeBox schema for event creation body
- `apps/web/app/liff/layout.tsx` line 5: raw env access to replace

</code_context>

<specifics>
## Specific Ideas

No specific requirements — both fixes are mechanical.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-data-validation-fixes*
*Context gathered: 2026-04-11*
