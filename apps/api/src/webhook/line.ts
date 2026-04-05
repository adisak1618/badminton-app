import { Elysia } from "elysia";
import { validateSignature } from "@line/bot-sdk";
import type { WebhookRequestBody, WebhookEvent } from "@line/bot-sdk";
import { env } from "../env";
import { processWithIdempotency } from "./handlers/idempotency";

async function handleEvent(event: WebhookEvent): Promise<void> {
  await processWithIdempotency(
    event.webhookEventId ?? `${event.type}-${event.timestamp}`,
    async () => {
      // Event dispatch will be implemented in future phases
      // Phase 2: join event handler
      // Phase 4: message event handler
      console.log(`Processing event: ${event.type}`);
    }
  );
}

export const lineWebhook = new Elysia()
  .post("/webhook/line", async ({ request, set }) => {
    // MUST call request.text() BEFORE any JSON parsing
    // Do NOT declare body schema on this route — it would consume the stream
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") ?? "";

    if (!validateSignature(rawBody, env.LINE_CHANNEL_SECRET, signature)) {
      set.status = 401;
      return "Unauthorized";
    }

    const payload = JSON.parse(rawBody) as WebhookRequestBody;

    // Return 200 immediately — process events asynchronously
    // Line retries if response is delayed
    void Promise.all(
      (payload.events ?? []).map((event) => handleEvent(event))
    );

    return "OK";
  });
