import { describe, it, expect } from "bun:test";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

describe("env validation (startup safety)", () => {
  it("throws when LINE_CHANNEL_SECRET is missing", () => {
    expect(() => {
      createEnv({
        server: {
          LINE_CHANNEL_SECRET: z.string().min(1),
          LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
          DATABASE_URL: z.string().url(),
        },
        runtimeEnv: {
          LINE_CHANNEL_SECRET: "",
          LINE_CHANNEL_ACCESS_TOKEN: "test",
          DATABASE_URL: "postgresql://test:test@localhost/test",
        },
      });
    }).toThrow();
  });

  it("succeeds when all env vars are provided", () => {
    const env = createEnv({
      server: {
        LINE_CHANNEL_SECRET: z.string().min(1),
        LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
        DATABASE_URL: z.string().url(),
      },
      runtimeEnv: {
        LINE_CHANNEL_SECRET: "valid-secret",
        LINE_CHANNEL_ACCESS_TOKEN: "valid-token",
        DATABASE_URL: "postgresql://test:test@localhost/test",
      },
    });
    expect(env.LINE_CHANNEL_SECRET).toBe("valid-secret");
  });
});
