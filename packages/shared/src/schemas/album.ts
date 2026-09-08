import { z } from "zod";

export const albumInputSchema = z.object({
  title: z.string().min(1, "title is required"),
  link: z.string().url().optional(),
  // Accepts null as well as undefined/omitted (both mean "no label"): the
  // client's "clear label" action sets null rather than undefined, since
  // react-hook-form's Controller falls back to the field's last non-undefined
  // default when a value is set to undefined outside of a full form reset.
  labelId: z.number().int().positive().nullable().optional(),
});

export type AlbumInput = z.infer<typeof albumInputSchema>;
