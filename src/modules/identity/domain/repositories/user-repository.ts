import { type User } from '../entities/user';
import { type Email } from '../value-objects/email';
import { type PasswordHash } from '../value-objects/password-hash';
import { type UserId } from '../value-objects/user-id';

export type CreateUserInput = {
  email: Email;
  passwordHash: PasswordHash;
  role?: 'user' | 'admin';
};

export interface UserRepository {
  findById(_id: UserId): Promise<User | null>;
  findByEmail(_email: Email): Promise<User | null>;
  create(_input: CreateUserInput): Promise<User>;
}
