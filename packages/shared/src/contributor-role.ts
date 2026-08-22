export const CONTRIBUTOR_ROLES = ["ORIGINAL", "FEATURING", "REMIX"] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];
