# Phase 7: Club Setup UI Gaps - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Close audit gaps for CLUB-01 and CLUB-02: ensure homeCourtLocation appears in all club UI views and owners can unlink a LINE group from club settings.

</domain>

<decisions>
## Implementation Decisions

### Unlink Group UX
- **D-01:** Unlink Group button goes on the club settings page only (not detail page)
- **D-02:** Clicking Unlink shows a confirmation dialog warning that bot notifications will stop — user must confirm before proceeding
- **D-03:** After unlinking, show success toast and refresh the page state

### Location Display
- **D-04:** Add homeCourtLocation as a 4th card in the club detail page grid (alongside Max Players, Shuttlecock Fee, Court Fee)
- **D-05:** If homeCourtLocation is empty/null, either hide the card or show "Not set"

### Claude's Discretion
- Warning text copy for unlink confirmation dialog
- Whether to show "Not set" or hide the location card when empty
- API endpoint implementation details for DELETE /api/clubs/:id/link

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and ROADMAP.md success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ClubForm` (`apps/web/components/club-form.tsx`): Already has homeCourtLocation field — create and edit forms work
- `Card`, `CardHeader`, `CardContent`, `CardTitle` from `@repo/ui/components/card`: Used in club detail grid
- `Badge` from `@repo/ui/components/badge`: Shows "LINE Group Linked" / "Not Linked" status
- `Button` from `@repo/ui/components/button`: For unlink action

### Established Patterns
- Club detail page (`apps/web/app/clubs/[id]/page.tsx`): Server component using `apiClient.get`
- Club settings page (`apps/web/app/clubs/[id]/settings/page.tsx`): Client component with `useEffect` fetch + `ClubForm`
- Settings page `handleSubmit` type is missing `homeCourtLocation` — needs fix

### Integration Points
- Need `DELETE /api/clubs/:id/link` endpoint in API (doesn't exist yet)
- Club detail page needs `homeCourtLocation` added to its `Club` interface
- Settings page `handleSubmit` type needs `homeCourtLocation` added

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-club-setup-ui-gaps*
*Context gathered: 2026-04-11*
