import { describe, expect, it } from "vitest";

import { isMemberOnlyPath, safeCallbackUrl } from "@/lib/guest/paths";

describe("guest paths", () => {
  it("marks private surfaces as member-only", () => {
    expect(isMemberOnlyPath("/messages")).toBe(true);
    expect(isMemberOnlyPath("/settings")).toBe(true);
    expect(isMemberOnlyPath("/live/go")).toBe(true);
    expect(isMemberOnlyPath("/saved")).toBe(true);
    expect(isMemberOnlyPath("/live")).toBe(false);
    expect(isMemberOnlyPath("/explore")).toBe(false);
  });

  it("sanitizes callback URLs", () => {
    expect(safeCallbackUrl("/home")).toBe("/home");
    expect(safeCallbackUrl("https://evil.example/phish")).toBe("/home");
  });
});
