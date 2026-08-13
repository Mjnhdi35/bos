import { type Knex } from "../../../../infrastructure/database/knex";
import { type CreateRefreshTokenInput, type RefreshTokenRecord, type RefreshTokenRepository } from "../../domain/repositories/refresh-token-repository";
import { type RefreshTokenHash } from "../../domain/token-service";
import { type UserId, toUserId } from "../../domain/value-objects/user-id";

type RefreshTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
};

function rowToRecord(row: RefreshTokenRow): RefreshTokenRecord {
  return {
    id: row.id,
    userId: toUserId(row.user_id),
    tokenHash: row.token_hash as RefreshTokenHash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

export function createPostgresRefreshTokenRepository(db: Knex): RefreshTokenRepository {
  return {
    async create(input: CreateRefreshTokenInput) {
      const [row] = await db<RefreshTokenRow>("refresh_tokens")
        .insert({
          user_id: input.userId,
          token_hash: input.tokenHash,
          expires_at: input.expiresAt,
        })
        .returning("*");
      if (!row) throw new Error("Refresh token insert returned no row");
      return rowToRecord(row);
    },
    async findByTokenHash(hash: RefreshTokenHash) {
      const row = await db<RefreshTokenRow>("refresh_tokens")
        .where({ token_hash: hash })
        .first();
      return row ? rowToRecord(row) : null;
    },
    async revokeByTokenHash(hash: RefreshTokenHash) {
      return db<RefreshTokenRow>("refresh_tokens")
        .where({ token_hash: hash })
        .whereNull("revoked_at")
        .update({ revoked_at: new Date() });
    },
    async deleteByTokenHash(hash: RefreshTokenHash) {
      return db<RefreshTokenRow>("refresh_tokens")
        .where({ token_hash: hash })
        .delete();
    },
    async revokeAllForUser(userId: UserId) {
      return db<RefreshTokenRow>("refresh_tokens")
        .where({ user_id: userId })
        .whereNull("revoked_at")
        .update({ revoked_at: new Date() });
    },
  };
}
