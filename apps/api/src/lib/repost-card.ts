import { db, events, clubs } from "@repo/db";
import { eq, count } from "drizzle-orm";
import { lineClient } from "./line-client";
import { buildRepostFlexCard, buildRepostAltText } from "./flex-messages";
import { env } from "../env";

export async function repostFlexCard(opts: {
  event: typeof events.$inferSelect;
  clubId: string;
  action: "register" | "cancel" | "admin_remove" | "close" | "reopen";
  memberName?: string;
  registeredCount: number;
}): Promise<void> {
  const { event, clubId, action, memberName, registeredCount } = opts;

  // Fetch club for lineGroupId
  const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId));
  if (!club?.lineGroupId) return;

  // Build LIFF URLs
  const liffBase = `https://liff.line.me/${env.LIFF_ID}`;
  const registerLiffUrl = `${liffBase}/events/${event.id}/register`;
  const detailsLiffUrl = `${liffBase}/events/${event.id}`;

  // Build alt text and card
  const altText = buildRepostAltText({
    action,
    memberName,
    registeredCount,
    maxPlayers: event.maxPlayers,
  });

  const card = buildRepostFlexCard({
    title: event.title,
    eventDate: event.eventDate,
    venueName: event.venueName ?? "",
    venueMapsUrl: event.venueMapsUrl ?? null,
    shuttlecockFee: event.shuttlecockFee,
    courtFee: event.courtFee,
    maxPlayers: event.maxPlayers,
    registeredCount,
    registerLiffUrl,
    detailsLiffUrl,
    notificationAltText: altText,
    isFull: registeredCount >= event.maxPlayers,
    isClosed: event.status === "closed",
  });

  // Best-effort push — never throw (D-09)
  try {
    const pushResponse = await lineClient.pushMessage({
      to: club.lineGroupId,
      messages: [card],
    });
    const newLineMessageId = pushResponse.sentMessages[0]?.id ?? null;
    if (newLineMessageId) {
      await db
        .update(events)
        .set({ lineMessageId: newLineMessageId })
        .where(eq(events.id, event.id));
    }
  } catch (err) {
    console.error("Failed to repost Flex Message:", (err as Error).message);
  }
}
