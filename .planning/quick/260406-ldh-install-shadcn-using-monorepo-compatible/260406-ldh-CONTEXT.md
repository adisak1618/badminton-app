# Quick Task 260406-ldh: Install shadcn using monorepo compatible setup - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Task Boundary

Install shadcn using monorepo compatible setup following https://ui.shadcn.com/docs/monorepo

</domain>

<decisions>
## Implementation Decisions

### Component Location
- All shadcn components installed in packages/ui only
- Apps consume via @repo/ui workspace dependency
- Follows the official shadcn monorepo pattern

### Existing Setup Handling
- Clean slate: reset packages/ui and re-init from scratch with shadcn monorepo setup
- Remove existing manual component setup and let shadcn CLI configure everything

### Consumer Apps
- Only apps/web consumes the shared UI package
- apps/api does not need UI component setup

</decisions>

<specifics>
## Specific Ideas

- Reference docs: https://ui.shadcn.com/docs/monorepo
- Monorepo uses pnpm workspaces with Turborepo
- Tailwind v4 is in use (^4.2.2)
- Next.js 16 in apps/web
- Existing packages/tailwind-config should be considered for shared config

</specifics>

<canonical_refs>
## Canonical References

- https://ui.shadcn.com/docs/monorepo - Official shadcn monorepo setup guide

</canonical_refs>
