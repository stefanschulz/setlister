import { describe, expect, it } from "vitest";
import { trackInputSchema } from "./track.js";

const base = { title: "Track", albumId: 1 };

describe("trackInputSchema — duplicate position guard", () => {
  it("accepts distinct positions within the same role", () => {
    const result = trackInputSchema.safeParse({
      ...base,
      contributors: [
        { artistId: 1, role: "ORIGINAL", position: 0 },
        { artistId: 2, role: "ORIGINAL", position: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects duplicate positions within the same role", () => {
    const result = trackInputSchema.safeParse({
      ...base,
      contributors: [
        { artistId: 1, role: "ORIGINAL", position: 0 },
        { artistId: 2, role: "ORIGINAL", position: 0 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("allows the same position across different roles", () => {
    const result = trackInputSchema.safeParse({
      ...base,
      contributors: [
        { artistId: 1, role: "ORIGINAL", position: 0 },
        { artistId: 2, role: "REMIX", position: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty contributor list", () => {
    const result = trackInputSchema.safeParse({ ...base, contributors: [] });
    expect(result.success).toBe(false);
  });
});
