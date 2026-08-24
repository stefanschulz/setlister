import { z } from "zod";

export const episodeInputSchema = z
  .object({
    number: z.number().int().positive(),
    // Free-text addition for irregular episode identifiers (e.g. "v1", " (xe)"); "" if none/omitted.
    suffix: z.string().optional(),
    // Only required once airDate is set (see superRefine below) — a draft
    // episode can exist with just a number while its details are worked out.
    headline: z.string(),
    topic: z.string(),
    // ISO date string (YYYY-MM-DD). Null/omitted = draft (see docs/konzept.md §1.1).
    airDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "airDate must be an ISO date (YYYY-MM-DD)")
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.airDate) return;
    if (!data.headline.trim()) {
      ctx.addIssue({ code: "custom", path: ["headline"], message: "headline is required once airDate is set" });
    }
    if (!data.topic.trim()) {
      ctx.addIssue({ code: "custom", path: ["topic"], message: "topic is required once airDate is set" });
    }
  });

export const playlistInputSchema = z.object({
  trackIds: z.array(z.number().int().positive()),
});

export type EpisodeInput = z.infer<typeof episodeInputSchema>;
export type PlaylistInput = z.infer<typeof playlistInputSchema>;
