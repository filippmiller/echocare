import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(100, "Name is too long")
      .or(z.literal("")),
    email: z
      .string()
      .trim()
      .transform((value) => value.toLowerCase())
      .pipe(z.string().email("Enter a valid email"))
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Enter a valid phone number (e.g., +1234567890)")
      .optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone number is required",
    path: ["email"],
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
