import { z } from "zod";

export const CreateUserRequestSchema = z.object({
  email: z
    .email()
    .max(255)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});
export type CreateUserRequestDto = z.infer<typeof CreateUserRequestSchema>;

export const CreateUserResponseSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CreateUserResponseDto = z.infer<typeof CreateUserResponseSchema>;
