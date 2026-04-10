import { describe, it, expect, mock, beforeAll, afterAll, spyOn, beforeEach } from "bun:test";
import { sealData } from "iron-session";
import { db, clubs, clubMembers, members, events, registrations } from "@repo/db";
import { eq } from "drizzle-orm";

// Set test env vars BEFORE importing the app
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long!!";
process.env.WEB_BASE_URL = "http://localhost:3000";
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "test-secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "test-token";
process.env.LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "test-login-channel-id";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.LIFF_ID = "test-liff-id";

// Mock @line/bot-sdk to avoid real LINE API calls
mock.module("@line/bot-sdk", () => ({
  validateSignature: () => true,
  messagingApi: {
    MessagingApiClient: class {
      async pushMessage(_args: unknown) {
        return { sentMessages: [{ id: "mock-msg-id", quoteToken: "qt" }] };
      }
      async replyMessage(_args: unknown) {}
    },
  },
  webhook: {},
}));

// Mock idempotency handler to avoid DB dependency
mock.module("../webhook/handlers/idempotency", () => ({
  processWithIdempotency: async (_id: string, handler: () => Promise<void>) => {
    await handler();
  },
}));

let app: any;
let lineClient: any;
let pushMessageSpy: ReturnType<typeof spyOn>;

// Test fixture IDs
let adminMemberId: string;
let plainMemberId: string;
let testClubId: string;
let testEventId: string;

const ADMIN_LINE_USER_ID = "U_reg_test_admin_" + Date.now();
const PLAIN_LINE_USER_ID = "U_reg_test_plain_" + Date.now();

async function makeSessionCookie(data: Record<string, unknown>): Promise<string> {
  const sealed = await sealData(data, {
    password: process.env.SESSION_SECRET!,
  });
  return `badminton-session=${sealed}`;
}

// Helper to clean all registrations for test event
async function cleanRegistrations() {
  await db.delete(registrations).where(eq(registrations.eventId, testEventId));
}

beforeAll(async () => {
  const mod = await import("../index");
  app = mod.default;

  const lineClientMod = await import("../lib/line-client");
  lineClient = lineClientMod.lineClient;
  pushMessageSpy = spyOn(lineClient, "pushMessage").mockResolvedValue({
    sentMessages: [{ id: "mock-msg-id", quoteToken: "qt" }],
  });

  // Seed admin member
  const [adminMember] = await db
    .insert(members)
    .values({
      lineUserId: ADMIN_LINE_USER_ID,
      displayName: "Admin Member",
      skillLevel: "intermediate",
    })
    .returning();
  adminMemberId = adminMember.id;

  // Seed plain member
  const [plainMember] = await db
    .insert(members)
    .values({
      lineUserId: PLAIN_LINE_USER_ID,
      displayName: "Plain Member",
      skillLevel: "beginner",
    })
    .returning();
  plainMemberId = plainMember.id;

  // Seed club with lineGroupId
  const [club] = await db
    .insert(clubs)
    .values({
      name: "Registration Test Club",
      homeCourtLocation: "Test Court",
      lineGroupId: "C_reg_test_group_" + Date.now(),
      defaultShuttlecockFee: 50,
      defaultCourtFee: 200,
      defaultMaxPlayers: 16,
    })
    .returning();
  testClubId = club.id;

  // Seed admin club membership
  await db.insert(clubMembers).values({
    clubId: testClubId,
    memberId: adminMemberId,
    role: "admin",
  });

  // Seed plain club membership
  await db.insert(clubMembers).values({
    clubId: testClubId,
    memberId: plainMemberId,
    role: "member",
  });

  // Seed open event with maxPlayers=3
  const [event] = await db
    .insert(events)
    .values({
      clubId: testClubId,
      title: "Test Registration Event",
      eventDate: new Date("2026-05-01T18:00:00+07:00"),
      venueName: "Test Venue",
      shuttlecockFee: 60,
      courtFee: 250,
      maxPlayers: 3,
      status: "open",
    })
    .returning();
  testEventId = event.id;
});

