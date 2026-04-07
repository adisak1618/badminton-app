import { describe, it, expect, mock, beforeAll, afterAll, spyOn, beforeEach } from "bun:test";
import { sealData } from "iron-session";
import { db, clubs, clubMembers, members, events } from "@repo/db";
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

let testMemberId: string;
let testClubId: string;
let memberClubId: string; // club where test user is plain member
let testMemberId2: string; // plain member
const TEST_LINE_USER_ID = "U_test_events_admin_" + Date.now();
const PLAIN_MEMBER_LINE_USER_ID = "U_test_events_member_" + Date.now();

async function makeSessionCookie(data: Record<string, unknown>): Promise<string> {
  const sealed = await sealData(data, {
    password: process.env.SESSION_SECRET!,
  });
  return `badminton-session=${sealed}`;
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
  const [m] = await db
    .insert(members)
    .values({
      lineUserId: TEST_LINE_USER_ID,
      displayName: "Test Event Admin",
      skillLevel: "intermediate",
    })
    .returning();
  testMemberId = m.id;

  // Seed plain member
  const [m2] = await db
    .insert(members)
    .values({
      lineUserId: PLAIN_MEMBER_LINE_USER_ID,
      displayName: "Plain Member",
      skillLevel: "beginner",
    })
    .returning();
  testMemberId2 = m2.id;

  // Seed a club with lineGroupId (for successful event creation)
  const [c] = await db
    .insert(clubs)
    .values({
      name: "Event Test Club",
      homeCourtLocation: "Test Court",
      lineGroupId: "C_test_group_" + Date.now(),
      defaultShuttlecockFee: 50,
      defaultCourtFee: 200,
      defaultMaxPlayers: 16,
    })
    .returning();
  testClubId = c.id;

  // Seed admin role for test member
  await db.insert(clubMembers).values({
    clubId: testClubId,
    memberId: testMemberId,
    role: "admin",
  });

  // Seed a club WITHOUT lineGroupId (for 422 test)
  const [c2] = await db
    .insert(clubs)
    .values({
      name: "Unlinked Club",
      homeCourtLocation: "Unlinked Court",
      defaultShuttlecockFee: 30,
      defaultCourtFee: 100,
      defaultMaxPlayers: 12,
    })
    .returning();
  memberClubId = c2.id;

  // Admin role for test member in unlinked club too
  await db.insert(clubMembers).values({
    clubId: memberClubId,
    memberId: testMemberId,
    role: "admin",
  });

  // Plain member role in testClubId
  await db.insert(clubMembers).values({
    clubId: testClubId,
    memberId: testMemberId2,
    role: "member",
  });
});

afterAll(async () => {
  // Cleanup events
  await db.delete(events).where(eq(events.clubId, testClubId));
  await db.delete(events).where(eq(events.clubId, memberClubId));
  // Cleanup memberships
  await db.delete(clubMembers).where(eq(clubMembers.clubId, testClubId));
  await db.delete(clubMembers).where(eq(clubMembers.clubId, memberClubId));
  // Cleanup clubs
  if (testClubId) await db.delete(clubs).where(eq(clubs.id, testClubId));
  if (memberClubId) await db.delete(clubs).where(eq(clubs.id, memberClubId));
  // Cleanup members
  await db.delete(members).where(eq(members.id, testMemberId));
  await db.delete(members).where(eq(members.id, testMemberId2));
});

beforeEach(() => {
  pushMessageSpy.mockClear();
  pushMessageSpy.mockResolvedValue({
    sentMessages: [{ id: "mock-msg-id", quoteToken: "qt" }],
  });
});

const validEventBody = () => ({
  clubId: testClubId,
  title: "แบด Test Event",
  eventDate: "2026-04-15T18:00:00+07:00",
  venueName: "Test Venue",
  venueMapsUrl: "https://maps.google.com/?q=test",
  shuttlecockFee: 60,
  courtFee: 250,
  maxPlayers: 14,
});

// --- GET /api/events/club-defaults ---

