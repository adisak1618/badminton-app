import { Elysia } from "elysia";

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }));

export default app;
