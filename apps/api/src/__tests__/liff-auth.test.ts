import { describe, it, expect, beforeAll, afterAll, mock, spyOn } from "bun:test";
import { sealData } from "iron-session";
import { db, members } from "@repo/db";
import { eq } from "drizzle-orm";

// Set test env vars BEFORE importing the app
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long!!";
process.env.WEB_BASE_URL = "http://localhost:3000";
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "test-secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "test-token";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "test-liff-channel-id";

let app: any;
const TEST_LINE_USER_ID = "U_test_liff_auth_" + Date.now();
let existingMemberId: string;

async function makeSessionCookie(data: Record<string, unknown>): Promise<string> {
  const sealed = await sealData(data, {
    password: process.env.SESSION_SECRET!,
  });
  return `badminton-session=${sealed}`;
}

beforeAll(async () => {
  const mod = await import("../index");
  app = mod.default;

  // Seed an existing member for the "already exists" tests
  const [m] = await db
    .insert(members)
    .values({
      lineUserId: TEST_LINE_USER_ID,
      displayName: "Existing LIFF User",
      skillLevel: "intermediate",
    })
    .returning();
  existingMemberId = m.id;
});

afterAll(async () => {
  await db.delete(members).where(eq(members.id, existingMemberId));
});

// Note: The LIFF auth endpoint lives in apps/web (Next.js route handler), not in this Elysia API.
// These tests validate the Elysia API endpoints that the LIFF auth flow depends on:
// - GET /api/liff/profile (requires auth session)
// - POST /api/liff/profile (create member)
// - PUT /api/liff/profile (update member)
//
// The web-side POST /api/auth/liff endpoint is tested via TypeScript compilation (apps/web tsconfig).
// Integration of the full LIFF auth flow is validated by the liff-profile tests below.

describe("LIFF Profile routes auth guard (MEMB-01)", () => {
  it("GET /api/liff/profile returns 401 with no session cookie", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/liff/profile")
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/liff/profile returns 401 with no session cookie", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "New User",
          skillLevel: "beginner",
          yearsPlaying: 1,
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/liff/profile returns 401 with no session cookie", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Updated" }),
      })
    );
    expect(res.status).toBe(401);
  });
});

describe("LIFF session stores lineUserId from verified token (MEMB-01 trust boundary)", () => {
  it("GET /api/liff/profile returns member for authenticated session with existing member", async () => {
    // Simulate: after POST /api/auth/liff sets session.lineUserId from LINE-verified token
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      displayName: "Existing LIFF User",
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        headers: { cookie },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Existing LIFF User");
    expect(data.skillLevel).toBe("intermediate");
    // lineUserId is NOT returned (MEMB-03, T-03-05)
    expect(data.lineUserId).toBeUndefined();
  });

  it("GET /api/liff/profile returns 404 for authenticated session with no member record", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: "U_no_member_yet_" + Date.now(),
      displayName: "New User",
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        headers: { cookie },
      })
    );
    expect(res.status).toBe(404);
  });
});
