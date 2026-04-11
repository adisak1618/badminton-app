import { describe, it, expect, mock, beforeAll, afterAll, spyOn, beforeEach } from "bun:test";
import { sealData } from "iron-session";
import { db, clubs, clubMembers, members, events, eventTemplates, registrations } from "@repo/db";
import { eq, and } from "drizzle-orm";

// Set test env vars BEFORE importing the app
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long!!";
process.env.WEB_BASE_URL = "http://localhost:3000";
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "test-secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "test-token";
process.env.LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "test-login-channel-id";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.LIFF_ID = "test-liff-id";
process.env.CRON_SECRET = "test-cron-secret-at-least-32-characters-long!!";

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
let testTemplateId: string;
const TEST_LINE_USER_ID = "U_test_templates_admin_" + Date.now();

async function makeSessionCookie(data: Record<string, unknown>): Promise<string> {
  const sealed = await sealData(data, {
    password: process.env.SESSION_SECRET!,
  });
  return `badminton-session=${sealed}`;
}

const validTemplateBody = () => ({
  clubId: testClubId,
  venueName: "Template Test Court",
  venueMapsUrl: "https://maps.google.com/?q=test",
  shuttlecockFee: 60,
  courtFee: 250,
  maxPlayers: 14,
  title: "แบด Template Test",
  eventDayOfWeek: 4, // Thursday
  eventTime: "18:00",
  openDayOfWeek: 1, // Monday
  openTime: "09:00",
});

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
      displayName: "Test Template Admin",
      skillLevel: "intermediate",
    })
    .returning();
  testMemberId = m.id;

  // Seed a club with lineGroupId
  const [c] = await db
    .insert(clubs)
    .values({
      name: "Template Test Club",
      homeCourtLocation: "Template Court",
      lineGroupId: "C_template_group_" + Date.now(),
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
});

afterAll(async () => {
  // Cleanup in order: events -> templates -> memberships -> clubs -> members
  await db.delete(events).where(eq(events.clubId, testClubId));
  await db.delete(eventTemplates).where(eq(eventTemplates.clubId, testClubId));
  await db.delete(clubMembers).where(eq(clubMembers.clubId, testClubId));
  if (testClubId) await db.delete(clubs).where(eq(clubs.id, testClubId));
  await db.delete(members).where(eq(members.id, testMemberId));
});

beforeEach(() => {
  pushMessageSpy.mockClear();
  pushMessageSpy.mockResolvedValue({
    sentMessages: [{ id: "mock-msg-id", quoteToken: "qt" }],
  });
});

// --- POST /api/event-templates ---

describe("POST /api/event-templates", () => {
  it("creates template and returns 201 with all fields", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request("http://localhost/api/event-templates", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(validTemplateBody()),
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.venueName).toBe("Template Test Court");
    expect(data.eventDayOfWeek).toBe(4);
    expect(data.eventTime).toBe("18:00");
    expect(data.openDayOfWeek).toBe(1);
    expect(data.openTime).toBe("09:00");
    expect(data.status).toBe("active");
    testTemplateId = data.id;
  });

  it("returns 401 when no session", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/event-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validTemplateBody()),
      })
    );
    expect(res.status).toBe(401);
  });
});

// --- GET /api/event-templates ---

describe("GET /api/event-templates", () => {
  it("returns templates list for admin", async () => {
    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request(`http://localhost/api/event-templates?clubId=${testClubId}`, {
        headers: { cookie },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].venueName).toBeDefined();
  });
});

// --- PATCH /api/event-templates/:id ---

