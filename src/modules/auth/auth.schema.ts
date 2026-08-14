import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.email().max(255).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export const LoginSchema = RegisterSchema;

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshDto = z.infer<typeof RefreshSchema>;
