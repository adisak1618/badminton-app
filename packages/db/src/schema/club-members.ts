import { pgTable, uuid, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { clubs } from "./clubs";
import { members } from "./members";

export const clubRoleEnum = pgEnum("club_role", ["owner", "admin", "member"]);

export const clubMembers = pgTable("club_members", {
  clubId: uuid("club_id").references(() => clubs.id).notNull(),
  memberId: uuid("member_id").references(() => members.id).notNull(),
  role: clubRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.clubId, t.memberId),
]);
