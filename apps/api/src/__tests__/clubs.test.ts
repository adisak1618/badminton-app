import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { sealData } from "iron-session";
import { db, clubs, clubMembers, members } from "@repo/db";
import { eq } from "drizzle-orm";

// Set test env vars BEFORE importing the app
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long!!";
process.env.WEB_BASE_URL = "http://localhost:3000";
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "test-secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "test-token";
process.env.LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "test-login-channel-id";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";

let app: any;
let testMemberId: string;
let testClubId: string;
const TEST_LINE_USER_ID = "U_test_club_owner_" + Date.now();

async function makeSessionCookie(data: Record<string, unknown>): Promise<string> {
  const sealed = await sealData(data, {
    password: process.env.SESSION_SECRET!,
  });
  return `badminton-session=${sealed}`;
}

beforeAll(async () => {
  const mod = await import("../index");
  app = mod.default;

  // Seed a test member
  const [m] = await db.insert(members).values({
    lineUserId: TEST_LINE_USER_ID,
    displayName: "Test Owner",
    skillLevel: "intermediate",
  }).returning();
  testMemberId = m.id;
});

afterAll(async () => {
  // Cleanup
  if (testClubId) {
    await db.delete(clubMembers).where(eq(clubMembers.clubId, testClubId));
    await db.delete(clubs).where(eq(clubs.id, testClubId));
  }
  await db.delete(members).where(eq(members.id, testMemberId));
});

describe("Club CRUD routes (CLUB-01, CLUB-04)", () => {
  it("POST /api/clubs creates a club and sets owner role", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      displayName: "Test Owner",
      isLoggedIn: true,
    });
    const body = JSON.stringify({
      name: "Test Badminton Club",
      homeCourtLocation: "Suan Lum Court",
      defaultMaxPlayers: 16,
    });
    const res = await app.handle(new Request("http://localhost/api/clubs", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body,
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Test Badminton Club");
    expect(data.homeCourtLocation).toBe("Suan Lum Court");
    testClubId = data.id;

    // Verify owner role was set
    const [membership] = await db.select().from(clubMembers)
      .where(eq(clubMembers.clubId, testClubId));
    expect(membership.role).toBe("owner");
  });

  it("GET /api/clubs returns the created club", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(new Request("http://localhost/api/clubs", {
      headers: { cookie },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.find((c: any) => c.id === testClubId)).toBeTruthy();
  });

  it("PUT /api/clubs/:id returns 403 for plain member (CLUB-04)", async () => {
    // Create a second member with 'member' role
    const otherLineUserId = "U_test_member_" + Date.now();
    const [otherMember] = await db.insert(members).values({
      lineUserId: otherLineUserId,
      displayName: "Plain Member",
      skillLevel: "beginner",
    }).returning();
    await db.insert(clubMembers).values({
      clubId: testClubId,
      memberId: otherMember.id,
      role: "member",
    });

    const cookie = await makeSessionCookie({
      lineUserId: otherLineUserId,
      isLoggedIn: true,
    });
    const res = await app.handle(new Request(`http://localhost/api/clubs/${testClubId}`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "Hacked Name" }),
    }));
    expect(res.status).toBe(403);

    // Cleanup
    await db.delete(clubMembers).where(eq(clubMembers.memberId, otherMember.id));
    await db.delete(members).where(eq(members.id, otherMember.id));
  });

  it("returns 401 when no session cookie is provided", async () => {
    const res = await app.handle(new Request("http://localhost/api/clubs"));
    expect(res.status).toBe(401);
  });
});
