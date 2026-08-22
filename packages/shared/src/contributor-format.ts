import type { ContributorRole } from "./contributor-role.js";

export interface ContributorDisplay {
  name: string;
  role: ContributorRole;
  /** Order within this role group (see docs/konzept.md §1.7). */
  position: number;
}

/**
 * Renders the "<Künstler°>" string for a track's contributors per the rule
 * in docs/konzept.md §1.7:
 *  - ORIGINAL names are joined "A", "A & B", "A, B & C"
 *  - FEATURING names are appended to the original group: "A feat. B"
 *  - REMIX names are separated with "vs": "A vs B", "A feat. B vs C"
 *
 * Operates on plain display strings only (already resolved artist/reference
 * names) so the same logic serves both HTML output (names pre-wrapped in
 * links) and social-text output (names pre-substituted with the channel's
 * reference name) without knowing about either.
 */
export function formatContributorList(contributors: ContributorDisplay[]): string {
  const namesForRole = (role: ContributorRole) =>
    contributors
      .filter((c) => c.role === role)
      .sort((a, b) => a.position - b.position)
      .map((c) => c.name);

  const original = joinNames(namesForRole("ORIGINAL"));
  const featuring = joinNames(namesForRole("FEATURING"));
  const remix = joinNames(namesForRole("REMIX"));

  let leftOfRemix = original;
  if (featuring) {
    leftOfRemix = leftOfRemix ? `${leftOfRemix} feat. ${featuring}` : featuring;
  }

  if (remix) {
    return leftOfRemix ? `${leftOfRemix} vs ${remix}` : remix;
  }

  return leftOfRemix;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}
