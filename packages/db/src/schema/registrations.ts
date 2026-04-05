import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { events } from "./events";
import { members } from "./members";

export const registrations = pgTable("registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  memberId: uuid("member_id").references(() => members.id).notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.eventId, t.memberId),
]);
