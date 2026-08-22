import { z } from "zod";

export const episodeInputSchema = z.object({
  number: z.number().int().positive(),
  headline: z.string().min(1, "headline is required"),
  topic: z.string().min(1, "topic is required"),
  // ISO date string (YYYY-MM-DD). Null/omitted = draft (see docs/konzept.md §1.1).
  airDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "airDate must be an ISO date (YYYY-MM-DD)")
    .nullable()
    .optional(),
});

export const playlistInputSchema = z.object({
  trackIds: z.array(z.number().int().positive()),
});

export type EpisodeInput = z.infer<typeof episodeInputSchema>;
export type PlaylistInput = z.infer<typeof playlistInputSchema>;
