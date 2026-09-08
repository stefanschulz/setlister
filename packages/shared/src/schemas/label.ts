import { z } from "zod";

export const labelInputSchema = z.object({
  name: z.string().min(1, "name is required"),
  link: z.string().url().optional(),
  facebookReferenceName: z.string().optional(),
});

export type LabelInput = z.infer<typeof labelInputSchema>;
