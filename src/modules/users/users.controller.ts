import { type Request, type Response } from "express";
import { parseBody } from "../../shared/http";
import { CreateUserRequestSchema } from "./schema";
import { createUser } from "./users.service";

export async function createUserHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const data = parseBody(CreateUserRequestSchema, req);
  const user = await createUser(data);
  res.status(201).json(user);
}
