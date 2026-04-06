# Phase 2: Club Setup — Research

## Pattern 1: Line Login OAuth on Next.js App Router

### Authorize URL
```
https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id={CHANNEL_ID}&redirect_uri={CALLBACK_URL}&state={RANDOM_STATE}&scope=profile%20openid&nonce={RANDOM_NONCE}
```

Required params: `response_type=code`, `client_id`, `redirect_uri`, `state` (CSRF), `scope=profile openid`.
Optional: `nonce` (replay protection, returned in ID token).

Authorization code is valid for **10 minutes**, single-use.

### Token Exchange
```
POST https://api.line.me/oauth2/v2.1/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code={CODE}&redirect_uri={CALLBACK_URL}&client_id={ID}&client_secret={SECRET}
```

Response: `{ access_token, expires_in, id_token, refresh_token, scope, token_type }`

### ID Token Verification
```
POST https://api.line.me/oauth2/v2.1/verify
Content-Type: application/x-www-form-urlencoded

id_token={TOKEN}&client_id={ID}
```

Response: `{ sub (userId), name (displayName), picture, email, iss, aud, exp, iat }`

The `sub` field is the Line userId (`U` + hex string) — same format as Messaging API.

### Login Route (initiate flow)
```typescript
// app/api/auth/login/line/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import crypto from "crypto";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.oauthState = state;
  session.oauthNonce = nonce;
  await session.save();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: process.env.LINE_LOGIN_CALLBACK_URL!,
    state,
    scope: "profile openid",
    nonce,
  });

  return NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  );
}
```

### Callback Route
```typescript
// app/api/auth/callback/line/route.ts
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!code || !state || state !== session.oauthState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.LINE_LOGIN_CALLBACK_URL!,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  });
  const tokenData = await tokenRes.json();

  // Verify ID token
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: tokenData.id_token,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    }),
  });
  const profile = await verifyRes.json();

  // Save to session
  session.lineUserId = profile.sub;
  session.displayName = profile.name;
  session.pictureUrl = profile.picture;
  session.isLoggedIn = true;
  session.oauthState = undefined;
  await session.save();

  return NextResponse.redirect(new URL("/clubs", request.url));
}
```

---

## Pattern 2: iron-session with Next.js 16 App Router

### Compatibility
iron-session v8.0.1 works with Next.js 16. Key: `cookies()` is async in Next.js 15+, so always `await cookies()` before passing to `getIronSession`.

### Session Config
```typescript
// lib/session.ts
import type { SessionOptions } from "iron-session";

export interface SessionData {
  lineUserId?: string;
  memberId?: string;
  displayName?: string;
  pictureUrl?: string;
  isLoggedIn: boolean;
  oauthState?: string;
  oauthNonce?: string;
}

export const defaultSession: SessionData = { isLoggedIn: false };

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,  // min 32 chars
  cookieName: "badminton-session",
  ttl: 60 * 60 * 24 * 14,  // 14 days
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};
```

### Usage in Route Handlers
```typescript
const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
```

### Usage in Server Components
```typescript
async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session;
}
```

### Usage in Middleware (DIFFERENT signature)
```typescript
// middleware.ts — cookies() is NOT available, use request/response instead
const session = await getIronSession<SessionData>(request, response, sessionOptions);
```

---

## Pattern 3: Bot Join Event + Flex Message

### Join Event Structure
```json
{
  "type": "join",
  "source": { "type": "group", "groupId": "C4af4980629..." },
  "replyToken": "nHuyWiB7yP...",
  "webhookEventId": "01FZ74A0TDD..."
}
```

Key facts:
- **Has `replyToken`** — can use `replyMessage` (free) instead of `pushMessage`
- **No `userId` in source** — cannot identify who invited the bot
- `replyToken` expires in ~1 minute; use `pushMessage` if async work is needed

