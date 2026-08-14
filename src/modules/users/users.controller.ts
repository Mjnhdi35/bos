import { type Request, type Response } from "express";
import { db } from "../../infrastructure/database/knex";
import { hashPassword } from "../../shared/bcrypt";
import { HttpError } from "../../shared/errors";
import { CreateUserRequestSchema } from "./schema";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  created_at: Date;
  updated_at: Date;
};

export async function createUserHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = CreateUserRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await db<UserRow>("users").where({ email }).first();
  if (existing) throw new HttpError(409, "email_taken");

  const passwordHash = await hashPassword(password);
  const [row] = await db<UserRow>("users")
    .insert({ email, password_hash: passwordHash, role: "user" })
    .returning(["id", "email", "created_at", "updated_at"]);

  if (!row) {
    throw new Error("user insert returned no row");
  }

  res.status(201).json({
    id: row.id,
    email: row.email,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });
}
