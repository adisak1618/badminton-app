import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    LINE_LOGIN_CHANNEL_ID: z.string().min(1),
    LINE_LOGIN_CHANNEL_SECRET: z.string().min(1),
    LINE_LOGIN_CALLBACK_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
    API_BASE_URL: z.string().url(),
    APP_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_LIFF_ID: z.string().min(1),
  },
  experimental__runtimeEnv: {
    ...process.env,
    NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID,
  },
});
