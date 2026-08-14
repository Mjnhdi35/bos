import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { logger } from "../../../../src/shared/logging/logger";
import { HttpError } from "../../../../src/shared/errors";
import { createUsersRouter } from "../../../../src/modules/users/routes";

export function createUsersTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/users", createUsersRouter());
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.code });
      return;
    }
    logger.error({ err: err.message, stack: err.stack }, "unhandled error");
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  });
  return app;
}

export async function cleanupUsersTable(): Promise<void> {
  const { db } = await import("../../../../src/infrastructure/database/knex");
  await db("users").delete();
}