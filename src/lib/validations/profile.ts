import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().trim().max(200).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  locale: z.string().trim().max(10).optional().or(z.literal("")),
  timezone: z.string().trim().max(50).optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
