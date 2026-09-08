import { describe, expect, it } from "vitest";
import { albumInputSchema } from "./album.js";

const base = { title: "Album" };

describe("albumInputSchema — labelId", () => {
  it("accepts a positive labelId", () => {
    const result = albumInputSchema.safeParse({ ...base, labelId: 3 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.labelId).toBe(3);
  });

  it("omitted labelId parses to undefined", () => {
    const result = albumInputSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.labelId).toBeUndefined();
  });

  it(
    "accepts a null labelId — the client's \"clear label\" action sends null since " +
      "react-hook-form's Controller can't clear to undefined outside a form reset",
    () => {
      const result = albumInputSchema.safeParse({ ...base, labelId: null });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.labelId).toBeNull();
    },
  );

  it("rejects a non-positive labelId", () => {
    const result = albumInputSchema.safeParse({ ...base, labelId: 0 });
    expect(result.success).toBe(false);
  });
});
