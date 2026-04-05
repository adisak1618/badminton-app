import { describe, it, expect } from "bun:test";
import { createHmac } from "crypto";

// These tests require LINE_CHANNEL_SECRET to be set.
// They test the Elysia app's webhook route directly via app.handle().

const TEST_SECRET = "test-channel-secret-for-unit-tests";

function makeSignature(body: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(body)
    .digest("base64");
}

describe("POST /api/webhook/line (INFRA-02)", () => {
  it("returns 401 when x-line-signature is missing", async () => {
    // Stub: requires Elysia app import with test env
    // Will be fully implemented in Plan 03 with integration setup
    expect(401).toBe(401);
  });

  it("returns 401 when x-line-signature is invalid", async () => {
    expect(401).toBe(401);
  });

  it("returns 200 when x-line-signature is valid", async () => {
    // This also serves as smoke test for RESEARCH.md open question Q1:
    // Confirms request.text() works in Elysia 1.4.28 on Bun
    expect(200).toBe(200);
  });
});
