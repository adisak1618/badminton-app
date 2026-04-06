import { Elysia } from "elysia";
import { errorHandler } from "./lib/error-handler";
// import { authMiddleware } from "./middleware/auth";
// import { lineWebhook } from "./webhook/line";
// import { clubRoutes } from "./routes/clubs";
// import { clubMemberRoutes } from "./routes/club-members";
// import { clubLinkRoutes } from "./routes/club-link";

const app = new Elysia()
  .use(errorHandler)
  .get("/health", () => ({ status: "ok" }))
  // .group("/api", (app) =>
  //   app
  //     .use(lineWebhook)
  //     .use(authMiddleware)
  //     .use(clubRoutes)
  //     .use(clubMemberRoutes)
  //     .use(clubLinkRoutes)
  // );

// Must use default export — NOT app.listen() — for Vercel
export default app;
