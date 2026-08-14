import { z } from "zod";
import { CredentialSchema } from "../../shared/credential";

export const RegisterSchema = CredentialSchema;
export const LoginSchema = CredentialSchema;

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshDto = z.infer<typeof RefreshSchema>;