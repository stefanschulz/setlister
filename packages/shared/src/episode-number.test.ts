import { describe, expect, it } from "vitest";
import { compareEpisodeNumbers, formatEpisodeNumber } from "./episode-number.js";

describe("formatEpisodeNumber", () => {
  it("concatenates number and suffix", () => {
    expect(formatEpisodeNumber({ number: 103, suffix: "v1" })).toBe("103v1");
    expect(formatEpisodeNumber({ number: 357, suffix: " (xe)" })).toBe("357 (xe)");
  });

  it("renders plain when there is no suffix", () => {
    expect(formatEpisodeNumber({ number: 42, suffix: "" })).toBe("42");
  });
});

describe("compareEpisodeNumbers", () => {
  it("orders numerically, not alphabetically", () => {
    const a = { number: 99, suffix: "p5" };
    const b = { number: 103, suffix: "v1" };
    expect(compareEpisodeNumbers(a, b)).toBeLessThan(0);
  });

  it("orders same-number variants by suffix, plain before suffixed", () => {
    const plain = { number: 357, suffix: "" };
    const variant = { number: 357, suffix: " (xe)" };
    expect(compareEpisodeNumbers(plain, variant)).toBeLessThan(0);
  });

  it("orders v1 before v2 for the same base number", () => {
    const v1 = { number: 103, suffix: "v1" };
    const v2 = { number: 103, suffix: "v2" };
    expect(compareEpisodeNumbers(v1, v2)).toBeLessThan(0);
  });
});
