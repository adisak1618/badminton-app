import { pgTable, uuid, varchar, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { clubs } from "./clubs";
import { eventTemplates } from "./event-templates";

export const eventStatusEnum = pgEnum("event_status", [
  "draft", "open", "closed", "cancelled"
]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").references(() => clubs.id).notNull(),
  templateId: uuid("template_id").references(() => eventTemplates.id),
  title: varchar("title", { length: 255 }).notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  venueName: varchar("venue_name", { length: 255 }),
  venueMapsUrl: varchar("venue_maps_url", { length: 500 }),
  shuttlecockFee: integer("shuttlecock_fee").notNull().default(0),
  courtFee: integer("court_fee").notNull().default(0),
  maxPlayers: integer("max_players").notNull().default(20),
  status: eventStatusEnum("status").notNull().default("draft"),
  lineMessageId: varchar("line_message_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
