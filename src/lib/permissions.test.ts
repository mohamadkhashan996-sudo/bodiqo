import { describe, expect, it } from "vitest";

import { can, isStaff, ROLE_RANK } from "@/lib/permissions";

describe("permissions", () => {
  it("ranks SUPER_ADMIN above ADMIN", () => {
    expect(ROLE_RANK.SUPER_ADMIN).toBeGreaterThan(ROLE_RANK.ADMIN);
  });

  it("treats USER as non-staff", () => {
    expect(isStaff("USER")).toBe(false);
    expect(isStaff("ADMIN")).toBe(true);
  });

  it("gates backups:write to owner-level roles", () => {
    expect(can("USER", "backups:write")).toBe(false);
    expect(can("ADMIN", "backups:write")).toBe(false);
    expect(can("OWNER", "backups:write")).toBe(true);
    expect(can("MODERATOR", "monitoring:read")).toBe(true);
  });

  it("grants support tickets to SUPPORT and payments read to MODERATOR", () => {
    expect(can("SUPPORT", "support:write")).toBe(true);
    expect(can("SUPPORT", "payments:write")).toBe(false);
    expect(can("MODERATOR", "payments:read")).toBe(true);
    expect(can("ADMIN", "announcements:write")).toBe(true);
  });
});
