import { Elysia, t } from "elysia";
import { db, eventTemplates, events, clubs, members, registrations } from "@repo/db";
import { eq, and, inArray, count } from "drizzle-orm";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { authMiddleware } from "../middleware/auth";
import { requireClubRole } from "../lib/require-club-role";
import { notFound, unprocessableEntity } from "../lib/errors";
import { lineClient } from "../lib/line-client";
import { buildEventFlexCard, buildCancellationFlexCard, generateEventTitle } from "../lib/flex-messages";
import { env } from "../env";

const BANGKOK_TZ = "Asia/Bangkok";

/**
 * Calculate the next occurrence date for a given day of week and time string in Bangkok timezone.
 * dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
 * timeStr: "HH:MM"
 */
function nextOccurrence(dayOfWeek: number, timeStr: string): Date {
  const now = toZonedTime(new Date(), BANGKOK_TZ);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Start from today
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);

  // Advance until we hit the right day of week and the time is in the future
  let daysAhead = (dayOfWeek - now.getDay() + 7) % 7;
  if (daysAhead === 0 && candidate <= now) {
    daysAhead = 7;
  }
  candidate.setDate(candidate.getDate() + daysAhead);

  return fromZonedTime(candidate, BANGKOK_TZ);
}

export const eventTemplateRoutes = new Elysia({ prefix: "/event-templates" })
  .use(authMiddleware)

  // GET /event-templates?clubId=:id — list templates for a club
  .get(
    "/",
    async ({ query, session }) => {
      if (!session.lineUserId) throw new Error("Session missing lineUserId");
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId));
      if (!member) throw notFound("Member");
      await requireClubRole(query.clubId, member.id, ["owner", "admin"]);

      const templates = await db
        .select()
        .from(eventTemplates)
        .where(eq(eventTemplates.clubId, query.clubId));

      return templates;
    },
    { query: t.Object({ clubId: t.String({ format: "uuid" }) }) }
  )

  // POST /event-templates — create template
  .post(
    "/",
    async ({ body, session, set }) => {
      if (!session.lineUserId) throw new Error("Session missing lineUserId");
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId));
      if (!member) throw notFound("Member");
      await requireClubRole(body.clubId, member.id, ["owner", "admin"]);

      const [template] = await db
        .insert(eventTemplates)
        .values({
          clubId: body.clubId,
          title: body.title ?? null,
          venueName: body.venueName,
          venueMapsUrl: body.venueMapsUrl ?? null,
          shuttlecockFee: body.shuttlecockFee,
          courtFee: body.courtFee,
          maxPlayers: body.maxPlayers,
          eventDayOfWeek: body.eventDayOfWeek,
          eventTime: body.eventTime,
          openDayOfWeek: body.openDayOfWeek,
          openTime: body.openTime,
          status: "active",
        })
        .returning();

      set.status = 201;
      return template;
    },
    {
      body: t.Object({
        clubId: t.String({ format: "uuid" }),
        venueName: t.String({ minLength: 1, maxLength: 255 }),
        venueMapsUrl: t.Optional(t.String({ maxLength: 500 })),
        shuttlecockFee: t.Integer({ minimum: 0 }),
        courtFee: t.Integer({ minimum: 0 }),
        maxPlayers: t.Integer({ minimum: 1 }),
        title: t.Optional(t.String({ maxLength: 255 })),
        eventDayOfWeek: t.Integer({ minimum: 0, maximum: 6 }),
        eventTime: t.String({ minLength: 5, maxLength: 5 }),
        openDayOfWeek: t.Integer({ minimum: 0, maximum: 6 }),
        openTime: t.String({ minLength: 5, maxLength: 5 }),
      }),
    }
  )

  // PATCH /event-templates/:id — update template
  .patch(
    "/:id",
    async ({ params, body, session }) => {
      if (!session.lineUserId) throw new Error("Session missing lineUserId");
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId));
      if (!member) throw notFound("Member");

      const [template] = await db
        .select()
        .from(eventTemplates)
        .where(eq(eventTemplates.id, params.id));
      if (!template) throw notFound("Template");

      await requireClubRole(template.clubId, member.id, ["owner", "admin"]);

      // D-09: Validate maxPlayers against active occurrence registrations
      if (body.maxPlayers !== undefined) {
        const activeEvents = await db
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.templateId, params.id),
              inArray(events.status, ["draft", "open"])
            )
          );

        if (activeEvents.length > 0) {
          const activeEventIds = activeEvents.map((e) => e.id);
          for (const eventId of activeEventIds) {
            const [{ value: regCount }] = await db
              .select({ value: count() })
              .from(registrations)
              .where(eq(registrations.eventId, eventId));
            if (Number(regCount) > body.maxPlayers) {
              throw unprocessableEntity(
                "จำนวนผู้เล่นสูงสุดน้อยกว่าผู้ที่ลงทะเบียนอยู่แล้ว"
              );
            }
          }
        }
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (body.venueName !== undefined) updateData.venueName = body.venueName;
      if (body.venueMapsUrl !== undefined) updateData.venueMapsUrl = body.venueMapsUrl;
      if (body.shuttlecockFee !== undefined) updateData.shuttlecockFee = body.shuttlecockFee;
      if (body.courtFee !== undefined) updateData.courtFee = body.courtFee;
      if (body.maxPlayers !== undefined) updateData.maxPlayers = body.maxPlayers;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.eventDayOfWeek !== undefined) updateData.eventDayOfWeek = body.eventDayOfWeek;
      if (body.eventTime !== undefined) updateData.eventTime = body.eventTime;
      if (body.openDayOfWeek !== undefined) updateData.openDayOfWeek = body.openDayOfWeek;
      if (body.openTime !== undefined) updateData.openTime = body.openTime;
      if (body.status !== undefined) updateData.status = body.status;

      const [updated] = await db
        .update(eventTemplates)
        .set(updateData as any)
        .where(eq(eventTemplates.id, params.id))
        .returning();

      return updated;
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        venueName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        venueMapsUrl: t.Optional(t.String({ maxLength: 500 })),
        shuttlecockFee: t.Optional(t.Integer({ minimum: 0 })),
        courtFee: t.Optional(t.Integer({ minimum: 0 })),
        maxPlayers: t.Optional(t.Integer({ minimum: 1 })),
        title: t.Optional(t.String({ maxLength: 255 })),
        eventDayOfWeek: t.Optional(t.Integer({ minimum: 0, maximum: 6 })),
        eventTime: t.Optional(t.String({ minLength: 5, maxLength: 5 })),
        openDayOfWeek: t.Optional(t.Integer({ minimum: 0, maximum: 6 })),
        openTime: t.Optional(t.String({ minLength: 5, maxLength: 5 })),
        status: t.Optional(t.Union([t.Literal("active"), t.Literal("paused"), t.Literal("archived")])),
      }),
    }
  )

  // POST /event-templates/:id/create-now — D-04 manual occurrence creation
  .post(
    "/:id/create-now",
    async ({ params, session, set, request }) => {
      if (!session.lineUserId) throw new Error("Session missing lineUserId");
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId));
      if (!member) throw notFound("Member");

      const [template] = await db
        .select()
        .from(eventTemplates)
        .where(eq(eventTemplates.id, params.id));
      if (!template) throw notFound("Template");

      await requireClubRole(template.clubId, member.id, ["owner", "admin"]);

      const [club] = await db
        .select()
        .from(clubs)
        .where(eq(clubs.id, template.clubId));
      if (!club) throw notFound("Club");
      if (!club.lineGroupId) {
        throw unprocessableEntity(
          "กลุ่ม LINE ยังไม่ได้เชื่อมกับสโมสร กรุณาเชื่อมก่อนสร้างอีเวนท์"
        );
      }

      const eventDate = nextOccurrence(template.eventDayOfWeek, template.eventTime);
      const title = template.title ?? generateEventTitle(eventDate, template.venueName);

      const [created] = await db
        .insert(events)
        .values({
          clubId: template.clubId,
          templateId: template.id,
          title,
          eventDate,
          venueName: template.venueName,
          venueMapsUrl: template.venueMapsUrl,
          shuttlecockFee: template.shuttlecockFee,
          courtFee: template.courtFee,
          maxPlayers: template.maxPlayers,
          status: "open",
        })
        .returning();

      const liffBase = `https://liff.line.me/${env.LIFF_ID}`;
      const registerLiffUrl = `${liffBase}/events/${created.id}`;
      const detailsLiffUrl = `${liffBase}/events/${created.id}`;

      const flexCard = buildEventFlexCard({
        title: created.title,
        eventDate: created.eventDate,
        venueName: created.venueName ?? template.venueName,
        venueMapsUrl: created.venueMapsUrl,
        shuttlecockFee: created.shuttlecockFee,
        courtFee: created.courtFee,
        maxPlayers: created.maxPlayers,
        registeredCount: 0,
        registerLiffUrl,
        detailsLiffUrl,
      });

      const liffContext = request.headers.get("x-liff-context");

      let lineMessageId: string | null = null;
      let responseFlexCard = null;
      if (!liffContext || liffContext === "external") {
        try {
          const pushResponse = await lineClient.pushMessage({
            to: club.lineGroupId!,
            messages: [flexCard],
          });
          lineMessageId = pushResponse.sentMessages[0]?.id ?? null;
        } catch (err) {
          console.error("Failed to push Flex Message:", (err as Error).message);
        }

        if (lineMessageId) {
          await db.update(events).set({ lineMessageId }).where(eq(events.id, created.id));
        }
      } else {
        // In-LINE: return card for client-side sendMessages
        responseFlexCard = flexCard;
      }

      set.status = 201;
      return {
        id: created.id,
        title: created.title,
        eventDate: created.eventDate,
        templateId: created.templateId,
        status: created.status,
        lineMessageId,
        flexCard: responseFlexCard,
      };
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
    }
  )

  // PATCH /event-templates/:id/occurrences/:eventId/cancel — D-12
  .patch(
    "/:id/occurrences/:eventId/cancel",
    async ({ params, session, request }) => {
      if (!session.lineUserId) throw new Error("Session missing lineUserId");
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId));
      if (!member) throw notFound("Member");

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, params.eventId));
      if (!event) throw notFound("Event");

      // T-6-02: validate clubId matches template's club
      const [template] = await db
        .select()
        .from(eventTemplates)
        .where(eq(eventTemplates.id, params.id));
      if (!template) throw notFound("Template");
      if (event.templateId !== params.id) throw notFound("Event");
      if (event.clubId !== template.clubId) throw notFound("Event");

      await requireClubRole(event.clubId, member.id, ["owner", "admin"]);

      await db
        .update(events)
        .set({ status: "cancelled" })
        .where(eq(events.id, params.eventId));

      const [club] = await db
        .select()
        .from(clubs)
        .where(eq(clubs.id, event.clubId));

      const liffContext = request.headers.get("x-liff-context");
      let responseCancellationCard = null;

      if (club?.lineGroupId) {
        const cancellationCard = buildCancellationFlexCard({
          title: event.title,
          eventDate: event.eventDate,
          venueName: event.venueName ?? template.venueName,
        });
        if (!liffContext || liffContext === "external") {
          try {
            await lineClient.pushMessage({
              to: club.lineGroupId,
              messages: [cancellationCard],
            });
          } catch (err) {
            console.error("Failed to push cancellation Flex Message:", (err as Error).message);
          }
        } else {
          // In-LINE: return card for client-side sendMessages
          responseCancellationCard = cancellationCard;
        }
      }

      return { status: "cancelled", eventId: params.eventId, flexCard: responseCancellationCard };
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
        eventId: t.String({ format: "uuid" }),
      }),
    }
  );