### Join Event Handler
```typescript
import { webhook, messagingApi } from "@line/bot-sdk";

async function handleJoinEvent(event: webhook.JoinEvent): Promise<void> {
  const groupId = event.source?.groupId;
  if (!groupId) return;

  const setupUrl = `${env.WEB_BASE_URL}/clubs/link?groupId=${groupId}`;

  const flexMessage: messagingApi.FlexMessage = {
    type: "flex",
    altText: "เชื่อมต่อกลุ่มนี้กับก๊วนของคุณ",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "สวัสดี! 🏸", weight: "bold", size: "lg" },
          {
            type: "text",
            text: "เชื่อมต่อกลุ่มนี้กับก๊วนแบดของคุณเพื่อเริ่มจัดการอีเวนต์",
            wrap: true, margin: "md", size: "sm", color: "#666666",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [{
          type: "button",
          style: "primary",
          action: { type: "uri", label: "เชื่อมต่อก๊วน", uri: setupUrl },
        }],
      },
    },
  };

  // Use replyMessage (free) — replyToken is available on join events
  if (event.replyToken) {
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [flexMessage],
    });
  }
}
```

### TypeScript Types (from @line/bot-sdk v11)
- `webhook.JoinEvent` — bot join event
- `webhook.Event` — union of all event types
- `messagingApi.FlexMessage` — flex message envelope
- `messagingApi.FlexBubble` — bubble container
- `messagingApi.PushMessageRequest` / `messagingApi.ReplyMessageRequest`

Import via: `import { messagingApi, webhook } from "@line/bot-sdk";`

---

## Pattern 4: shadcn/ui in Turborepo

### Setup Steps
1. Install Tailwind CSS v4 in apps/web:
   ```bash
   cd apps/web && pnpm add tailwindcss @tailwindcss/postcss postcss
   ```

2. Initialize shadcn/ui with monorepo mode:
   ```bash
   pnpm dlx shadcn@latest init --monorepo
   ```

3. Fix aliases in both `components.json` files to use `@repo/ui` (not `@workspace/ui`)

4. Update `packages/ui/package.json` exports to cover new directories (`src/components/`, `src/lib/`, `src/hooks/`, `src/styles/`)

5. Remove old placeholder components from `packages/ui/src/` (button.tsx, card.tsx, code.tsx)

6. Update `apps/web/app/layout.tsx` to import shared CSS from packages/ui

### Where Components Live
- **Base primitives (Button, Card, Input, Dialog)** → `packages/ui/src/components/` (shared)
- **App-specific composites** → `apps/web/components/` (local)
- Two `components.json` files: one in `apps/web`, one in `packages/ui`

### Tailwind v4 Notes
- No `tailwind.config.ts` — all config in CSS via `@theme inline`
- No `content` paths needed — v4 auto-detects source files
- `tw-animate-css` replaces `tailwindcss-animate` plugin
- CSS vars defined in `packages/ui/src/styles/globals.css`

### Components Needed for Phase 2
```bash
pnpm dlx shadcn@latest add button card input label select dialog sonner \
  dropdown-menu navigation-menu separator skeleton badge table -c apps/web
```

Additional: `pnpm add react-hook-form @hookform/resolvers zod -F web`

---

## Pattern 5: Elysia Route Organization + Auth Middleware

### Route Structure
One `new Elysia()` per resource file, compose via `.use()`:

```typescript
// apps/api/src/index.ts
const app = new Elysia()
  .use(errorHandler)
  .get("/health", () => ({ status: "ok" }))
  .group("/api", (app) =>
    app
      .use(lineWebhook)        // no auth — LINE verifies via signature
      .use(authMiddleware)      // everything below requires auth
      .use(clubRoutes)
  );
```

### Request Validation (Elysia built-in TypeBox)
```typescript
.post("/", handler, {
  body: t.Object({
    name: t.String({ minLength: 1, maxLength: 255 }),
    defaultMaxPlayers: t.Optional(t.Integer({ minimum: 1, default: 20 })),
  }),
  params: t.Object({
    clubId: t.String({ format: "uuid" }),
  }),
})
```

Use `t.*` for routes (auto type inference), Zod only for `@t3-oss/env-core`.

### Error Handling
```typescript
// lib/errors.ts
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}
export const notFound = (resource: string) => new ApiError(404, "NOT_FOUND", `${resource} not found`);
export const forbidden = (msg = "Forbidden") => new ApiError(403, "FORBIDDEN", msg);
export const unauthorized = (msg = "Unauthorized") => new ApiError(401, "UNAUTHORIZED", msg);
```

