import { describe, it, expect, mock, beforeAll, beforeEach, spyOn } from "bun:test";
import { createHmac } from "crypto";

const TEST_WEB_URL = "https://test.example.com";
const TEST_LIFF_ID = "test-liff-id";

// Set test env vars BEFORE importing (env.ts validates at import time)
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "test-secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
process.env.LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "test-login-channel-id";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.SESSION_SECRET = "a-random-string-at-least-32-characters-long-for-tests";
process.env.WEB_BASE_URL = TEST_WEB_URL;
process.env.LIFF_ID = TEST_LIFF_ID;

// Mock @line/bot-sdk for signature validation
mock.module("@line/bot-sdk", () => ({
  validateSignature: (body: string, secret: string, signature: string) => {
    const expected = createHmac("sha256", secret)
      .update(body)
      .digest("base64");
    return expected === signature;
  },
  messagingApi: {
    MessagingApiClient: class {
      async replyMessage(_args: any) {}
    },
  },
  webhook: {},
}));

// Mock idempotency handler to avoid DB dependency in unit tests
mock.module("../webhook/handlers/idempotency", () => ({
  processWithIdempotency: async (_id: string, handler: () => Promise<void>) => {
    await handler();
  },
}));

// DB mock return value we can control per test
let dbMockResult: Array<{ role: string; clubId: string }> = [];

// Mock @repo/db to avoid real DB calls
mock.module("@repo/db", () => {
  const mockWhere = () => Promise.resolve(dbMockResult);
  const mockInnerJoin2 = () => ({ where: mockWhere });
  const mockInnerJoin1 = () => ({ innerJoin: mockInnerJoin2 });
  const mockFrom = () => ({ innerJoin: mockInnerJoin1 });
  const mockSelect = () => ({ from: mockFrom });

  return {
    db: {
      select: mockSelect,
    },
    clubs: {},
    clubMembers: {},
    members: {},
    eq: () => {},
    and: () => {},
  };
});

let app: any;
let lineClient: any;
let replyMessageSpy: ReturnType<typeof spyOn>;

beforeAll(async () => {
  const mod = await import("../../src/index");
  app = mod.default;
  // Spy on the actual lineClient singleton to capture replyMessage calls
  const lineClientMod = await import("../lib/line-client");
  lineClient = lineClientMod.lineClient;
  replyMessageSpy = spyOn(lineClient, "replyMessage").mockResolvedValue({});
});

beforeEach(() => {
  replyMessageSpy.mockClear();
  // Default: admin result
  dbMockResult = [{ role: "admin", clubId: "test-club-id" }];
});

function makeSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function makeTextMessageBody(text: string, groupId = "Ctest-group-id", userId = "Utest-user-id", eventId = `msg-${Date.now()}-${Math.random()}`) {
  return JSON.stringify({
    destination: "test",
    events: [
      {
        type: "message",
        webhookEventId: eventId,
        timestamp: Date.now(),
        source: { type: "group", groupId, userId },
        replyToken: "test-reply-token",
        message: {
          type: "text",
          id: "msg-id-001",
          text,
        },
      },
    ],
  });
}

async function sendWebhook(body: string) {
  const signature = makeSignature(body, process.env.LINE_CHANNEL_SECRET!);
  const req = new Request("http://localhost/api/webhook/line", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-line-signature": signature,
    },
    body,
  });
  const res = await app.handle(req);
  // Wait for async event processing
  await new Promise((resolve) => setTimeout(resolve, 100));
  return res;
}

