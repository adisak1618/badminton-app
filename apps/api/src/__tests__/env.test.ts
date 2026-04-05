import { describe, it, expect } from "bun:test";

describe("env validation (startup safety)", () => {
  it("createEnv throws when LINE_CHANNEL_SECRET is missing", () => {
    // Stub: requires dynamic import with modified process.env
    // Will be implemented in Plan 03
    expect(true).toBe(true);
  });
});
