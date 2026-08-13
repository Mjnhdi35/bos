import { type Knex } from "../../../../infrastructure/database/knex";
import { User } from "../../domain/entities/user";
import { type CreateUserInput, type UserRepository } from "../../domain/repositories/user-repository";
import { Email } from "../../domain/value-objects/email";
import { toPasswordHash } from "../../domain/value-objects/password-hash";
import { toUserId } from "../../domain/value-objects/user-id";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  created_at: Date;
  updated_at: Date;
};

function rowToUser(row: UserRow): User {
  return User.rehydrate({
    id: toUserId(row.id),
    email: Email.create(row.email),
    passwordHash: toPasswordHash(row.password_hash),
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function createPostgresUserRepository(db: Knex): UserRepository {
  return {
    async findById(id) {
      const row = await db<UserRow>("users").where({ id }).first();
      return row ? rowToUser(row) : null;
    },
    async findByEmail(email) {
      const row = await db<UserRow>("users")
        .whereRaw("LOWER(email) = LOWER(?)", [email.value])
        .first();
      return row ? rowToUser(row) : null;
    },
    async create(input: CreateUserInput) {
      const [row] = await db<UserRow>("users")
        .insert({
          email: input.email.value,
          password_hash: input.passwordHash,
          role: input.role ?? "user",
        })
        .returning("*");
      if (!row) throw new Error("User insert returned no row");
      return rowToUser(row);
    },
  };
}
