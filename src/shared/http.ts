import type { Request } from "express";
import type { z } from "zod";
import { HttpError } from "./errors";

export function parseBody<S extends z.ZodType>(
  schema: S,
  req: Request,
): z.infer<S> {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "invalid_request");
  }
  return parsed.data;
}