describe("GET /api/events/club-defaults (EVNT-02)", () => {
  it("returns club default fields for admin", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request(
        `http://localhost/api/events/club-defaults?clubId=${testClubId}`,
        { headers: { cookie } }
      )
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.venueName).toBe("Test Court");
    expect(data.defaultShuttlecockFee).toBe(50);
    expect(data.defaultCourtFee).toBe(200);
    expect(data.defaultMaxPlayers).toBe(16);
  });

  it("returns 403 for a non-admin (plain member)", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: PLAIN_MEMBER_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request(
        `http://localhost/api/events/club-defaults?clubId=${testClubId}`,
        { headers: { cookie } }
      )
    );
    expect(res.status).toBe(403);
  });
});

// --- POST /api/events ---

describe("POST /api/events (EVNT-01, BOT-01)", () => {
  it("creates event with status=open and returns 201", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(validEventBody()),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe("แบด Test Event");
    expect(data.status).toBe("open");
    expect(data.id).toBeDefined();

    // Verify DB record has status=open
    const [dbEvent] = await db
      .select()
      .from(events)
      .where(eq(events.id, data.id));
    expect(dbEvent.status).toBe("open");
  });

  it("calls lineClient.pushMessage and returns lineMessageId", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ ...validEventBody(), title: "Push Test Event" }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();

    // pushMessage should have been called
    expect(pushMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = pushMessageSpy.mock.calls[0][0] as any;
    expect(callArgs.messages).toHaveLength(1);
    expect(callArgs.messages[0].type).toBe("flex");

    // lineMessageId stored from response
    expect(data.lineMessageId).toBe("mock-msg-id");
  });

  it("returns 422 when club has no lineGroupId", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          ...validEventBody(),
          clubId: memberClubId,
        }),
      })
    );
    expect(res.status).toBe(422);
    const text = await res.text();
    expect(text).toContain("LINE");
  });

  it("returns 403 for non-admin (plain member)", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: PLAIN_MEMBER_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(validEventBody()),
      })
    );
    expect(res.status).toBe(403);
  });

  it("auto-generates title from date + venue when title is omitted", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const body = { ...validEventBody() };
    delete (body as any).title;

    const res = await app.handle(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    // Auto-generated title should contain venue name and "แบด"
    expect(data.title).toContain("แบด");
    expect(data.title).toContain("Test Venue");
  });

  it("still creates event when pushMessage throws (lineMessageId is null)", async () => {
    pushMessageSpy.mockImplementationOnce(() => Promise.reject(new Error("LINE API quota exceeded")));

    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ ...validEventBody(), title: "Fallback Event" }),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.lineMessageId).toBeNull();
  });

  it("returns 401 when no session cookie", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validEventBody()),
      })
    );
    expect(res.status).toBe(401);
  });
});

// --- Flex Message card content ---

describe("Flex Message card content (BOT-01)", () => {
  it("contains Thai fee format, spots count, and CTA labels", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });

    pushMessageSpy.mockResolvedValueOnce({
      sentMessages: [{ id: "flex-check-msg-id", quoteToken: "qt" }],
    });

    await app.handle(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          ...validEventBody(),
          title: "Flex Card Content Test",
          shuttlecockFee: 75,
          courtFee: 300,
          maxPlayers: 10,
        }),
      })
    );

    expect(pushMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = pushMessageSpy.mock.calls[0][0] as any;
    const flexMsg = callArgs.messages[0];
    const flexJson = JSON.stringify(flexMsg);

    // Fee format with Thai labels
    expect(flexJson).toContain("ลูกขน");
    expect(flexJson).toContain("สนาม");
    expect(flexJson).toContain("฿");
    // Spots count
    expect(flexJson).toContain("คน");
    // CTA buttons
    expect(flexJson).toContain("ลงทะเบียน");
    expect(flexJson).toContain("รายละเอียด");
    // Colors
    expect(flexJson).toContain("#22c55e");
    expect(flexJson).toContain("#00B300");
  });
});