describe("Bot text message handler - BOT-03", () => {
  it("Test 1: Admin sending /create receives a LIFF link reply with clubId", async () => {
    dbMockResult = [{ role: "admin", clubId: "test-club-id" }];
    const body = makeTextMessageBody("/create");
    const res = await sendWebhook(body);

    expect(res.status).toBe(200);
    expect(replyMessageSpy).toHaveBeenCalledTimes(1);

    const callArgs = replyMessageSpy.mock.calls[0][0];
    expect(callArgs.replyToken).toBe("test-reply-token");
    expect(callArgs.messages).toHaveLength(1);
    expect(callArgs.messages[0].type).toBe("text");

    const replyText: string = callArgs.messages[0].text;
    expect(replyText).toContain(`https://liff.line.me/${TEST_LIFF_ID}/events/create?clubId=test-club-id`);
  });

  it("Test 2: Admin sending สร้าง receives the same LIFF link reply", async () => {
    dbMockResult = [{ role: "admin", clubId: "test-club-id" }];
    const body = makeTextMessageBody("สร้าง");
    await sendWebhook(body);

    expect(replyMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = replyMessageSpy.mock.calls[0][0];
    const replyText: string = callArgs.messages[0].text;
    expect(replyText).toContain(`https://liff.line.me/${TEST_LIFF_ID}/events/create?clubId=test-club-id`);
  });

  it("Test 3: Admin sending สร้างอีเวนท์ receives the same LIFF link reply", async () => {
    dbMockResult = [{ role: "admin", clubId: "test-club-id" }];
    const body = makeTextMessageBody("สร้างอีเวนท์");
    await sendWebhook(body);

    expect(replyMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = replyMessageSpy.mock.calls[0][0];
    const replyText: string = callArgs.messages[0].text;
    expect(replyText).toContain(`https://liff.line.me/${TEST_LIFF_ID}/events/create?clubId=test-club-id`);
  });

  it("Test 4: Admin sending /new receives the same LIFF link reply", async () => {
    dbMockResult = [{ role: "admin", clubId: "test-club-id" }];
    const body = makeTextMessageBody("/new");
    await sendWebhook(body);

    expect(replyMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = replyMessageSpy.mock.calls[0][0];
    const replyText: string = callArgs.messages[0].text;
    expect(replyText).toContain(`https://liff.line.me/${TEST_LIFF_ID}/events/create?clubId=test-club-id`);
  });

  it("Test 5: Non-admin member sending /create gets NO replyMessage call (D-03 silent ignore)", async () => {
    dbMockResult = [{ role: "member", clubId: "test-club-id" }];
    const body = makeTextMessageBody("/create");
    await sendWebhook(body);

    expect(replyMessageSpy).not.toHaveBeenCalled();
  });

  it("Test 6: Unknown lineUserId (not in members table) sending /create gets NO reply", async () => {
    dbMockResult = [];
    const body = makeTextMessageBody("/create");
    await sendWebhook(body);

    expect(replyMessageSpy).not.toHaveBeenCalled();
  });

  it("Test 7: Message in unlinked group (no club with that lineGroupId) gets NO reply", async () => {
    dbMockResult = [];
    const body = makeTextMessageBody("/create", "C-unlinked-group-id");
    await sendWebhook(body);

    expect(replyMessageSpy).not.toHaveBeenCalled();
  });

  it("Test 8: Non-command text (e.g., hello) gets NO reply", async () => {
    dbMockResult = [{ role: "admin", clubId: "test-club-id" }];
    const body = makeTextMessageBody("hello");
    await sendWebhook(body);

    expect(replyMessageSpy).not.toHaveBeenCalled();
  });

  it("Test 9: Command with trailing whitespace (/create ) still triggers the flow (trim behavior)", async () => {
    dbMockResult = [{ role: "admin", clubId: "test-club-id" }];
    const body = makeTextMessageBody("/create ");
    await sendWebhook(body);

    expect(replyMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = replyMessageSpy.mock.calls[0][0];
    const replyText: string = callArgs.messages[0].text;
    expect(replyText).toContain(`https://liff.line.me/${TEST_LIFF_ID}/events/create?clubId=test-club-id`);
  });

  it("Owner sending /create also receives the LIFF link reply", async () => {
    dbMockResult = [{ role: "owner", clubId: "test-club-id" }];
    const body = makeTextMessageBody("/create");
    await sendWebhook(body);

    expect(replyMessageSpy).toHaveBeenCalledTimes(1);
  });
});
