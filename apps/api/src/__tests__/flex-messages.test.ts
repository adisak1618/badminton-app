import { describe, it, expect } from "bun:test";
import { buildEventFlexCard, buildRepostFlexCard } from "../lib/flex-messages";

const baseEventData = {
  title: "แบด Test",
  eventDate: new Date("2026-04-15T18:00:00+07:00"),
  venueName: "Test Court",
  venueMapsUrl: null,
  shuttlecockFee: 60,
  courtFee: 250,
  maxPlayers: 14,
  registeredCount: 5,
  registerLiffUrl: "https://liff.line.me/123/events/abc",
  detailsLiffUrl: "https://liff.line.me/123/events/abc",
};

const baseRepostData = {
  ...baseEventData,
  notificationAltText: "test alt",
  notificationBodyText: "Alice ลงทะเบียนแล้ว (เหลือ 8 ที่)",
  isFull: false,
  isClosed: false,
};

// Gap 1: Single CTA in buildEventFlexCard
describe("buildEventFlexCard single CTA (09-02 D-04)", () => {
  it("footer has exactly 1 button with label ลงทะเบียน", () => {
    const msg = buildEventFlexCard(baseEventData);
    const bubble = msg.contents as any;
    const footerContents = bubble.footer.contents;
    expect(footerContents).toHaveLength(1);
    expect(footerContents[0].type).toBe("button");
    expect(footerContents[0].action.label).toBe("ลงทะเบียน");
  });
});

// Gap 2: Context-aware CTA in buildRepostFlexCard
describe("buildRepostFlexCard context-aware CTA (09-02 D-05)", () => {
  it("shows ลงทะเบียน primary when not full and not closed", () => {
    const msg = buildRepostFlexCard({ ...baseRepostData, isFull: false, isClosed: false });
    const bubble = msg.contents as any;
    const btn = bubble.footer.contents[0];
    expect(btn.action.label).toBe("ลงทะเบียน");
    expect(btn.style).toBe("primary");
  });

  it("shows รายละเอียด secondary when isFull", () => {
    const msg = buildRepostFlexCard({ ...baseRepostData, isFull: true, isClosed: false });
    const bubble = msg.contents as any;
    const btn = bubble.footer.contents[0];
    expect(btn.action.label).toBe("รายละเอียด");
    expect(btn.style).toBe("secondary");
  });

  it("shows รายละเอียด secondary when isClosed", () => {
    const msg = buildRepostFlexCard({ ...baseRepostData, isFull: false, isClosed: true });
    const bubble = msg.contents as any;
    const btn = bubble.footer.contents[0];
    expect(btn.action.label).toBe("รายละเอียด");
    expect(btn.style).toBe("secondary");
  });
});

// Gap 3: Notification line in repost card body
describe("buildRepostFlexCard notification line (09-02 D-06)", () => {
  it("body contents include notificationBodyText", () => {
    const notifText = "Alice ลงทะเบียนแล้ว (เหลือ 8 ที่)";
    const msg = buildRepostFlexCard({ ...baseRepostData, notificationBodyText: notifText });
    const bubble = msg.contents as any;
    const bodyTexts = bubble.body.contents.map((c: any) => c.text);
    expect(bodyTexts).toContain(notifText);
  });
});

// Gap 4: No /register in URLs
describe("no /register suffix in LIFF URLs (09-02 D-03)", () => {
  it("registerLiffUrl in repost-card.ts does not contain /register", async () => {
    const source = await Bun.file(
      new URL("../lib/repost-card.ts", import.meta.url).pathname
    ).text();
    // Should not have /register in any LIFF URL template literal
    const liffUrlMatches = source.match(/`\$\{liffBase\}\/events\/\$\{[^}]+\}\/register`/g);
    expect(liffUrlMatches).toBeNull();
  });

  it("route files do not contain /register in LIFF URLs", async () => {
    for (const relPath of [
      "../routes/events.ts",
      "../routes/cron.ts",
      "../routes/event-templates.ts",
    ]) {
      const filePath = new URL(relPath, import.meta.url).pathname;
      const source = await Bun.file(filePath).text();
      const matches = source.match(/`\$\{liffBase\}\/events\/\$\{[^}]+\}\/register`/g);
      expect(matches).toBeNull();
    }
  });
});