Global handler via `.onError()` catches `ApiError`, validation errors, and unexpected errors.

### Auth Middleware (iron-session via .derive())
```typescript
// middleware/auth.ts
export const authMiddleware = new Elysia({ name: "auth" })
  .derive(async ({ cookie }) => {
    const sealed = cookie.session?.value;
    if (!sealed) throw unauthorized("No session cookie");

    const session = await unsealData<SessionData>(sealed, {
      password: env.SESSION_SECRET,
    });
    if (!session.memberId) throw unauthorized("Invalid session");

    return { session };
  });
```

The `session` object is then available in all route handlers registered after the middleware.

---

## Pattern 6: Drizzle CRUD Queries

### Insert a club + owner membership (transaction)
```typescript
const [newClub] = await db.insert(clubs).values({
  name: "Saturday Smashers",
  defaultMaxPlayers: 16,
  defaultShuttlecockFee: 50,
  defaultCourtFee: 200,
}).returning();

await db.insert(clubMembers).values({
  clubId: newClub.id,
  memberId: session.memberId,
  role: "owner",
});
```

### Select owned clubs
```typescript
const ownedClubs = await db
  .select({ club: clubs, joinedAt: clubMembers.joinedAt })
  .from(clubMembers)
  .innerJoin(clubs, eq(clubs.id, clubMembers.clubId))
  .where(and(
    eq(clubMembers.memberId, memberId),
    eq(clubMembers.role, "owner"),
  ));
```

### Update club settings
```typescript
const [updated] = await db.update(clubs)
  .set({ defaultMaxPlayers: 24 })
  .where(eq(clubs.id, clubId))
  .returning();
```

### Upsert club member role
```typescript
const [result] = await db.insert(clubMembers)
  .values({ clubId, memberId, role: "admin" })
  .onConflictDoUpdate({
    target: [clubMembers.clubId, clubMembers.memberId],
    set: { role: "admin" },
  })
  .returning();
```

### Authorization check helper
```typescript
async function requireClubRole(clubId: string, memberId: string, allowedRoles: string[]) {
  const [membership] = await db.select({ role: clubMembers.role })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, memberId)));

  if (!membership) throw forbidden("Not a member of this club");
  if (!allowedRoles.includes(membership.role)) throw forbidden("Insufficient role");
  return membership.role;
}
```

---

## Environment Variables (New for Phase 2)

```env
# Line Login channel (SEPARATE from Messaging API channel)
LINE_LOGIN_CHANNEL_ID=1234567890
LINE_LOGIN_CHANNEL_SECRET=abcdef...

# Callback URL (must match LINE console exactly)
LINE_LOGIN_CALLBACK_URL=https://yourdomain.com/api/auth/callback/line

# iron-session
SESSION_SECRET=a-random-string-at-least-32-characters-long

# Web app base URL (for bot setup links)
WEB_BASE_URL=https://yourdomain.com
```

**CRITICAL:** Line Login and Messaging API channels must be under the **same Provider** in LINE Developers Console. Same provider = same userId across channels. Channels cannot be moved between providers after creation.

---

## Open Questions

1. **iron-session cross-origin:** The web app (Next.js on Vercel) and API (Elysia on Vercel) are separate services. Can iron-session cookies set by Next.js be read by the Elysia API? They need to share the same domain or use a shared cookie domain. Alternatively, the Elysia API uses `unsealData` directly to read the same cookie format.
   - **Likely resolution:** Both deployed on same Vercel project subdomain, or API reads the cookie via `unsealData` with the same `SESSION_SECRET`.

2. **Neon transactions:** Drizzle + Neon HTTP driver (`drizzle-orm/neon-http`) may not support traditional transactions. Club creation (insert club + insert owner membership) should be atomic. Need to verify if `db.transaction()` works with the HTTP driver or if we need the WebSocket driver for transactions.
   - **Likely resolution:** Use `neon-http` `sql.transaction()` or switch to neon-serverless WebSocket driver for transactional operations.

3. **Next.js 16 middleware + iron-session:** Confirm the `(request, response, options)` signature works in Next.js 16 middleware. Prior versions had issues with `ReadonlyRequestCookies` types.
   - **Likely resolution:** Works with `await cookies()` type assertion if needed.
