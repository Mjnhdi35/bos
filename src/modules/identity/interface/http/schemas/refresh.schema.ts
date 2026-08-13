import { z } from "zod";

export const RefreshRequestSchema = z.object({
  refresh_token: z.string().min(1),
});
export type RefreshRequestDto = z.infer<typeof RefreshRequestSchema>;