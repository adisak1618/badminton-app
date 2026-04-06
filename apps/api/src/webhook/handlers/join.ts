import { webhook, messagingApi } from "@line/bot-sdk";
import { lineClient } from "../../lib/line-client";
import { env } from "../../env";

export async function handleJoinEvent(
  event: webhook.JoinEvent
): Promise<void> {
  const groupId = event.source?.groupId;
  if (!groupId) return;

  const setupUrl = `${env.WEB_BASE_URL}/clubs/link?groupId=${groupId}`;

  const flexMessage: messagingApi.FlexMessage = {
    type: "flex",
    altText: "Link this group to your club",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "Hello! I'm your badminton club bot.",
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: "Link this LINE group to your club on the website to start managing events and registrations.",
            wrap: true,
            margin: "md",
            size: "sm",
            color: "#666666",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "uri",
              label: "Link to Club",
              uri: setupUrl,
            },
          },
        ],
      },
    },
  };

  // Use replyMessage (free) — replyToken is available on join events
  if (event.replyToken) {
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [flexMessage],
    });
  }
}
