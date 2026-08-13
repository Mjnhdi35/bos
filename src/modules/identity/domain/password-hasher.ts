import { type PasswordHash } from './value-objects/password-hash';

export interface PasswordHasher {
  hash(_plain: string): Promise<PasswordHash>;
  verify(_plain: string, _hash: PasswordHash): Promise<boolean>;
}
