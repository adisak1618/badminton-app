import { describe, it, expect, mock, beforeAll, beforeEach, spyOn } from "bun:test";
import { createHmac } from "crypto";

const TEST_WEB_URL = "https://test.example.com";

// Set test env vars BEFORE importing (env.ts validates at import time)
process.env.LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "test-secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
process.env.LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "test-login-channel-id";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.SESSION_SECRET = "a-random-string-at-least-32-characters-long-for-tests";
process.env.WEB_BASE_URL = TEST_WEB_URL;

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
}));

// Mock idempotency handler to avoid DB dependency in unit tests
mock.module("../webhook/handlers/idempotency", () => ({
  processWithIdempotency: async (_id: string, handler: () => Promise<void>) => {
    await handler();
  },
}));

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
});

function makeSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

describe("Bot join event (CLUB-02)", () => {
  it("sends Flex Message with setup link when bot joins a group", async () => {
    const joinBody = JSON.stringify({
      destination: "test",
      events: [
        {
          type: "join",
          webhookEventId: "test-join-" + Date.now(),
          timestamp: Date.now(),
          source: { type: "group", groupId: "C1234567890abcdef" },
          replyToken: "test-reply-token-join",
        },
      ],
    });

    const signature = makeSignature(joinBody, process.env.LINE_CHANNEL_SECRET!);
    const req = new Request("http://localhost/api/webhook/line", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": signature,
      },
      body: joinBody,
    });

    const res = await app.handle(req);
    expect(res.status).toBe(200);

    // Wait for async event processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify replyMessage was called with Flex Message
    expect(replyMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = replyMessageSpy.mock.calls[0][0];
    expect(callArgs.replyToken).toBe("test-reply-token-join");
    expect(callArgs.messages).toHaveLength(1);
    expect(callArgs.messages[0].type).toBe("flex");

    // Verify setup URL contains groupId
    const flexContent = callArgs.messages[0].contents;
    const footerButton = flexContent.footer.contents[0];
    expect(footerButton.action.uri).toContain("/clubs/link?groupId=C1234567890abcdef");
  });

  it("returns 200 for join event with no groupId (edge case)", async () => {
    const joinBody = JSON.stringify({
      destination: "test",
      events: [
        {
          type: "join",
          webhookEventId: "test-join-no-group-" + Date.now(),
          timestamp: Date.now(),
          source: { type: "user", userId: "U123" },
          replyToken: "test-reply-token-no-group",
        },
      ],
    });

    const signature = makeSignature(joinBody, process.env.LINE_CHANNEL_SECRET!);
    const req = new Request("http://localhost/api/webhook/line", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": signature,
      },
      body: joinBody,
    });

    const res = await app.handle(req);
    expect(res.status).toBe(200);
    // Should not throw — handler returns early when no groupId
  });
});
