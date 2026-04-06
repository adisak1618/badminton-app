import { describe, it, expect, mock, beforeAll } from "bun:test";
import { createHmac } from "crypto";

const TEST_SECRET = "test-channel-secret-for-join-tests";
const TEST_WEB_URL = "https://test.example.com";

// Set test env vars BEFORE importing (env.ts validates at import time)
process.env.LINE_CHANNEL_SECRET = TEST_SECRET;
process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.SESSION_SECRET = "a-random-string-at-least-32-characters-long-for-tests";
process.env.WEB_BASE_URL = TEST_WEB_URL;

// Mock the LINE client to capture replyMessage calls
let capturedReplyArgs: any = null;
mock.module("@line/bot-sdk", () => ({
  validateSignature: (body: string, secret: string, signature: string) => {
    const expected = createHmac("sha256", secret)
      .update(body)
      .digest("base64");
    return expected === signature;
  },
  messagingApi: {
    MessagingApiClient: class {
      async replyMessage(args: any) {
        capturedReplyArgs = args;
      }
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

beforeAll(async () => {
  const mod = await import("../../src/index");
  app = mod.default;
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

    const signature = makeSignature(joinBody, TEST_SECRET);
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
    expect(capturedReplyArgs).not.toBeNull();
    expect(capturedReplyArgs.replyToken).toBe("test-reply-token-join");
    expect(capturedReplyArgs.messages).toHaveLength(1);
    expect(capturedReplyArgs.messages[0].type).toBe("flex");

    // Verify setup URL contains groupId
    const flexContent = capturedReplyArgs.messages[0].contents;
    const footerButton = flexContent.footer.contents[0];
    expect(footerButton.action.uri).toBe(
      `${TEST_WEB_URL}/clubs/link?groupId=C1234567890abcdef`
    );
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

    const signature = makeSignature(joinBody, TEST_SECRET);
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
