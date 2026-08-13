import { z } from "zod";

export const RegisterRequestSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8).max(72),
});
export type RegisterRequestDto = z.infer<typeof RegisterRequestSchema>;

export const TokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
});
export type TokenPairDto = z.infer<typeof TokenPairSchema>;
