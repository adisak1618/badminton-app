import { pgTable, uuid, varchar, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const skillLevelEnum = pgEnum("skill_level", [
  "beginner", "intermediate", "advanced", "competitive"
]);

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineUserId: varchar("line_user_id", { length: 100 }).unique().notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  skillLevel: skillLevelEnum("skill_level").notNull(),
  yearsPlaying: integer("years_playing").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
