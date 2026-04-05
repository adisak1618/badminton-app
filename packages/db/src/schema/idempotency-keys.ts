import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const idempotencyKeys = pgTable("idempotency_keys", {
  webhookEventId: varchar("webhook_event_id", { length: 100 }).primaryKey(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});
