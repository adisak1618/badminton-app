import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    LINE_CHANNEL_SECRET: z.string().min(1),
    LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
    LINE_LOGIN_CHANNEL_ID: z.string().min(1),
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
    WEB_BASE_URL: z.string().url(),
    LIFF_ID: z.string().min(1),
    CRON_SECRET: z.string().min(32),
  },
  runtimeEnv: process.env,
});
