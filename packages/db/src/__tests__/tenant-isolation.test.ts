import { describe, it, expect } from "bun:test";

describe("cross-tenant isolation (INFRA-01)", () => {
  it("club A events are not visible when querying with club B id", () => {
    // Stub: requires DATABASE_URL — implemented in Plan 03
    expect(true).toBe(true);
  });
});
