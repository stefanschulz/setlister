import { z } from "zod";

export const albumInputSchema = z.object({
  title: z.string().min(1, "title is required"),
  link: z.string().url().optional(),
});

export type AlbumInput = z.infer<typeof albumInputSchema>;
