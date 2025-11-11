import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Name is too long")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