afterAll(async () => {
  // Cleanup registrations
  await db.delete(registrations).where(eq(registrations.eventId, testEventId));
  // Cleanup events
  await db.delete(events).where(eq(events.clubId, testClubId));
  // Cleanup memberships
  await db.delete(clubMembers).where(eq(clubMembers.clubId, testClubId));
  // Cleanup club
  await db.delete(clubs).where(eq(clubs.id, testClubId));
  // Cleanup members
  await db.delete(members).where(eq(members.id, adminMemberId));
  await db.delete(members).where(eq(members.id, plainMemberId));
});

beforeEach(async () => {
  // Clean registrations before each test to ensure clean state
  // (bun runs ALL beforeAll hooks before ANY tests, so we need per-test cleanup)
  await cleanRegistrations();
  // Reset event status to open
  await db.update(events).set({ status: "open" }).where(eq(events.id, testEventId));
  pushMessageSpy.mockClear();
  pushMessageSpy.mockResolvedValue({
    sentMessages: [{ id: "mock-msg-id", quoteToken: "qt" }],
  });
});

// ---- POST /api/registrations ----

describe("POST /api/registrations", () => {
  it("creates registration and returns 201", async () => {
    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request("http://localhost/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ eventId: testEventId }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.registeredCount).toBe(1);
  });

  it("returns 409 ALREADY_REGISTERED on duplicate", async () => {
    // Pre-register admin member directly in DB (avoids pooler read-lag issues)
    await db.insert(registrations).values({ eventId: testEventId, memberId: adminMemberId });

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    // Now try to register again via API — should hit unique constraint
    const res = await app.handle(
      new Request("http://localhost/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ eventId: testEventId }),
      })
    );
    expect(res.status).toBe(409);
    const body = await res.text();
    // Elysia serializes error message; check for the Thai error message or error code
    expect(body).toContain("ลงทะเบียนแล้ว");
  });

  it("returns 409 EVENT_FULL when at capacity", async () => {
    // Register 3 members (maxPlayers=3) via direct DB insert
    const [extraMember1] = await db
      .insert(members)
      .values({ lineUserId: "U_extra1_" + Date.now(), displayName: "Extra1", skillLevel: "beginner" })
      .returning();
    const [extraMember2] = await db
      .insert(members)
      .values({ lineUserId: "U_extra2_" + Date.now(), displayName: "Extra2", skillLevel: "beginner" })
      .returning();
    const [extraMember3] = await db
      .insert(members)
      .values({ lineUserId: "U_extra3_" + Date.now(), displayName: "Extra3", skillLevel: "beginner" })
      .returning();

    await db.insert(registrations).values([
      { eventId: testEventId, memberId: extraMember1.id },
      { eventId: testEventId, memberId: extraMember2.id },
      { eventId: testEventId, memberId: extraMember3.id },
    ]);

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request("http://localhost/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ eventId: testEventId }),
      })
    );
    expect(res.status).toBe(409);
    const body = await res.text();
    expect(body).toContain("งานนี้เต็มแล้ว");

    // Cleanup: delete registrations first (FK constraint), then members
    await db.delete(registrations).where(eq(registrations.eventId, testEventId));
    await db.delete(members).where(eq(members.id, extraMember1.id));
    await db.delete(members).where(eq(members.id, extraMember2.id));
    await db.delete(members).where(eq(members.id, extraMember3.id));
  });

  it("returns 409 EVENT_CLOSED when event is closed", async () => {
    // Event already set to closed by beforeEach reset + explicit set
    await db.update(events).set({ status: "closed" }).where(eq(events.id, testEventId));

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request("http://localhost/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ eventId: testEventId }),
      })
    );
    expect(res.status).toBe(409);
    const body = await res.text();
    expect(body).toContain("ปิดรับลงทะเบียนแล้ว");
  });

  it("calls pushMessage after successful registration", async () => {
    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request("http://localhost/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ eventId: testEventId }),
      })
    );
    expect(res.status).toBe(201);
    expect(pushMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = pushMessageSpy.mock.calls[0][0] as any;
    expect(callArgs.messages[0].type).toBe("flex");
  });

  it("succeeds even when pushMessage throws", async () => {
    pushMessageSpy.mockImplementationOnce(() => Promise.reject(new Error("LINE API error")));

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request("http://localhost/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ eventId: testEventId }),
      })
    );
    expect(res.status).toBe(201);
  });

  it("updates events.lineMessageId after successful push", async () => {
    pushMessageSpy.mockResolvedValueOnce({
      sentMessages: [{ id: "reg-msg-id-123", quoteToken: "qt" }],
    });

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    await app.handle(
      new Request("http://localhost/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ eventId: testEventId }),
      })
    );

    const [dbEvent] = await db.select().from(events).where(eq(events.id, testEventId));
    expect(dbEvent.lineMessageId).toBe("reg-msg-id-123");
  });
});

