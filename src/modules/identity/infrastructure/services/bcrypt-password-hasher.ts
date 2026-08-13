import bcrypt from "bcrypt";
import { type PasswordHasher } from "../../domain/password-hasher";
import { type PasswordHash, toPasswordHash } from "../../domain/value-objects/password-hash";

const BCRYPT_COST = 12;

export function createBcryptPasswordHasher(): PasswordHasher {
  return {
    async hash(plain: string): Promise<PasswordHash> {
      return toPasswordHash(await bcrypt.hash(plain, BCRYPT_COST));
    },
    async verify(plain: string, hash: PasswordHash): Promise<boolean> {
      return bcrypt.compare(plain, hash);
    },
  };
}
