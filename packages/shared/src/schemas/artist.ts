import { z } from "zod";

export const artistSocialReferenceInputSchema = z.object({
  platform: z.string().min(1, "platform is required"),
  referenceName: z.string().min(1, "referenceName is required"),
});

export const artistInputSchema = z.object({
  name: z.string().min(1, "name is required"),
  realName: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional(),
  socialReferences: z.array(artistSocialReferenceInputSchema).optional(),
});

export type ArtistSocialReferenceInput = z.infer<typeof artistSocialReferenceInputSchema>;
export type ArtistInput = z.infer<typeof artistInputSchema>;
