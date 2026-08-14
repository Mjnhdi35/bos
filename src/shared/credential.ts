import { z } from "zod";

export const CredentialSchema = z.object({
  email: z.email().max(255).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});
export type Credential = z.infer<typeof CredentialSchema>;