import { Elysia } from "elysia";
import { openapi } from '@elysiajs/openapi'
import { errorHandler } from "./lib/error-handler";
import { authMiddleware } from "./middleware/auth";
import { lineWebhook } from "./webhook/line";
import { clubRoutes } from "./routes/clubs";
import { clubMemberRoutes } from "./routes/club-members";
import { clubLinkRoutes } from "./routes/club-link";
import { liffProfileRoutes } from "./routes/liff-profile";
import { eventRoutes } from "./routes/events";

const app = new Elysia()
  .use(openapi())
  .use(errorHandler)
  .get("/health", () => ({ status: "ok" }))
  .group("/api", (app) =>
    app
      .use(lineWebhook)
      .use(authMiddleware)
      .use(clubRoutes)
      .use(clubMemberRoutes)
      .use(clubLinkRoutes)
      .use(liffProfileRoutes)
      .use(eventRoutes)
  )
  .listen(process.env.PORT ?? 3000);

export type App = typeof app;
