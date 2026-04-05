import { Elysia } from "elysia";
import { lineWebhook } from "./webhook/line";

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .group("/api", (app) => app.use(lineWebhook));

// Must use default export — NOT app.listen() — for Vercel
export default app;
