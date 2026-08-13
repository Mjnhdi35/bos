import { type RefreshTokenHash } from '../token-service';
import { type UserId } from '../value-objects/user-id';

export type RefreshTokenRecord = {
  id: string;
  userId: UserId;
  tokenHash: RefreshTokenHash;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
};

export type CreateRefreshTokenInput = {
  userId: UserId;
  tokenHash: RefreshTokenHash;
  expiresAt: Date;
};

export interface RefreshTokenRepository {
  create(_input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  findByTokenHash(_hash: RefreshTokenHash): Promise<RefreshTokenRecord | null>;
  revokeByTokenHash(_hash: RefreshTokenHash): Promise<number>;
  deleteByTokenHash(_hash: RefreshTokenHash): Promise<number>;
  revokeAllForUser(_userId: UserId): Promise<number>;
}