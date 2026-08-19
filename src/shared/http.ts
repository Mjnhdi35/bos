import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { z } from "zod";
import { HttpError } from "./errors";

/**
 * Wrap an async Express handler so that rejected promises are forwarded
 * to the next error middleware. Express 5 does NOT do this automatically
 * — without `asyncHandler`, an `await` rejection becomes an UnhandledRejection.
 *
 * The inner closure receives the same `(req, res, next)` triple; the
 * outer wrapper is a normal RequestHandler, so we suppress unused-vars
 * for the parameters they must accept by contract.
 */
export function asyncHandler(
  fn: (_req: Request, _res: Response, _next: NextFunction) => Promise<void> | void,
): RequestHandler {
  // Inner closure delegates to the user-supplied handler and forwards
  // rejections to Express' error handler. Parameters are passed by
  // contract; renaming the inner-closure parameters would break the
  // type binding for the user-supplied `fn` callback.
  return (__req, __res, __next) => {
    void Promise.resolve()
      .then(() => fn(__req, __res, __next))
      .catch(__next);
  };
}

/**
 * Parse `req.body` against a zod schema, throwing a 400 HttpError on
 * failure. Keeps validation failure messages opaque at the boundary.
 */
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

/**
 * Read a string path parameter. Throws a 400 HttpError if missing or
 * empty — path params should always be present if the route matched.
 */
export function readParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, "missing_path_param", `path param '${name}' is missing or empty`);
  }
  return value;
}