// ---- GET /api/registrations ----

describe("GET /api/registrations", () => {
  it("returns event data and registration list with displayNames", async () => {
    // Seed a registration for this test
    await db.insert(registrations).values({ eventId: testEventId, memberId: adminMemberId });

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/registrations?eventId=${testEventId}`, {
        headers: { cookie },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.event.id).toBe(testEventId);
    expect(data.registrations).toHaveLength(1);
    expect(data.registrations[0].displayName).toBe("Admin Member");
    expect(data.registeredCount).toBe(1);
  });

  it("returns isAdmin=true for admin member", async () => {
    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/registrations?eventId=${testEventId}`, {
        headers: { cookie },
      })
    );
    const data = await res.json();
    expect(data.isAdmin).toBe(true);
  });

  it("returns isAdmin=false for plain member", async () => {
    const cookie = await makeSessionCookie({ lineUserId: PLAIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/registrations?eventId=${testEventId}`, {
        headers: { cookie },
      })
    );
    const data = await res.json();
    expect(data.isAdmin).toBe(false);
  });

  it("returns currentMemberRegistrationId when member is registered", async () => {
    // Seed a registration
    const [reg] = await db
      .insert(registrations)
      .values({ eventId: testEventId, memberId: adminMemberId })
      .returning();

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/registrations?eventId=${testEventId}`, {
        headers: { cookie },
      })
    );
    const data = await res.json();
    expect(data.currentMemberRegistrationId).toBe(reg.id);
  });
});

// ---- DELETE /api/registrations/:id ----

describe("DELETE /api/registrations/:id", () => {
  it("removes own registration and returns 200", async () => {
    // Register admin
    const [reg] = await db
      .insert(registrations)
      .values({ eventId: testEventId, memberId: adminMemberId })
      .returning();

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/registrations/${reg.id}`, {
        method: "DELETE",
        headers: { cookie },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.registeredCount).toBe(0);
  });

  it("returns 403 when non-admin removes another member", async () => {
    // Register admin member
    const [reg] = await db
      .insert(registrations)
      .values({ eventId: testEventId, memberId: adminMemberId })
      .returning();

    // Plain member tries to remove admin's registration
    const cookie = await makeSessionCookie({ lineUserId: PLAIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/registrations/${reg.id}`, {
        method: "DELETE",
        headers: { cookie },
      })
    );
    expect(res.status).toBe(403);
  });

  it("allows admin to remove any member registration", async () => {
    // Register plain member
    const [reg] = await db
      .insert(registrations)
      .values({ eventId: testEventId, memberId: plainMemberId })
      .returning();

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/registrations/${reg.id}`, {
        method: "DELETE",
        headers: { cookie },
      })
    );
    expect(res.status).toBe(200);
  });
});

// ---- PATCH /api/events/:id/status ----

describe("PATCH /api/events/:id/status", () => {
  it("closes event for admin", async () => {
    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/events/${testEventId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ status: "closed" }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("closed");

    // Verify DB
    const [dbEvent] = await db.select().from(events).where(eq(events.id, testEventId));
    expect(dbEvent.status).toBe("closed");
  });

  it("returns 403 for non-admin", async () => {
    const cookie = await makeSessionCookie({ lineUserId: PLAIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/events/${testEventId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ status: "open" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("reopens event for admin", async () => {
    // First close it
    await db.update(events).set({ status: "closed" }).where(eq(events.id, testEventId));

    const cookie = await makeSessionCookie({ lineUserId: ADMIN_LINE_USER_ID, isLoggedIn: true });
    const res = await app.handle(
      new Request(`http://localhost/api/events/${testEventId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ status: "open" }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("open");
  });
});