describe("PATCH /api/event-templates/:id", () => {
  it("updates template fields", async () => {
    // Ensure we have a template
    if (!testTemplateId) {
      const cookie = await makeSessionCookie({ lineUserId: TEST_LINE_USER_ID, isLoggedIn: true });
      const res = await app.handle(
        new Request("http://localhost/api/event-templates", {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify(validTemplateBody()),
        })
      );
      const data = await res.json();
      testTemplateId = data.id;
    }

    const cookie = await makeSessionCookie({
      lineUserId: TEST_LINE_USER_ID,
      isLoggedIn: true,
    });
    const res = await app.handle(
      new Request(`http://localhost/api/event-templates/${testTemplateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ venueName: "Updated Court", maxPlayers: 20 }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.venueName).toBe("Updated Court");
    expect(data.maxPlayers).toBe(20);
  });

  it("rejects maxPlayers below active occurrence registration count (422)", async () => {
    // Create a template
    const cookie = await makeSessionCookie({ lineUserId: TEST_LINE_USER_ID, isLoggedIn: true });
    const tRes = await app.handle(
      new Request("http://localhost/api/event-templates", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ ...validTemplateBody(), maxPlayers: 10 }),
      })
    );
    expect(tRes.status).toBe(201);
    const tData = await tRes.json();
    const templateId = tData.id;

    // Create an event linked to this template
    const [createdEvent] = await db
      .insert(events)
      .values({
        clubId: testClubId,
        templateId,
        title: "Test Occurrence",
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        venueName: "Test Court",
        shuttlecockFee: 60,
        courtFee: 250,
        maxPlayers: 10,
        status: "open",
      })
      .returning();

    // Create 5 registrations for that event
    const [m1] = await db.insert(members).values({ lineUserId: "U_reg1_" + Date.now(), displayName: "R1", skillLevel: "beginner" }).returning();
    const [m2] = await db.insert(members).values({ lineUserId: "U_reg2_" + Date.now(), displayName: "R2", skillLevel: "beginner" }).returning();
    const [m3] = await db.insert(members).values({ lineUserId: "U_reg3_" + Date.now(), displayName: "R3", skillLevel: "beginner" }).returning();

    await db.insert(registrations).values([
      { eventId: createdEvent.id, memberId: m1.id },
      { eventId: createdEvent.id, memberId: m2.id },
      { eventId: createdEvent.id, memberId: m3.id },
    ]);

    // Try to update maxPlayers to 2 (less than 3 registrations)
    const res = await app.handle(
      new Request(`http://localhost/api/event-templates/${templateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ maxPlayers: 2 }),
      })
    );
    expect(res.status).toBe(422);
    const body = await res.text();
    expect(body).toContain("จำนวนผู้เล่นสูงสุด");

    // Cleanup
    await db.delete(registrations).where(eq(registrations.eventId, createdEvent.id));
    await db.delete(events).where(eq(events.id, createdEvent.id));
    await db.delete(members).where(eq(members.id, m1.id));
    await db.delete(members).where(eq(members.id, m2.id));
    await db.delete(members).where(eq(members.id, m3.id));
    await db.delete(eventTemplates).where(eq(eventTemplates.id, templateId));
  });
});

// --- POST /api/event-templates/:id/create-now ---

describe("POST /api/event-templates/:id/create-now", () => {
  it("creates event with templateId, status=open, and future eventDate (D-15)", async () => {
    const cookie = await makeSessionCookie({ lineUserId: TEST_LINE_USER_ID, isLoggedIn: true });

    // Create a fresh template for this test
    const tRes = await app.handle(
      new Request("http://localhost/api/event-templates", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(validTemplateBody()),
      })
    );
    const tData = await tRes.json();
    const templateId = tData.id;

    const res = await app.handle(
      new Request(`http://localhost/api/event-templates/${templateId}/create-now`, {
        method: "POST",
        headers: { cookie },
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.templateId).toBe(templateId);
    expect(data.status).toBe("open");

    // D-15: eventDate must be in the future so Phase 5 auto-close applies
    const eventDate = new Date(data.eventDate);
    expect(eventDate.getTime()).toBeGreaterThan(Date.now());

    // Flex message was pushed
    expect(pushMessageSpy).toHaveBeenCalledTimes(1);
  });
});

// --- PATCH /api/event-templates/:id/occurrences/:eventId/cancel ---

describe("PATCH /api/event-templates/:id/occurrences/:eventId/cancel", () => {
  it("sets event status to cancelled and pushes cancellation Flex Message", async () => {
    const cookie = await makeSessionCookie({ lineUserId: TEST_LINE_USER_ID, isLoggedIn: true });

    // Create template
    const tRes = await app.handle(
      new Request("http://localhost/api/event-templates", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(validTemplateBody()),
      })
    );
    const tData = await tRes.json();
    const templateId = tData.id;

    // Create an event linked to template
    const [evt] = await db
      .insert(events)
      .values({
        clubId: testClubId,
        templateId,
        title: "Occurrence to Cancel",
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        venueName: "Test Court",
        shuttlecockFee: 60,
        courtFee: 250,
        maxPlayers: 14,
        status: "open",
      })
      .returning();

    pushMessageSpy.mockClear();

    const res = await app.handle(
      new Request(
        `http://localhost/api/event-templates/${templateId}/occurrences/${evt.id}/cancel`,
        { method: "PATCH", headers: { cookie } }
      )
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("cancelled");

    // Verify DB
    const [dbEvent] = await db.select().from(events).where(eq(events.id, evt.id));
    expect(dbEvent.status).toBe("cancelled");

    // Cancellation Flex Message posted
    expect(pushMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = pushMessageSpy.mock.calls[0][0] as any;
    const flexJson = JSON.stringify(callArgs.messages[0]);
    expect(flexJson).toContain("ยกเลิกอีเวนท์");
  });
});
