import { Elysia, t } from "elysia";
import { db, events, members, registrations } from "@repo/db";
import { eq, count, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireClubRole } from "../lib/require-club-role";
import { notFound, ApiError } from "../lib/errors";
import { repostFlexCard } from "../lib/repost-card";

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
    async ({ body, session, set }) => {
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

      // Repost flex card (best-effort)
      await repostFlexCard({
        event,
        clubId: event.clubId,
        action: "register",
        memberName: member.displayName,
        registeredCount: Number(newCount),
      });

      set.status = 201;
      return { id: regId, registeredCount: Number(newCount) };
    },
    { body: t.Object({ eventId: t.String({ format: "uuid" }) }) }
  )

  // DELETE /registrations/:registrationId — cancel own or admin remove (REG-03, REG-05)
  .delete(
    "/:registrationId",
    async ({ params, session }) => {
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

      // Repost flex card
      await repostFlexCard({
        event,
        clubId: event.clubId,
        action: isAdminRemove ? "admin_remove" : "cancel",
        memberName: isAdminRemove ? undefined : removedMember?.displayName,
        registeredCount: Number(newCount),
      });

      return { registeredCount: Number(newCount) };
    },
    {
      params: t.Object({ registrationId: t.String({ format: "uuid" }) }),
    }
  );
