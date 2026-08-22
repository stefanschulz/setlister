import { z } from "zod";

export const outputChannelInputSchema = z.object({
  name: z.string().min(1, "name is required"),
  pattern: z.string().min(1, "pattern is required"),
});

export type OutputChannelInput = z.infer<typeof outputChannelInputSchema>;
