# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**No external APIs detected** - The codebase contains no HTTP client libraries (axios, fetch utilities, etc.) and no API integrations at this time.

## Data Storage

**Databases:**
- Not detected - No database dependencies or connections identified
- No ORM/client libraries (Prisma, Drizzle, SQLAlchemy, etc.)

**File Storage:**
- Local filesystem only - No cloud storage integrations
- Static assets served via Next.js public directory
  - Fonts: `apps/web/app/fonts/` and `apps/docs/app/fonts/`
  - Images: `apps/web/public/` for SVG and other assets

**Caching:**
- Next.js built-in caching - App Router supports data caching via `cache()` function
- Turbo local caching - Build artifact caching in `.turbo/` directory
- No external cache services (Redis, Memcached, etc.)

## Authentication & Identity

**Auth Provider:**
- Not detected - No authentication provider integration
- No auth libraries (next-auth, Clerk, Auth0, Firebase Auth, etc.)
- Applications are public/unsecured

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking services (Sentry, LogRocket, Datadog, etc.)

**Logs:**
- Console logging only - Standard Node.js/browser console output
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Not detected in codebase - Deployment configuration not present
- Compatible with: Vercel, Node.js servers, edge runtimes (Next.js standard options)
- README mentions Vercel as optional deployment target

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI service configuration
- Turbo supports remote caching via Vercel (optional, not configured)

## Environment Configuration

**Required env vars:**
- None currently configured
- Turbo configuration monitors for `.env*` files but none exist
- Next.js uses default configuration (no secrets/API keys needed)

**Secrets location:**
- Not applicable - No secrets or credentials in use

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints or API routes

**Outgoing:**
- Not detected - No outbound webhook/callback integrations

## External Dependencies Summary

The project is a **zero-integration monorepo** focused on tooling and structure:
- No database connections
- No authentication system
- No payment processing
- No third-party APIs
- No observability/monitoring
- No external messaging or queuing

This makes it suitable as a starter template and learning platform with minimal external dependencies.

---

*Integration audit: 2026-04-05*
