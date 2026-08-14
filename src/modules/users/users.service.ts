import { db } from "../../infrastructure/database/knex";
import { hashPassword } from "../../shared/bcrypt";
import { HttpError } from "../../shared/errors";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  created_at: Date;
  updated_at: Date;
};

export type User = {
  id: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
};

export type UserCredential = User & {
  passwordHash: string;
};

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createUser(input: {
  email: string;
  password: string;
}): Promise<User> {
  const existing = await db<UserRow>("users")
    .where({ email: input.email })
    .first();
  if (existing) throw new HttpError(409, "email_taken");

  const passwordHash = await hashPassword(input.password);
  const [row] = await db<UserRow>("users")
    .insert({
      email: input.email,
      password_hash: passwordHash,
      role: "user",
    })
    .returning(["id", "email", "role", "created_at", "updated_at"]);
  if (!row) throw new Error("user insert returned no row");
  return rowToUser(row as UserRow);
}

export async function findByEmail(email: string): Promise<UserCredential | null> {
  const row = await db<UserRow>("users").where({ email }).first();
  if (!row) return null;
  return { ...rowToUser(row), passwordHash: row.password_hash };
}

export async function findById(id: string): Promise<User> {
  const row = await db<UserRow>("users").where({ id }).first();
  if (!row) throw new HttpError(401, "invalid_token");
  return rowToUser(row);
}