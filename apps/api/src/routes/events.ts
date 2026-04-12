import { Elysia, t } from "elysia";
import { db, events, clubs, members, registrations } from "@repo/db";
import { eq, count } from "drizzle-orm";
import { repostFlexCard } from "../lib/repost-card";
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
      if (!session.lineUserId) {
        throw new Error("Session missing lineUserId");
      }
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId));
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
    async ({ body, session, set, request }) => {
      if (!session.lineUserId) {
        throw new Error("Session missing lineUserId");
      }
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId));
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
      if (isNaN(eventDate.getTime())) {
        throw unprocessableEntity("Invalid eventDate");
      }

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
      const registerLiffUrl = `${liffBase}/events/${created.id}`;
      const detailsLiffUrl = `${liffBase}/events/${created.id}`;

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

      const liffContext = request.headers.get("x-liff-context");

      // Push to LINE group — D-13: posted once, store lineMessageId
      // Skip push if admin is creating event from inside LINE (client will sendMessages)
      let lineMessageId: string | null = null;
      let responseFlexCard = null;
      if (!liffContext || liffContext === "external") {
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
      } else {
        // In-LINE: return card for client-side sendMessages (D-06)
        responseFlexCard = flexCard;
        // lineMessageId stays null — card sent via sendMessages has no trackable ID
      }

      set.status = 201;
      return {
        id: created.id,
        title: created.title,
        eventDate: created.eventDate,
        venueName: created.venueName,
        status: created.status,
        lineMessageId,
        flexCard: responseFlexCard,
      };
    },
    {
      body: t.Object({
        clubId: t.String({ format: "uuid" }),
        title: t.Optional(t.String({ maxLength: 255 })),
        eventDate: t.String({ format: "date-time" }), // ISO 8601 with timezone offset
        venueName: t.String({ minLength: 1, maxLength: 255 }),
        venueMapsUrl: t.Optional(t.String({ format: "uri", maxLength: 500 })),
        shuttlecockFee: t.Integer({ minimum: 0 }),
        courtFee: t.Integer({ minimum: 0 }),
        maxPlayers: t.Integer({ minimum: 1 }),
      }),
    }
  )
  // PATCH /events/:id/status — close or reopen event (REG-04, D-11, D-13)
  .patch(
    "/:id/status",
    async ({ params, body, session }) => {
      if (!session.lineUserId) {
        throw new Error("Session missing lineUserId");
      }
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId));
      if (!member) throw notFound("Member");

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, params.id));
      if (!event) throw notFound("Event");

      await requireClubRole(event.clubId, member.id, ["owner", "admin"]);

      await db
        .update(events)
        .set({ status: body.status })
        .where(eq(events.id, params.id));

      // Re-fetch updated event for repost
      const [updatedEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, params.id));

      const [{ value: registeredCount }] = await db
        .select({ value: count() })
        .from(registrations)
        .where(eq(registrations.eventId, params.id));

      await repostFlexCard({
        event: updatedEvent,
        clubId: event.clubId,
        action: body.status === "closed" ? "close" : "reopen",
        registeredCount: Number(registeredCount),
      });

      return { status: body.status, registeredCount: Number(registeredCount) };
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        status: t.Union([t.Literal("open"), t.Literal("closed")]),
      }),
    }
  );
