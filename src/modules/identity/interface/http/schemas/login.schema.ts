import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8).max(72),
});
export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;