import { db, clubMembers } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { forbidden } from "./errors";

export async function requireClubRole(
  clubId: string,
  memberId: string,
  allowedRoles: string[]
) {
  const [membership] = await db
    .select({ role: clubMembers.role })
    .from(clubMembers)
    .where(
      and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, memberId))
    );

  if (!membership) throw forbidden("Not a member of this club");
  if (!allowedRoles.includes(membership.role))
    throw forbidden("Insufficient role");
  return membership.role;
}
