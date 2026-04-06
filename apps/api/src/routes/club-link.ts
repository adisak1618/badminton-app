import { Elysia, t } from "elysia";
import { db, clubs, clubMembers, members } from "@repo/db";
import { eq } from "drizzle-orm";
import { requireClubRole } from "../lib/require-club-role";
import { notFound, forbidden } from "../lib/errors";
import { authMiddleware } from "../middleware/auth";

export const clubLinkRoutes = new Elysia({ prefix: "/clubs" })
  .use(authMiddleware)
  // POST /clubs/link — link a Line group to a club
  .post(
    "/link",
    async ({ body, session }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));

      if (!member) throw notFound("User");

      // Only owners can link groups
      await requireClubRole(body.clubId, member.id, ["owner"]);

      // Check club is not already linked to a different group
      const [club] = await db
        .select()
        .from(clubs)
        .where(eq(clubs.id, body.clubId));

      if (!club) throw notFound("Club");

      if (club.lineGroupId && club.lineGroupId !== body.groupId) {
        throw forbidden(
          "Club is already linked to a different group. Unlink first."
        );
      }

      // Set lineGroupId on the club
      const [updated] = await db
        .update(clubs)
        .set({ lineGroupId: body.groupId })
        .where(eq(clubs.id, body.clubId))
        .returning();

      return updated;
    },
    {
      body: t.Object({
        clubId: t.String({ format: "uuid" }),
        groupId: t.String({ minLength: 1, maxLength: 100 }),
      }),
    }
  )
  // DELETE /clubs/:id/link — unlink a Line group from a club
  .delete(
    "/:id/link",
    async ({ params, session }) => {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.lineUserId, session.lineUserId!));

      if (!member) throw notFound("User");

      await requireClubRole(params.id, member.id, ["owner"]);

      const [updated] = await db
        .update(clubs)
        .set({ lineGroupId: null })
        .where(eq(clubs.id, params.id))
        .returning();

      if (!updated) throw notFound("Club");
      return updated;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
    }
  );
