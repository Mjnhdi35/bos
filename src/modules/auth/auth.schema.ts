import { z } from "zod";
import { CredentialSchema } from "../../shared/credential";

export const RegisterSchema = CredentialSchema;

export const LoginSchema = z.object({
  email: z.string().min(1).max(255),
  password: z.string().min(1).max(72),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
