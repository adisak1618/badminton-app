import { describe, it, expect, mock, beforeAll, afterAll, spyOn } from "bun:test";
import { toZonedTime } from "date-fns-tz";
import { db, clubs, clubMembers, members, events, eventTemplates } from "@repo/db";
import { eq, and } from "drizzle-orm";

// Set test env vars BEFORE importing the app
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long!!";
process.env.WEB_BASE_URL = "http://localhost:3000";
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "test-secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "test-token";
process.env.LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "test-login-channel-id";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.LIFF_ID = "test-liff-id";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret-at-least-32-chars!!";

const BANGKOK_TZ = "Asia/Bangkok";

// Mock @line/bot-sdk to avoid real LINE API calls
mock.module("@line/bot-sdk", () => ({
  validateSignature: () => true,
  messagingApi: {
    MessagingApiClient: class {
      async pushMessage(_args: unknown) {
        return { sentMessages: [{ id: "mock-cron-msg-id", quoteToken: "qt" }] };
      }
      async replyMessage(_args: unknown) {}
    },
  },
  webhook: {},
}));

mock.module("../webhook/handlers/idempotency", () => ({
  processWithIdempotency: async (_id: string, handler: () => Promise<void>) => {
    await handler();
  },
}));

let app: any;
let lineClient: any;
let pushMessageSpy: ReturnType<typeof spyOn>;

let testClubId: string;
let testClubWithGroupId: string; // lineGroupId set

beforeAll(async () => {
  const mod = await import("../index");
  app = mod.default;

  const lineClientMod = await import("../lib/line-client");
  lineClient = lineClientMod.lineClient;
  pushMessageSpy = spyOn(lineClient, "pushMessage").mockResolvedValue({
    sentMessages: [{ id: "mock-cron-msg-id", quoteToken: "qt" }],
  });

  // Seed a club WITH lineGroupId
  const [c] = await db
    .insert(clubs)
    .values({
      name: "Cron Test Club " + Date.now(),
      homeCourtLocation: "Cron Court",
      lineGroupId: "C_cron_group_" + Date.now(),
      defaultShuttlecockFee: 50,
      defaultCourtFee: 200,
      defaultMaxPlayers: 16,
    })
    .returning();
  testClubWithGroupId = c.id;
  testClubId = c.id;
});

afterAll(async () => {
  await db.delete(events).where(eq(events.clubId, testClubId));
  await db.delete(eventTemplates).where(eq(eventTemplates.clubId, testClubId));
  await db.delete(clubs).where(eq(clubs.id, testClubId));
});

