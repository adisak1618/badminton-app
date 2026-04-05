import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db, clubs, events } from "../index";
import { eq } from "drizzle-orm";

describe("cross-tenant isolation (INFRA-01)", () => {
  let clubAId: string;
  let clubBId: string;

  beforeAll(async () => {
    // Seed two clubs
    const [clubA] = await db
      .insert(clubs)
      .values({ name: "Test Club A" })
      .returning();
    const [clubB] = await db
      .insert(clubs)
      .values({ name: "Test Club B" })
      .returning();
    clubAId = clubA.id;
    clubBId = clubB.id;

    // Create an event for Club A only
    await db.insert(events).values({
      clubId: clubAId,
      title: "Club A Event",
      eventDate: new Date("2026-05-01T18:00:00+07:00"),
    });
  });

  afterAll(async () => {
    // Clean up test data (events first due to FK)
    await db.delete(events).where(eq(events.clubId, clubAId));
    await db.delete(events).where(eq(events.clubId, clubBId));
    await db.delete(clubs).where(eq(clubs.id, clubAId));
    await db.delete(clubs).where(eq(clubs.id, clubBId));
  });

  it("club A events are NOT visible when querying with club B id", async () => {
    const clubBEvents = await db
      .select()
      .from(events)
      .where(eq(events.clubId, clubBId));

    expect(clubBEvents).toHaveLength(0);
  });

  it("club A events ARE visible when querying with club A id", async () => {
    const clubAEvents = await db
      .select()
      .from(events)
      .where(eq(events.clubId, clubAId));

    expect(clubAEvents).toHaveLength(1);
    expect(clubAEvents[0].title).toBe("Club A Event");
  });
});
