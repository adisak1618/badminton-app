import { Elysia, t } from "elysia";
import { db, clubs, clubMembers, members } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { requireClubRole } from "../lib/require-club-role";
import { notFound } from "../lib/errors";
import { authMiddleware } from "../middleware/auth";

export const clubRoutes = new Elysia({ prefix: "/clubs" })
  .use(authMiddleware)
  // POST /clubs — create a new club
  .post(
    "/",
    async ({ body, session }) => {
      // Find or require the member record for this lineUserId
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));

      if (!member) {
        // Auto-create member record with minimal info from session
        const [newMember] = await db
          .insert(members)
          .values({
            lineUserId: session.lineUserId!,
            displayName: session.displayName || "Unknown",
            skillLevel: "beginner",
          })
          .returning();

        const [newClub] = await db
          .insert(clubs)
          .values({
            name: body.name,
            homeCourtLocation: body.homeCourtLocation,
            defaultMaxPlayers: body.defaultMaxPlayers,
            defaultShuttlecockFee: body.defaultShuttlecockFee,
            defaultCourtFee: body.defaultCourtFee,
          })
          .returning();

        await db.insert(clubMembers).values({
          clubId: newClub.id,
          memberId: newMember.id,
          role: "owner",
        });

        return newClub;
      }

      const [newClub] = await db
        .insert(clubs)
        .values({
          name: body.name,
          homeCourtLocation: body.homeCourtLocation,
          defaultMaxPlayers: body.defaultMaxPlayers,
          defaultShuttlecockFee: body.defaultShuttlecockFee,
          defaultCourtFee: body.defaultCourtFee,
        })
        .returning();

      await db.insert(clubMembers).values({
        clubId: newClub.id,
        memberId: member.id,
        role: "owner",
      });

      return newClub;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        homeCourtLocation: t.Optional(t.String({ maxLength: 500 })),
        defaultMaxPlayers: t.Optional(
          t.Integer({ minimum: 1, default: 20 })
        ),
        defaultShuttlecockFee: t.Optional(
          t.Integer({ minimum: 0, default: 0 })
        ),
        defaultCourtFee: t.Optional(t.Integer({ minimum: 0, default: 0 })),
      }),
    }
  )
  // GET /clubs — list clubs for the authenticated user
  .get("/", async ({ session }) => {
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.lineUserId, session.lineUserId!));

    if (!member) return [];

    const userClubs = await db
      .select({
        id: clubs.id,
        name: clubs.name,
        homeCourtLocation: clubs.homeCourtLocation,
        lineGroupId: clubs.lineGroupId,
        defaultMaxPlayers: clubs.defaultMaxPlayers,
        defaultShuttlecockFee: clubs.defaultShuttlecockFee,
        defaultCourtFee: clubs.defaultCourtFee,
        createdAt: clubs.createdAt,
        role: clubMembers.role,
        joinedAt: clubMembers.joinedAt,
      })
      .from(clubMembers)
      .innerJoin(clubs, eq(clubs.id, clubMembers.clubId))
      .where(eq(clubMembers.memberId, member.id));

    return userClubs;
  })
  // GET /clubs/:id — get a single club with user's role
  .get(
    "/:id",
    async ({ params, session }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));

      if (!member) throw notFound("Club");

      const [club] = await db
        .select({
          id: clubs.id,
          name: clubs.name,
          homeCourtLocation: clubs.homeCourtLocation,
          lineGroupId: clubs.lineGroupId,
          defaultMaxPlayers: clubs.defaultMaxPlayers,
          defaultShuttlecockFee: clubs.defaultShuttlecockFee,
          defaultCourtFee: clubs.defaultCourtFee,
          createdAt: clubs.createdAt,
          role: clubMembers.role,
        })
        .from(clubMembers)
        .innerJoin(clubs, eq(clubs.id, clubMembers.clubId))
        .where(
          and(
            eq(clubMembers.memberId, member.id),
            eq(clubMembers.clubId, params.id)
          )
        );

      if (!club) throw notFound("Club");
      return club;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
    }
  )
  // PUT /clubs/:id — update club settings (owner/admin only)
  .put(
    "/:id",
    async ({ params, body, session }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));

      if (!member) throw notFound("Club");

      await requireClubRole(params.id, member.id, ["owner", "admin"]);

      const [updated] = await db
        .update(clubs)
        .set({
          name: body.name,
          homeCourtLocation: body.homeCourtLocation,
          defaultMaxPlayers: body.defaultMaxPlayers,
          defaultShuttlecockFee: body.defaultShuttlecockFee,
          defaultCourtFee: body.defaultCourtFee,
        })
        .where(eq(clubs.id, params.id))
        .returning();

      if (!updated) throw notFound("Club");
      return updated;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        homeCourtLocation: t.Optional(t.String({ maxLength: 500 })),
        defaultMaxPlayers: t.Optional(t.Integer({ minimum: 1 })),
        defaultShuttlecockFee: t.Optional(t.Integer({ minimum: 0 })),
        defaultCourtFee: t.Optional(t.Integer({ minimum: 0 })),
      }),
    }
  );
