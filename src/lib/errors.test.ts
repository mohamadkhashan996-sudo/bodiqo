import { describe, expect, it } from "vitest";
import { AppError, toErrorResponse } from "@/lib/errors";

describe("errors", () => {
  it("maps AppError to status + body", () => {
    const result = toErrorResponse(new AppError("Nope", 403, "FORBIDDEN"));
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "Nope", code: "FORBIDDEN" });
  });

  it("hides internal error details", () => {
    const result = toErrorResponse(new Error("secret stack"));
    expect(result.status).toBe(500);
    expect(result.body.code).toBe("INTERNAL");
    expect(result.body.error).not.toContain("secret");
  });
});
