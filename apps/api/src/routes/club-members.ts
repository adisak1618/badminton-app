import { Elysia, t } from "elysia";
import { db, clubMembers, members } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { requireClubRole } from "../lib/require-club-role";
import { notFound, forbidden } from "../lib/errors";
import { authMiddleware } from "../middleware/auth";

export const clubMemberRoutes = new Elysia({ prefix: "/clubs" })
  .use(authMiddleware)
  // GET /clubs/:id/members — list members of a club
  .get(
    "/:id/members",
    async ({ params, session }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));

      if (!member) throw notFound("Club");

      // Must be a member of the club to see member list
      await requireClubRole(params.id, member.id, [
        "owner",
        "admin",
        "member",
      ]);

      const memberList = await db
        .select({
          memberId: clubMembers.memberId,
          displayName: members.displayName,
          role: clubMembers.role,
          joinedAt: clubMembers.joinedAt,
        })
        .from(clubMembers)
        .innerJoin(members, eq(members.id, clubMembers.memberId))
        .where(eq(clubMembers.clubId, params.id));

      return memberList;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
    }
  )
  // PUT /clubs/:id/members/:memberId/role — change a member's role
  .put(
    "/:id/members/:memberId/role",
    async ({ params, body, session }) => {
      const [currentUser] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));

      if (!currentUser) throw notFound("User");

      // Only owners can change roles
      await requireClubRole(params.id, currentUser.id, ["owner"]);

      // Cannot change own role
      if (currentUser.id === params.memberId) {
        throw forbidden("Cannot change your own role");
      }

      // Verify target member exists in club
      const [targetMembership] = await db
        .select()
        .from(clubMembers)
        .where(
          and(
            eq(clubMembers.clubId, params.id),
            eq(clubMembers.memberId, params.memberId)
          )
        );

      if (!targetMembership) throw notFound("Member");

      const [updated] = await db
        .update(clubMembers)
        .set({ role: body.role })
        .where(
          and(
            eq(clubMembers.clubId, params.id),
            eq(clubMembers.memberId, params.memberId)
          )
        )
        .returning();

      return updated;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
        memberId: t.String({ format: "uuid" }),
      }),
      body: t.Object({
        role: t.Union([t.Literal("admin"), t.Literal("member")]),
      }),
    }
  );
