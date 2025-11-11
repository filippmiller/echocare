import { z } from "zod";

export const createEntrySchema = z.object({
  title: z.string().trim().max(200).optional().or(z.literal("")),
  text: z.string().trim().min(1, "Text is required"),
  mood: z.string().trim().max(50).optional().or(z.literal("")),
  energy: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string().trim()).optional(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;

