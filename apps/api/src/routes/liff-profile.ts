import { Elysia, t } from "elysia";
import { db, members } from "@repo/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { notFound } from "../lib/errors";

export const liffProfileRoutes = new Elysia({ prefix: "/liff/profile" })
  .use(authMiddleware)
  // GET /liff/profile — return member profile (global, keyed by lineUserId, no club_id)
  .get("/", async ({ session }) => {
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.lineUserId, session.lineUserId!));

    if (!member) throw notFound("Member profile");

    // Return only safe fields — do NOT leak lineUserId (T-03-05)
    return {
      id: member.id,
      displayName: member.displayName,
      skillLevel: member.skillLevel,
      yearsPlaying: member.yearsPlaying,
    };
  })
  // POST /liff/profile — create member record (MEMB-01, MEMB-03)
  .post(
    "/",
    async ({ body, session, set }) => {
      const [created] = await db
        .insert(members)
        .values({
          lineUserId: session.lineUserId!, // always from sealed session, never from body (T-03-01)
          displayName: body.displayName,
          skillLevel: body.skillLevel,
          yearsPlaying: body.yearsPlaying,
        })
        .returning();

      set.status = 201;
      return {
        id: created.id,
        displayName: created.displayName,
        skillLevel: created.skillLevel,
        yearsPlaying: created.yearsPlaying,
      };
    },
    {
      body: t.Object({
        displayName: t.String({ minLength: 1, maxLength: 255 }),
        skillLevel: t.Union([
          t.Literal("beginner"),
          t.Literal("intermediate"),
          t.Literal("advanced"),
          t.Literal("competitive"),
        ]),
        yearsPlaying: t.Integer({ minimum: 0 }),
      }),
    }
  )
  // PUT /liff/profile — update member record (partial update allowed)
  .put(
    "/",
    async ({ body, session }) => {
      // Only update the member matching session.lineUserId — user cannot modify another user's profile (T-03-06)
      const updateFields: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (body.displayName !== undefined) updateFields.displayName = body.displayName;
      if (body.skillLevel !== undefined) updateFields.skillLevel = body.skillLevel;
      if (body.yearsPlaying !== undefined) updateFields.yearsPlaying = body.yearsPlaying;

      const [updated] = await db
        .update(members)
        .set(updateFields)
        .where(eq(members.lineUserId, session.lineUserId!))
        .returning();

      if (!updated) throw notFound("Member profile");

      return {
        id: updated.id,
        displayName: updated.displayName,
        skillLevel: updated.skillLevel,
        yearsPlaying: updated.yearsPlaying,
      };
    },
    {
      body: t.Object({
        displayName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        skillLevel: t.Optional(
          t.Union([
            t.Literal("beginner"),
            t.Literal("intermediate"),
            t.Literal("advanced"),
            t.Literal("competitive"),
          ])
        ),
        yearsPlaying: t.Optional(t.Integer({ minimum: 0 })),
      }),
    }
  );
