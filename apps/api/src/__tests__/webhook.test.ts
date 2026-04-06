import { describe, it, expect, mock, beforeAll } from "bun:test";
import { createHmac } from "crypto";

// Set test env vars BEFORE importing the app (env.ts validates at import time)
// NOTE: Use same secret as other test files — env module is a singleton cached on first import
const TEST_SECRET = "test-channel-secret-for-join-tests";
process.env.LINE_CHANNEL_SECRET = TEST_SECRET;
process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.SESSION_SECRET = "a-random-string-at-least-32-characters-long-for-tests";
process.env.WEB_BASE_URL = "https://test.example.com";

// Mock @line/bot-sdk so validateSignature uses this file's TEST_SECRET binding
// (prevents cross-file env pollution when test files run in same process)
mock.module("@line/bot-sdk", () => ({
  validateSignature: (body: string, secret: string, signature: string) => {
    const expected = createHmac("sha256", secret).update(body).digest("base64");
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

// Dynamic import after env is set
let app: any;

beforeAll(async () => {
  const mod = await import("../../src/index");
  app = mod.default;
});

function makeSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

const validBody = JSON.stringify({
  destination: "test",
  events: [
    {
      type: "message",
      webhookEventId: "test-event-" + Date.now(),
      timestamp: Date.now(),
      source: { type: "user", userId: "test-user" },
      replyToken: "test-reply-token",
      message: { type: "text", id: "test-msg-id", text: "hello" },
    },
  ],
});

describe("POST /api/webhook/line (INFRA-02)", () => {
  it("returns 401 when x-line-signature header is missing", async () => {
    const req = new Request("http://localhost/api/webhook/line", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: validBody,
    });
    const res = await app.handle(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when x-line-signature is invalid", async () => {
    const req = new Request("http://localhost/api/webhook/line", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": "invalid-signature-value",
      },
      body: validBody,
    });
    const res = await app.handle(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 when x-line-signature is valid (confirms request.text() works -- resolves RESEARCH Q1)", async () => {
    const signature = makeSignature(validBody, TEST_SECRET);
    const req = new Request("http://localhost/api/webhook/line", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": signature,
      },
      body: validBody,
    });
    const res = await app.handle(req);
    expect(res.status).toBe(200);
  });
});
