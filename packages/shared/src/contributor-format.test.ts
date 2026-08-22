import { describe, expect, it } from "vitest";
import { type ContributorDisplay, formatContributorList } from "./contributor-format.js";

function c(name: string, role: ContributorDisplay["role"], position = 0): ContributorDisplay {
  return { name, role, position };
}

describe("formatContributorList — docs/konzept.md §1.7 examples", () => {
  it.each([
    { desc: "1 original", input: [c("A", "ORIGINAL")], expected: "A" },
    {
      desc: "2 original",
      input: [c("A", "ORIGINAL", 0), c("B", "ORIGINAL", 1)],
      expected: "A & B",
    },
    {
      desc: "3 original",
      input: [c("A", "ORIGINAL", 0), c("B", "ORIGINAL", 1), c("C", "ORIGINAL", 2)],
      expected: "A, B & C",
    },
    {
      desc: "1 original + 1 feat.",
      input: [c("A", "ORIGINAL"), c("B", "FEATURING")],
      expected: "A feat. B",
    },
    {
      desc: "2 original + 1 feat.",
      input: [c("A", "ORIGINAL", 0), c("B", "ORIGINAL", 1), c("C", "FEATURING")],
      expected: "A & B feat. C",
    },
    {
      desc: "1 original + 1 remix",
      input: [c("A", "ORIGINAL"), c("B", "REMIX")],
      expected: "A vs B",
    },
    {
      desc: "1 original + 1 feat. + 1 remix",
      input: [c("A", "ORIGINAL"), c("B", "FEATURING"), c("C", "REMIX")],
      expected: "A feat. B vs C",
    },
  ])("$desc -> $expected", ({ input, expected }) => {
    expect(formatContributorList(input)).toBe(expected);
  });
});

describe("formatContributorList — further combinations", () => {
  it("multiple featuring artists are joined with the same & rule", () => {
    const result = formatContributorList([
      c("A", "ORIGINAL"),
      c("B", "FEATURING", 0),
      c("C", "FEATURING", 1),
    ]);
    expect(result).toBe("A feat. B & C");
  });

  it("multiple remix artists are joined with the same & rule", () => {
    const result = formatContributorList([
      c("A", "ORIGINAL"),
      c("B", "REMIX", 0),
      c("C", "REMIX", 1),
    ]);
    expect(result).toBe("A vs B & C");
  });

  it("multiple original + multiple feat. + multiple remix combine correctly", () => {
    const result = formatContributorList([
      c("A", "ORIGINAL", 0),
      c("B", "ORIGINAL", 1),
      c("C", "FEATURING", 0),
      c("D", "FEATURING", 1),
      c("E", "REMIX", 0),
      c("F", "REMIX", 1),
    ]);
    expect(result).toBe("A & B feat. C & D vs E & F");
  });

  it("position determines order within a role group regardless of input order", () => {
    const result = formatContributorList([
      c("B", "ORIGINAL", 1),
      c("A", "ORIGINAL", 0),
      c("C", "ORIGINAL", 2),
    ]);
    expect(result).toBe("A, B & C");
  });
});

describe("formatContributorList — edge cases", () => {
  it("returns an empty string for no contributors", () => {
    expect(formatContributorList([])).toBe("");
  });

  it("feat. without an original degrades to just the featuring group", () => {
    expect(formatContributorList([c("B", "FEATURING")])).toBe("B");
  });

  it("remix without an original degrades to just the remix group", () => {
    expect(formatContributorList([c("B", "REMIX")])).toBe("B");
  });

  it("feat. and remix without an original combine without a dangling separator", () => {
    expect(formatContributorList([c("B", "FEATURING"), c("C", "REMIX")])).toBe("B vs C");
  });
});
