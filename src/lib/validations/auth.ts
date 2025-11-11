import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Name is too long")
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(z.email("Enter a valid email")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.output<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
