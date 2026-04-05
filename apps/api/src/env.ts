import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    LINE_CHANNEL_SECRET: z.string().min(1),
    LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
    DATABASE_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
