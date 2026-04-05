import { db, idempotencyKeys } from "@repo/db";

/**
 * Attempts to insert the webhookEventId. Returns true if this is a new event
 * (should be processed), false if duplicate (skip silently).
 */
export async function processWithIdempotency(
  webhookEventId: string,
  handler: () => Promise<void>
): Promise<void> {
  const result = await db
    .insert(idempotencyKeys)
    .values({ webhookEventId })
    .onConflictDoNothing()
    .returning();

  // result is empty array if conflict (already processed)
  if (result.length === 0) {
    return; // duplicate — skip silently
  }

  await handler();
}
