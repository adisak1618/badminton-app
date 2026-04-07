import { webhook } from "@line/bot-sdk";
import { lineClient } from "../../lib/line-client";
import { env } from "../../env";
import { db, clubs, clubMembers, members } from "@repo/db";
import { eq, and } from "drizzle-orm";

const CREATE_COMMANDS = ["/create", "/new", "สร้าง", "สร้างอีเวนท์"];

export async function handleTextMessage(event: webhook.MessageEvent): Promise<void> {
  if (event.message.type !== "text") return;
  const source = event.source;
  if (!source || source.type !== "group") return;

  const text = (event.message as webhook.TextMessageContent).text.trim();
  if (!CREATE_COMMANDS.includes(text)) return;

  const groupId = (source as webhook.GroupSource).groupId;
  const lineUserId = (source as webhook.GroupSource).userId;
  if (!groupId || !lineUserId) return;

  // Single-query role resolution — per RESEARCH.md Pitfall 4
  const [result] = await db
    .select({ role: clubMembers.role, clubId: clubs.id })
    .from(clubs)
    .innerJoin(clubMembers, eq(clubMembers.clubId, clubs.id))
    .innerJoin(members, eq(members.id, clubMembers.memberId))
    .where(
      and(
        eq(clubs.lineGroupId, groupId),
        eq(members.lineUserId, lineUserId),
      )
    );

  // D-03: silently ignore if no club, no member, or insufficient role
  if (!result || !["owner", "admin"].includes(result.role)) return;

  // Build LIFF deep-link URL with clubId
  const liffUrl = `https://liff.line.me/${env.LIFF_ID}?path=/liff/events/create&clubId=${result.clubId}`;

  await lineClient.replyMessage({
    replyToken: event.replyToken!,
    messages: [{ type: "text", text: `สร้างอีเวนท์ใหม่: ${liffUrl}` }],
  });
}
