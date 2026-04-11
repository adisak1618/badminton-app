import { Elysia } from "elysia";
import { timingSafeEqual } from "crypto";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { db, eventTemplates, events, clubs } from "@repo/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { buildEventFlexCard, generateEventTitle } from "../lib/flex-messages";
import { lineClient } from "../lib/line-client";
import { env } from "../env";

const BANGKOK_TZ = "Asia/Bangkok";

function isWindowOpenOrMissed(tpl: typeof eventTemplates.$inferSelect, nowBangkok: Date): boolean {
  const currentDow = nowBangkok.getDay();
  const currentHour = nowBangkok.getHours();
  const [openHour] = tpl.openTime.split(":").map(Number);
  const [eventHour] = tpl.eventTime.split(":").map(Number);

  // Calculate hours since week start (Sunday 00:00) for both now and open window
  const nowHoursSinceWeekStart = currentDow * 24 + currentHour;
  const openHoursSinceWeekStart = tpl.openDayOfWeek * 24 + openHour;
  const eventHoursSinceWeekStart = tpl.eventDayOfWeek * 24 + eventHour;

  // Window is open if: we are past open time AND before event time (this week)
  return nowHoursSinceWeekStart >= openHoursSinceWeekStart && nowHoursSinceWeekStart < eventHoursSinceWeekStart;
}

function calcNextEventDate(tpl: typeof eventTemplates.$inferSelect, nowBangkok: Date): Date {
  const currentDow = nowBangkok.getDay();
  let daysUntilEvent = (tpl.eventDayOfWeek - currentDow + 7) % 7;
  if (daysUntilEvent === 0) {
    // Same day — check if event time has passed
    const [eventHour] = tpl.eventTime.split(":").map(Number);
    if (nowBangkok.getHours() >= eventHour) daysUntilEvent = 7;
  }
  const [eventHour, eventMin] = tpl.eventTime.split(":").map(Number);
  const eventDateBangkok = new Date(nowBangkok);
  eventDateBangkok.setDate(nowBangkok.getDate() + daysUntilEvent);
  eventDateBangkok.setHours(eventHour, eventMin, 0, 0);
  return fromZonedTime(eventDateBangkok, BANGKOK_TZ); // UTC
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const cronRoutes = new Elysia({ prefix: "/cron" })
  .post("/generate-occurrences", async ({ headers, set }) => {
    // Bearer token auth — per D-01 cron security (T-6-01)
    const expected = `Bearer ${env.CRON_SECRET}`;
    const actual = headers["authorization"] ?? "";
    const enc = new TextEncoder();
    const expectedBuf = enc.encode(expected.padEnd(64));
    const actualBuf = enc.encode(actual.padEnd(64));
    if (expectedBuf.byteLength !== actualBuf.byteLength || !timingSafeEqual(expectedBuf, actualBuf)) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const nowUtc = new Date();
    const nowBangkok = toZonedTime(nowUtc, BANGKOK_TZ);

    // Fetch all active templates
    const templates = await db.select().from(eventTemplates).where(eq(eventTemplates.status, "active"));

    const results = [];

    for (const tpl of templates) {
      // Check if window is open or was missed (catch-up per D-03)
      if (!isWindowOpenOrMissed(tpl, nowBangkok)) continue;

      // Calculate next event date in UTC
      const eventDateUtc = calcNextEventDate(tpl, nowBangkok);

      // Idempotency guard (T-6-04): check no event exists for this template in the target week
      const weekStart = getWeekStart(eventDateUtc);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const existing = await db.select({ id: events.id }).from(events)
        .where(and(
          eq(events.templateId, tpl.id),
          gte(events.eventDate, weekStart),
          lt(events.eventDate, weekEnd),
        ));
      if (existing.length > 0) continue; // already generated

      // Generate the title — correct arg order: (eventDate, venueName)
      const title = tpl.title || generateEventTitle(eventDateUtc, tpl.venueName);

      // Insert event record per D-11 (copy data, set templateId)
      const [newEvent] = await db.insert(events).values({
        clubId: tpl.clubId,
        title,
        eventDate: eventDateUtc,
        venueName: tpl.venueName,
        venueMapsUrl: tpl.venueMapsUrl,
        shuttlecockFee: tpl.shuttlecockFee,
        courtFee: tpl.courtFee,
        maxPlayers: tpl.maxPlayers,
        templateId: tpl.id,
        status: "open",
      }).returning();

      // Post Flex Message to LINE group per D-14
      const [club] = await db.select().from(clubs).where(eq(clubs.id, tpl.clubId));
      if (club?.lineGroupId) {
        const liffBase = `https://liff.line.me/${env.LIFF_ID}`;
        const card = buildEventFlexCard({
          title,
          eventDate: eventDateUtc,
          venueName: tpl.venueName,
          venueMapsUrl: tpl.venueMapsUrl,
          shuttlecockFee: tpl.shuttlecockFee,
          courtFee: tpl.courtFee,
          maxPlayers: tpl.maxPlayers,
          registeredCount: 0,
          registerLiffUrl: `${liffBase}/events/${newEvent.id}`,
          detailsLiffUrl: `${liffBase}/events/${newEvent.id}`,
        });
        try {
          const resp = await lineClient.pushMessage({
            to: club.lineGroupId,
            messages: [card],
          });
          // Store message ID for repost pattern
          if (resp.sentMessages?.[0]?.id) {
            await db.update(events).set({ lineMessageId: resp.sentMessages[0].id }).where(eq(events.id, newEvent.id));
          }
        } catch (err) {
          console.error("Failed to push Flex Message:", (err as Error).message);
        }
      }

      results.push({ templateId: tpl.id, eventId: newEvent.id });
    }

    return { generated: results.length, events: results };
  });
