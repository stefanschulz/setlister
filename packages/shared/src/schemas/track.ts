import { z } from "zod";
import { CONTRIBUTOR_ROLES } from "../contributor-role.js";

export const trackContributorInputSchema = z.object({
  artistId: z.number().int().positive(),
  role: z.enum(CONTRIBUTOR_ROLES),
  position: z.number().int().min(0),
});

export const trackInputSchema = z.object({
  title: z.string().min(1, "title is required"),
  albumId: z.number().int().positive(),
  contributors: z
    .array(trackContributorInputSchema)
    .min(1, "at least one contributor is required")
    .refine(
      (contributors) => {
        const seen = new Set<string>();
        return contributors.every((c) => {
          const key = `${c.role}:${c.position}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      },
      { message: "duplicate position within the same contributor role" },
    ),
});

export type TrackContributorInput = z.infer<typeof trackContributorInputSchema>;
export type TrackInput = z.infer<typeof trackInputSchema>;
