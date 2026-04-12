import { db, events, clubs } from "@repo/db";
import { eq, count } from "drizzle-orm";
import { lineClient } from "./line-client";
import { buildRepostFlexCard, buildRepostAltText } from "./flex-messages";
import { env } from "../env";
import { messagingApi } from "@line/bot-sdk";

export async function buildFlexCardData(opts: {
  event: typeof events.$inferSelect;
  clubId: string;
  action: "register" | "cancel" | "admin_remove" | "close" | "reopen";
  memberName?: string;
  registeredCount: number;
}): Promise<{ card: messagingApi.FlexMessage; altText: string; club: { lineGroupId: string } } | null> {
  const { event, clubId, action, memberName, registeredCount } = opts;

  // Fetch club for lineGroupId
  const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId));
  if (!club?.lineGroupId) return null;

  // Build LIFF URLs
  const liffBase = `https://liff.line.me/${env.LIFF_ID}`;
  const registerLiffUrl = `${liffBase}/events/${event.id}`;
  const detailsLiffUrl = `${liffBase}/events/${event.id}`;

  // Build alt text and card
  const altText = buildRepostAltText({
    action,
    memberName,
    registeredCount,
    maxPlayers: event.maxPlayers,
  });

  const remaining = event.maxPlayers - registeredCount;
  const remainingText = remaining === 0 ? "เต็มแล้ว" : `เหลือ ${remaining} ที่`;

  let notificationBodyText: string;
  switch (action) {
    case "register":
      notificationBodyText = remaining === 0
        ? `${memberName} ลงทะเบียนแล้ว (เต็มแล้ว)`
        : `${memberName} ลงทะเบียนแล้ว (${remainingText})`;
      break;
    case "cancel":
      notificationBodyText = `${memberName} ยกเลิกแล้ว (${remainingText})`;
      break;
    case "admin_remove":
      notificationBodyText = `อัปเดตรายชื่อ (${remainingText})`;
      break;
    case "close":
      notificationBodyText = `ปิดรับลงทะเบียนแล้ว`;
      break;
    case "reopen":
      notificationBodyText = `เปิดรับลงทะเบียน (${remainingText})`;
      break;
  }

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
    notificationBodyText,
    isFull: registeredCount >= event.maxPlayers,
    isClosed: event.status === "closed",
  }) as messagingApi.FlexMessage;

  return { card, altText, club: { lineGroupId: club.lineGroupId } };
}

export async function repostFlexCard(opts: {
  event: typeof events.$inferSelect;
  clubId: string;
  action: "register" | "cancel" | "admin_remove" | "close" | "reopen";
  memberName?: string;
  registeredCount: number;
}): Promise<void> {
  const cardData = await buildFlexCardData(opts);
  if (!cardData) return;

  const { card, altText, club } = cardData;

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
        .where(eq(events.id, opts.event.id));
    }
  } catch (err) {
    console.error("Failed to repost Flex Message:", (err as Error).message);
  }
}
