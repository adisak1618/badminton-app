import { describe, it, expect, beforeAll, afterAll } from "bun:test";
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
const TEST_LINE_USER_ID = "U_test_liff_profile_" + Date.now();
const NEW_LINE_USER_ID = "U_test_liff_new_" + Date.now();
let createdMemberId: string;

async function makeSessionCookie(data: Record<string, unknown>): Promise<string> {
  const sealed = await sealData(data, {
    password: process.env.SESSION_SECRET!,
  });
  return `badminton-session=${sealed}`;
}

beforeAll(async () => {
  const mod = await import("../index");
  app = mod.default;
});

afterAll(async () => {
  // Clean up created members
  if (createdMemberId) {
    await db.delete(members).where(eq(members.id, createdMemberId));
  }
  // Clean up new line user if created
  const [newMember] = await db
    .select()
    .from(members)
    .where(eq(members.lineUserId, NEW_LINE_USER_ID));
  if (newMember) {
    await db.delete(members).where(eq(members.id, newMember.id));
  }
  // Clean up test user if created
  const [testMember] = await db
    .select()
    .from(members)
    .where(eq(members.lineUserId, TEST_LINE_USER_ID));
  if (testMember) {
    await db.delete(members).where(eq(members.id, testMember.id));
  }
});

describe("POST /api/liff/profile — create member profile (MEMB-01, MEMB-03)", () => {
  it("creates a new member record with all required fields", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      displayName: "New LIFF Member",
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          displayName: "New LIFF Member",
          skillLevel: "intermediate",
          yearsPlaying: 3,
        }),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.displayName).toBe("New LIFF Member");
    expect(data.skillLevel).toBe("intermediate");
    expect(data.yearsPlaying).toBe(3);
    expect(data.id).toBeDefined();
    // lineUserId is NOT returned (T-03-05)
    expect(data.lineUserId).toBeUndefined();
    createdMemberId = data.id;

    // Verify DB: member is keyed by lineUserId from session (MEMB-03 — no club_id)
    const [dbMember] = await db
      .select()
      .from(members)
      .where(eq(members.lineUserId, TEST_LINE_USER_ID));
    expect(dbMember).toBeDefined();
    expect(dbMember.lineUserId).toBe(TEST_LINE_USER_ID);
    expect(dbMember.displayName).toBe("New LIFF Member");
  });

  it("returns 422 when displayName is missing", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: NEW_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          skillLevel: "beginner",
          yearsPlaying: 0,
        }),
      })
    );

    expect(res.status).toBe(422);
  });

  it("returns 422 when skillLevel is invalid", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: NEW_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          displayName: "Test",
          skillLevel: "expert", // invalid value
          yearsPlaying: 0,
        }),
      })
    );

    expect(res.status).toBe(422);
  });

  it("returns 422 when yearsPlaying is negative", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: NEW_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          displayName: "Test",
          skillLevel: "beginner",
          yearsPlaying: -1, // invalid
        }),
      })
    );

    expect(res.status).toBe(422);
  });
});

describe("GET /api/liff/profile — retrieve member profile (MEMB-03)", () => {
  it("returns profile for authenticated user (global, no club_id)", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        headers: { cookie },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("New LIFF Member");
    expect(data.skillLevel).toBe("intermediate");
    expect(data.yearsPlaying).toBe(3);
    // No club_id in response (MEMB-03)
    expect(data.clubId).toBeUndefined();
    // No lineUserId leaked (T-03-05)
    expect(data.lineUserId).toBeUndefined();
  });
});

describe("PUT /api/liff/profile — update member profile (MEMB-01)", () => {
  it("updates displayName only (partial update)", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ displayName: "Updated LIFF Member" }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Updated LIFF Member");
    // Other fields unchanged
    expect(data.skillLevel).toBe("intermediate");
    expect(data.yearsPlaying).toBe(3);
  });

  it("updates skillLevel only", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ skillLevel: "advanced" }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skillLevel).toBe("advanced");
  });

  it("updates all fields at once", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          displayName: "Final Name",
          skillLevel: "competitive",
          yearsPlaying: 10,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.displayName).toBe("Final Name");
    expect(data.skillLevel).toBe("competitive");
    expect(data.yearsPlaying).toBe(10);
  });

  it("returns 404 when updating a non-existent profile", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: "U_no_profile_yet_" + Date.now(),
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ displayName: "Ghost User" }),
      })
    );

    expect(res.status).toBe(404);
  });

  it("returns 422 when skillLevel is invalid during update", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ skillLevel: "pro" }), // invalid
      })
    );

    expect(res.status).toBe(422);
  });

  it("cannot update another user's profile — only own lineUserId from session is used (T-03-06)", async () => {
    // Even if someone crafts a PUT body with another lineUserId, the server only uses session.lineUserId
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });

    const res = await app.handle(
      new Request("http://localhost/api/liff/profile", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        // Attempt to inject a different lineUserId in body — server must ignore it
        body: JSON.stringify({
          lineUserId: "U_other_user_should_be_ignored",
          displayName: "Attacker Name",
        }),
      })
    );

    // Should update OWN profile (200), not another user's
    expect(res.status).toBe(200);

    // Verify the attacker's lineUserId was not updated
    const [notChanged] = await db
      .select()
      .from(members)
      .where(eq(members.lineUserId, "U_other_user_should_be_ignored"));
    expect(notChanged).toBeUndefined();

    // Verify own profile was updated
    const [ownMember] = await db
      .select()
      .from(members)
      .where(eq(members.lineUserId, TEST_LINE_USER_ID));
    expect(ownMember.displayName).toBe("Attacker Name");
  });
});
