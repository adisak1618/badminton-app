import { Elysia, t } from "elysia";
import { db, events, members, registrations } from "@repo/db";
import { eq, count, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireClubRole } from "../lib/require-club-role";
import { notFound, ApiError } from "../lib/errors";
import { buildFlexCardData } from "../lib/repost-card";
import { lineClient } from "../lib/line-client";

async function pushCardToGroup(
  cardData: NonNullable<Awaited<ReturnType<typeof buildFlexCardData>>>,
  eventId: string
): Promise<void> {
  try {
    const pushResponse = await lineClient.pushMessage({
      to: cardData.club.lineGroupId,
      messages: [cardData.card],
    });
    const newLineMessageId = pushResponse.sentMessages[0]?.id ?? null;
    if (newLineMessageId) {
      await db
        .update(events)
        .set({ lineMessageId: newLineMessageId })
        .where(eq(events.id, eventId));
    }
  } catch (err) {
    console.error("Failed to repost Flex Message:", (err as Error).message);
  }
}

export const registrationRoutes = new Elysia({ prefix: "/registrations" })
  .use(authMiddleware)

  // GET /registrations?eventId — fetch event + registration list (REG-02)
  .get(
    "/",
    async ({ query, session }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));
      if (!member) throw notFound("Member");

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, query.eventId));
      if (!event) throw notFound("Event");

      // Fetch registrations joined with member displayName
      const regList = await db
        .select({
          id: registrations.id,
          memberId: registrations.memberId,
          displayName: members.displayName,
        })
        .from(registrations)
        .innerJoin(members, eq(registrations.memberId, members.id))
        .where(eq(registrations.eventId, query.eventId));

      // Check admin role (best-effort — if throws, not admin)
      let isAdmin = false;
      try {
        const role = await requireClubRole(event.clubId, member.id, [
          "owner",
          "admin",
        ]);
        isAdmin = role === "owner" || role === "admin";
      } catch {
        isAdmin = false;
      }

      const currentMemberReg = regList.find((r) => r.memberId === member.id);

      return {
        event: {
          id: event.id,
          title: event.title,
          eventDate: event.eventDate,
          venueName: event.venueName,
          venueMapsUrl: event.venueMapsUrl,
          status: event.status,
          maxPlayers: event.maxPlayers,
          clubId: event.clubId,
        },
        registrations: regList.map((r) => ({
          id: r.id,
          memberId: r.memberId,
          displayName: r.displayName,
        })),
        registeredCount: regList.length,
        currentMemberRegistrationId: currentMemberReg?.id ?? null,
        isAdmin,
      };
    },
    { query: t.Object({ eventId: t.String({ format: "uuid" }) }) }
  )

  // POST /registrations — register member (REG-01, BOT-02)
  .post(
    "/",
    async ({ body, session, set, request }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));
      if (!member) throw notFound("Member");

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, body.eventId));
      if (!event) throw notFound("Event");

      if (event.status !== "open") {
        throw new ApiError(409, "EVENT_CLOSED", "ปิดรับลงทะเบียนแล้ว");
      }

      // Count current registrations
      const [{ value: currentCount }] = await db
        .select({ value: count() })
        .from(registrations)
        .where(eq(registrations.eventId, body.eventId));

      if (Number(currentCount) >= event.maxPlayers) {
        throw new ApiError(409, "EVENT_FULL", "งานนี้เต็มแล้ว");
      }

      // Insert registration — catch unique constraint violation
      let regId: string;
      try {
        const [reg] = await db
          .insert(registrations)
          .values({ eventId: body.eventId, memberId: member.id })
          .returning();
        regId = reg.id;
      } catch (err: any) {
        // DrizzleQueryError wraps the Neon DB error — check cause.code for PG error codes
        const pgCode = err?.cause?.code ?? err?.code;
        if (pgCode === "23505") {
          throw new ApiError(409, "ALREADY_REGISTERED", "ลงทะเบียนแล้ว");
        }
        throw err;
      }

      // Re-count for accurate count post-insert
      const [{ value: newCount }] = await db
        .select({ value: count() })
        .from(registrations)
        .where(eq(registrations.eventId, body.eventId));

      const liffContext = request.headers.get("x-liff-context");

      // Build card data for either response or push
      const cardData = await buildFlexCardData({
        event,
        clubId: event.clubId,
        action: "register",
        memberName: member.displayName,
        registeredCount: Number(newCount),
      });

      let flexCard = null;
      if (!liffContext || liffContext === "external") {
        // External browser or no context — server pushes to group
        if (cardData) await pushCardToGroup(cardData, event.id);
      } else {
        // In-LINE context — skip server push, return card for client sendMessages
        flexCard = cardData?.card ?? null;
      }

      set.status = 201;
      return { id: regId, registeredCount: Number(newCount), flexCard };
    },
    { body: t.Object({ eventId: t.String({ format: "uuid" }) }) }
  )

  // DELETE /registrations/:registrationId — cancel own or admin remove (REG-03, REG-05)
  .delete(
    "/:registrationId",
    async ({ params, session, request }) => {
      const [registration] = await db
        .select()
        .from(registrations)
        .where(eq(registrations.id, params.registrationId));
      if (!registration) throw notFound("Registration");

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, registration.eventId));
      if (!event) throw notFound("Event");

      const [callerMember] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));
      if (!callerMember) throw notFound("Member");

      let isAdminRemove = false;
      if (registration.memberId !== callerMember.id) {
        // Must be admin to remove another member's registration
        await requireClubRole(event.clubId, callerMember.id, [
          "owner",
          "admin",
        ]);
        isAdminRemove = true;
      }

      // Fetch removed member's displayName before delete (for alt text)
      const [removedMember] = await db
        .select({ displayName: members.displayName })
        .from(members)
        .where(eq(members.id, registration.memberId));

      // Delete registration
      await db
        .delete(registrations)
        .where(eq(registrations.id, params.registrationId));

      // Re-count
      const [{ value: newCount }] = await db
        .select({ value: count() })
        .from(registrations)
        .where(eq(registrations.eventId, registration.eventId));

      const liffContext = request.headers.get("x-liff-context");

      // Build card data
      const cardData = await buildFlexCardData({
        event,
        clubId: event.clubId,
        action: isAdminRemove ? "admin_remove" : "cancel",
        memberName: isAdminRemove ? undefined : removedMember?.displayName,
        registeredCount: Number(newCount),
      });

      let flexCard = null;
      if (!liffContext || liffContext === "external") {
        // External browser or no context — server pushes to group
        if (cardData) await pushCardToGroup(cardData, event.id);
      } else {
        // In-LINE context — skip server push, return card for client sendMessages
        flexCard = cardData?.card ?? null;
      }

      return { registeredCount: Number(newCount), flexCard };
    },
    {
      params: t.Object({ registrationId: t.String({ format: "uuid" }) }),
    }
  );
