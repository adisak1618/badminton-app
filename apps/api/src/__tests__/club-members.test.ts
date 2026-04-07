import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { sealData } from "iron-session";
import { db, clubs, clubMembers, members } from "@repo/db";
import { eq } from "drizzle-orm";

process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long!!";
process.env.WEB_BASE_URL = "http://localhost:3000";
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "test-secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "test-token";
process.env.LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "test-login-channel-id";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";

let app: any;
let ownerMemberId: string;
let targetMemberId: string;
let testClubId: string;
const OWNER_LINE_ID = "U_test_owner_cm_" + Date.now();
const TARGET_LINE_ID = "U_test_target_cm_" + Date.now();

async function makeSessionCookie(data: Record<string, unknown>): Promise<string> {
  const sealed = await sealData(data, { password: process.env.SESSION_SECRET! });
  return `badminton-session=${sealed}`;
}

beforeAll(async () => {
  const mod = await import("../index");
  app = mod.default;

  const [owner] = await db.insert(members).values({
    lineUserId: OWNER_LINE_ID, displayName: "Owner", skillLevel: "advanced",
  }).returning();
  ownerMemberId = owner.id;

  const [target] = await db.insert(members).values({
    lineUserId: TARGET_LINE_ID, displayName: "Target Member", skillLevel: "beginner",
  }).returning();
  targetMemberId = target.id;

  const [club] = await db.insert(clubs).values({ name: "CM Test Club" }).returning();
  testClubId = club.id;

  await db.insert(clubMembers).values([
    { clubId: testClubId, memberId: ownerMemberId, role: "owner" },
    { clubId: testClubId, memberId: targetMemberId, role: "member" },
  ]);
});

afterAll(async () => {
  await db.delete(clubMembers).where(eq(clubMembers.clubId, testClubId));
  await db.delete(clubs).where(eq(clubs.id, testClubId));
  await db.delete(members).where(eq(members.id, ownerMemberId));
  await db.delete(members).where(eq(members.id, targetMemberId));
});

describe("Club member routes (CLUB-03)", () => {
  it("GET /api/clubs/:id/members returns member list", async () => {
    const cookie = await makeSessionCookie({ lineUserId: OWNER_LINE_ID, isLoggedIn: true });
    const res = await app.handle(new Request(`http://localhost/api/clubs/${testClubId}/members`, {
      headers: { cookie },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(2);
  });

  it("PUT role promotes member to admin (owner only)", async () => {
    const cookie = await makeSessionCookie({ lineUserId: OWNER_LINE_ID, isLoggedIn: true });
    const res = await app.handle(new Request(
      `http://localhost/api/clubs/${testClubId}/members/${targetMemberId}/role`,
      {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ role: "admin" }),
      }
    ));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.role).toBe("admin");
  });

  it("PUT role demotes admin back to member", async () => {
    const cookie = await makeSessionCookie({ lineUserId: OWNER_LINE_ID, isLoggedIn: true });
    const res = await app.handle(new Request(
      `http://localhost/api/clubs/${testClubId}/members/${targetMemberId}/role`,
      {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ role: "member" }),
      }
    ));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.role).toBe("member");
  });

  it("PUT role rejects non-owner with 403", async () => {
    const cookie = await makeSessionCookie({ lineUserId: TARGET_LINE_ID, isLoggedIn: true });
    const res = await app.handle(new Request(
      `http://localhost/api/clubs/${testClubId}/members/${ownerMemberId}/role`,
      {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ role: "admin" }),
      }
    ));
    expect(res.status).toBe(403);
  });
});

describe("Club linking (CLUB-02)", () => {
  it("POST /api/clubs/link sets lineGroupId on club", async () => {
    const cookie = await makeSessionCookie({ lineUserId: OWNER_LINE_ID, isLoggedIn: true });
    const res = await app.handle(new Request("http://localhost/api/clubs/link", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ clubId: testClubId, groupId: "C_test_group_123" }),
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lineGroupId).toBe("C_test_group_123");
  });

  it("POST /api/clubs/link rejects non-owner with 403", async () => {
    const cookie = await makeSessionCookie({ lineUserId: TARGET_LINE_ID, isLoggedIn: true });
    const res = await app.handle(new Request("http://localhost/api/clubs/link", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ clubId: testClubId, groupId: "C_other_group" }),
    }));
    expect(res.status).toBe(403);
  });
});