function cronAuthHeader(): string {
  return `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * Returns eventTemplates values where the registration window is currently open
 * based on the current Bangkok time (open before now, event after now — same week).
 */
function buildOpenWindowTemplate(clubId: string) {
  const nowBangkok = toZonedTime(new Date(), BANGKOK_TZ);
  const currentDow = nowBangkok.getDay(); // 0=Sun..6=Sat
  const currentHour = nowBangkok.getHours();

  // openTime = 1 hour ago, eventTime = 1 hour from now (or next day if near midnight)
  let openHour = currentHour - 1;
  let openDayOfWeek = currentDow;
  if (openHour < 0) {
    openHour = 23;
    openDayOfWeek = (currentDow - 1 + 7) % 7;
  }

  let eventHour = currentHour + 1;
  let eventDayOfWeek = currentDow;
  if (eventHour >= 24) {
    eventHour = 1;
    eventDayOfWeek = (currentDow + 1) % 7;
  }

  return {
    clubId,
    venueName: "Cron Test Venue",
    venueMapsUrl: null as string | null,
    shuttlecockFee: 50,
    courtFee: 200,
    maxPlayers: 12,
    title: null as string | null,
    eventDayOfWeek,
    eventTime: `${String(eventHour).padStart(2, "0")}:00`,
    openDayOfWeek,
    openTime: `${String(openHour).padStart(2, "0")}:00`,
    status: "active" as const,
  };
}

/**
 * Returns eventTemplates values where the registration window is NOT yet open
 * (openTime = 2 hours from now).
 */
function buildClosedWindowTemplate(clubId: string) {
  const nowBangkok = toZonedTime(new Date(), BANGKOK_TZ);
  const currentDow = nowBangkok.getDay();
  const currentHour = nowBangkok.getHours();

  let openHour = currentHour + 2;
  let openDayOfWeek = currentDow;
  if (openHour >= 24) {
    openHour = openHour - 24;
    openDayOfWeek = (currentDow + 1) % 7;
  }

  let eventHour = openHour + 2;
  let eventDayOfWeek = openDayOfWeek;
  if (eventHour >= 24) {
    eventHour = eventHour - 24;
    eventDayOfWeek = (openDayOfWeek + 1) % 7;
  }

  return {
    clubId,
    venueName: "Closed Window Venue",
    venueMapsUrl: null as string | null,
    shuttlecockFee: 30,
    courtFee: 100,
    maxPlayers: 8,
    title: null as string | null,
    eventDayOfWeek,
    eventTime: `${String(eventHour).padStart(2, "0")}:00`,
    openDayOfWeek,
    openTime: `${String(openHour).padStart(2, "0")}:00`,
    status: "active" as const,
  };
}

describe("POST /api/cron/generate-occurrences", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/cron/generate-occurrences", {
        method: "POST",
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when wrong bearer token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/cron/generate-occurrences", {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret-token-that-is-not-correct" },
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("generates occurrence when template window is open", async () => {
    const [tpl] = await db
      .insert(eventTemplates)
      .values(buildOpenWindowTemplate(testClubId))
      .returning();

    try {
      const res = await app.handle(
        new Request("http://localhost/api/cron/generate-occurrences", {
          method: "POST",
          headers: { Authorization: cronAuthHeader() },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.generated).toBeGreaterThanOrEqual(1);

      // Verify event was created with templateId set and status=open
      const created = await db
        .select()
        .from(events)
        .where(and(eq(events.templateId, tpl.id), eq(events.status, "open")));
      expect(created.length).toBe(1);
      expect(created[0].templateId).toBe(tpl.id);
      expect(created[0].status).toBe("open");
    } finally {
      await db.delete(events).where(eq(events.templateId, tpl.id));
      await db.delete(eventTemplates).where(eq(eventTemplates.id, tpl.id));
    }
  });

  it("skips template whose window is not yet open", async () => {
    const [tpl] = await db
      .insert(eventTemplates)
      .values(buildClosedWindowTemplate(testClubId))
      .returning();

    try {
      const res = await app.handle(
        new Request("http://localhost/api/cron/generate-occurrences", {
          method: "POST",
          headers: { Authorization: cronAuthHeader() },
        })
      );
      expect(res.status).toBe(200);

      // Verify no event was created for this template
      const created = await db
        .select()
        .from(events)
        .where(eq(events.templateId, tpl.id));
      expect(created.length).toBe(0);
    } finally {
      await db.delete(eventTemplates).where(eq(eventTemplates.id, tpl.id));
    }
  });

  it("does not create duplicate event (idempotency guard)", async () => {
    const [tpl] = await db
      .insert(eventTemplates)
      .values(buildOpenWindowTemplate(testClubId))
      .returning();

    try {
      // First call
      const res1 = await app.handle(
        new Request("http://localhost/api/cron/generate-occurrences", {
          method: "POST",
          headers: { Authorization: cronAuthHeader() },
        })
      );
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.generated).toBeGreaterThanOrEqual(1);

      // Second call in same week
      const res2 = await app.handle(
        new Request("http://localhost/api/cron/generate-occurrences", {
          method: "POST",
          headers: { Authorization: cronAuthHeader() },
        })
      );
      expect(res2.status).toBe(200);
      const body2 = await res2.json();

      // No additional event for this template
      const allEvents = await db
        .select()
        .from(events)
        .where(eq(events.templateId, tpl.id));
      expect(allEvents.length).toBe(1);
    } finally {
      await db.delete(events).where(eq(events.templateId, tpl.id));
      await db.delete(eventTemplates).where(eq(eventTemplates.id, tpl.id));
    }
  });

  it("posts Flex Message to LINE group when occurrence is generated", async () => {
    pushMessageSpy.mockClear();

    const [tpl] = await db
      .insert(eventTemplates)
      .values(buildOpenWindowTemplate(testClubId))
      .returning();

    try {
      const res = await app.handle(
        new Request("http://localhost/api/cron/generate-occurrences", {
          method: "POST",
          headers: { Authorization: cronAuthHeader() },
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.generated).toBeGreaterThanOrEqual(1);

      // Flex Message should have been pushed
      expect(pushMessageSpy).toHaveBeenCalled();
      const callArgs = pushMessageSpy.mock.calls[0][0] as any;
      expect(callArgs.messages[0].type).toBe("flex");
    } finally {
      await db.delete(events).where(eq(events.templateId, tpl.id));
      await db.delete(eventTemplates).where(eq(eventTemplates.id, tpl.id));
    }
  });
});
