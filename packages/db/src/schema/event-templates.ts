import { pgTable, uuid, varchar, timestamp, integer, pgEnum, smallint } from "drizzle-orm/pg-core";
import { clubs } from "./clubs";

export const templateStatusEnum = pgEnum("template_status", ["active", "paused", "archived"]);

export const eventTemplates = pgTable("event_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").references(() => clubs.id).notNull(),
  title: varchar("title", { length: 255 }),
  venueName: varchar("venue_name", { length: 255 }).notNull(),
  venueMapsUrl: varchar("venue_maps_url", { length: 500 }),
  shuttlecockFee: integer("shuttlecock_fee").notNull().default(0),
  courtFee: integer("court_fee").notNull().default(0),
  maxPlayers: integer("max_players").notNull().default(20),
  eventDayOfWeek: smallint("event_day_of_week").notNull(),
  eventTime: varchar("event_time", { length: 5 }).notNull(),
  openDayOfWeek: smallint("open_day_of_week").notNull(),
  openTime: varchar("open_time", { length: 5 }).notNull(),
  status: templateStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
