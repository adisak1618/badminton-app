import { Elysia } from "elysia";
import { validateSignature, webhook } from "@line/bot-sdk";
import { env } from "../env";
import { processWithIdempotency } from "./handlers/idempotency";
import { handleJoinEvent } from "./handlers/join";
import { handleTextMessage } from "./handlers/text-message";

async function handleEvent(event: webhook.Event): Promise<void> {
  await processWithIdempotency(
    event.webhookEventId,
    async () => {
      switch (event.type) {
        case "join":
          await handleJoinEvent(event as webhook.JoinEvent);
          break;
        case "message":
          await handleTextMessage(event as webhook.MessageEvent);
          break;
        case "leave":
        case "follow":
        case "unfollow":
          // No action needed
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
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

    const payload = JSON.parse(rawBody) as webhook.CallbackRequest;
    console.log("payload", payload);

    // Return 200 immediately — process events asynchronously
    // Line retries if response is delayed
    void Promise.all(
      (payload.events ?? []).map((event) => handleEvent(event))
    );

    return "OK";
  });
