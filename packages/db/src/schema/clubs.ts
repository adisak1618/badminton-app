import { pgTable, uuid, varchar, timestamp, integer } from "drizzle-orm/pg-core";

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  homeCourtLocation: varchar("home_court_location", { length: 500 }),
  lineGroupId: varchar("line_group_id", { length: 100 }).unique(),
  defaultMaxPlayers: integer("default_max_players").notNull().default(20),
  defaultShuttlecockFee: integer("default_shuttlecock_fee").notNull().default(0),
  defaultCourtFee: integer("default_court_fee").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
