import { describe, it, expect, beforeAll } from "bun:test";
import { createHmac } from "crypto";

// Set test env vars BEFORE importing the app (env.ts validates at import time)
// These are set first so they win even if another test file ran first in the same worker.
const TEST_SECRET = "test-channel-secret-for-unit-tests";
process.env.LINE_CHANNEL_SECRET = TEST_SECRET;
process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret-at-least-32-characters-long!!";
process.env.WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:3000";

// Dynamic import after env is set
let app: any;
let effectiveSecret: string;

beforeAll(async () => {
  const mod = await import("../index");
  app = mod.default;
  // Import the cached env module to get the LINE_CHANNEL_SECRET that the app actually uses.
  // This handles the case where env.ts was already loaded (module cache) with a different secret.
  const { env } = await import("../env");
  effectiveSecret = env.LINE_CHANNEL_SECRET;
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
    const signature = makeSignature(validBody, effectiveSecret);
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
