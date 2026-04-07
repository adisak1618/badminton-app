import { Elysia, t } from "elysia";
import { db, events, clubs, members } from "@repo/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireClubRole } from "../lib/require-club-role";
import { notFound, unprocessableEntity } from "../lib/errors";
import { lineClient } from "../lib/line-client";
import { buildEventFlexCard, generateEventTitle } from "../lib/flex-messages";
import { env } from "../env";

export const eventRoutes = new Elysia({ prefix: "/events" })
  .use(authMiddleware)
  // GET /events/club-defaults?clubId=:id — returns club defaults for pre-fill (EVNT-02)
  .get(
    "/club-defaults",
    async ({ query, session }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));
      if (!member) throw notFound("Member");
      await requireClubRole(query.clubId, member.id, ["owner", "admin"]);

      const [club] = await db
        .select({
          venueName: clubs.homeCourtLocation,
          defaultShuttlecockFee: clubs.defaultShuttlecockFee,
          defaultCourtFee: clubs.defaultCourtFee,
          defaultMaxPlayers: clubs.defaultMaxPlayers,
        })
        .from(clubs)
        .where(eq(clubs.id, query.clubId));
      if (!club) throw notFound("Club");
      return club;
    },
    { query: t.Object({ clubId: t.String({ format: "uuid" }) }) }
  )
  // POST /events — create event + push Flex Message to LINE group (EVNT-01, BOT-01)
  .post(
    "/",
    async ({ body, session, set }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));
      if (!member) throw notFound("Member");
      await requireClubRole(body.clubId, member.id, ["owner", "admin"]);

      // Look up club for lineGroupId
      const [club] = await db
        .select()
        .from(clubs)
        .where(eq(clubs.id, body.clubId));
      if (!club) throw notFound("Club");
      if (!club.lineGroupId) {
        throw unprocessableEntity(
          "กลุ่ม LINE ยังไม่ได้เชื่อมกับสโมสร กรุณาเชื่อมก่อนสร้างอีเวนท์"
        );
      }

      // Parse event date
      const eventDate = new Date(body.eventDate);

      // Auto-generate title if not provided (D-07)
      const title =
        body.title?.trim() || generateEventTitle(eventDate, body.venueName);

      // Insert event with status=open (D-12 — no draft workflow)
      const [created] = await db
        .insert(events)
        .values({
          clubId: body.clubId,
          title,
          eventDate,
          venueName: body.venueName,
          venueMapsUrl: body.venueMapsUrl ?? null,
          shuttlecockFee: body.shuttlecockFee,
          courtFee: body.courtFee,
          maxPlayers: body.maxPlayers,
          status: "open",
        })
        .returning();

      // Build LIFF URLs for card buttons
      const liffBase = `https://liff.line.me/${env.LIFF_ID}`;
      const registerLiffUrl = `${liffBase}/liff/events/${created.id}/register`;
      const detailsLiffUrl = `${liffBase}/liff/events/${created.id}`;

      // Build and push Flex Message card (BOT-01)
      const flexCard = buildEventFlexCard({
        title: created.title,
        eventDate: created.eventDate,
        venueName: created.venueName ?? body.venueName,
        venueMapsUrl: created.venueMapsUrl,
        shuttlecockFee: created.shuttlecockFee,
        courtFee: created.courtFee,
        maxPlayers: created.maxPlayers,
        registeredCount: 0,
        registerLiffUrl,
        detailsLiffUrl,
      });

      // Push to LINE group — D-13: posted once, store lineMessageId
      let lineMessageId: string | null = null;
      try {
        const pushResponse = await lineClient.pushMessage({
          to: club.lineGroupId!,
          messages: [flexCard],
        });
        lineMessageId = pushResponse.sentMessages[0]?.id ?? null;
        if (!lineMessageId) {
          console.warn(
            "pushMessage succeeded but returned no sentMessages[0].id"
          );
        }
      } catch (err) {
        // Log but don't rollback — event is saved, card just wasn't posted (Pitfall 3)
        console.error(
          "Failed to push Flex Message to group:",
          (err as Error).message
        );
      }

      // Update event with lineMessageId (D-13)
      if (lineMessageId) {
        await db
          .update(events)
          .set({ lineMessageId })
          .where(eq(events.id, created.id));
      }

      set.status = 201;
      return {
        id: created.id,
        title: created.title,
        eventDate: created.eventDate,
        venueName: created.venueName,
        status: created.status,
        lineMessageId,
      };
    },
    {
      body: t.Object({
        clubId: t.String({ format: "uuid" }),
        title: t.Optional(t.String({ maxLength: 255 })),
        eventDate: t.String(), // ISO 8601 with timezone offset
        venueName: t.String({ minLength: 1, maxLength: 500 }),
        venueMapsUrl: t.Optional(t.String({ maxLength: 500 })),
        shuttlecockFee: t.Integer({ minimum: 0 }),
        courtFee: t.Integer({ minimum: 0 }),
        maxPlayers: t.Integer({ minimum: 1 }),
      }),
    }
  );
