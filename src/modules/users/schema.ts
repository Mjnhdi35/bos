import { z } from "zod";
import { CredentialSchema } from "../../shared/credential";

export const CreateUserRequestSchema = CredentialSchema;
export type CreateUserRequestDto = z.infer<typeof CreateUserRequestSchema>;
