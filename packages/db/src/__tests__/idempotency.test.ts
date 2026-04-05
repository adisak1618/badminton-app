import { describe, it, expect, afterAll } from "bun:test";
import { db, idempotencyKeys } from "../index";
import { eq } from "drizzle-orm";

const TEST_EVENT_ID = "test-webhook-event-id-" + Date.now();

describe("idempotency keys (INFRA-03)", () => {
  afterAll(async () => {
    await db
      .delete(idempotencyKeys)
      .where(eq(idempotencyKeys.webhookEventId, TEST_EVENT_ID));
  });

  it("first insert succeeds and returns the row", async () => {
    const result = await db
      .insert(idempotencyKeys)
      .values({ webhookEventId: TEST_EVENT_ID })
      .onConflictDoNothing()
      .returning();

    expect(result).toHaveLength(1);
    expect(result[0].webhookEventId).toBe(TEST_EVENT_ID);
  });

  it("duplicate insert returns empty array (not an error)", async () => {
    const result = await db
      .insert(idempotencyKeys)
      .values({ webhookEventId: TEST_EVENT_ID })
      .onConflictDoNothing()
      .returning();

    expect(result).toHaveLength(0);
  });
});
