import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { logger } from "../../../../src/shared/logging/logger";
import { HttpError } from "../../../../src/shared/errors";
import { createAuthRouter } from "../../../../src/modules/auth/auth.routes";

export function createAuthTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    (req, _res, next) => {
      (req as { log?: unknown }).log = logger;
      next();
    },
  );
  app.use(createAuthRouter());
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      logger.warn({ err: err.message, status: err.status, code: err.code }, "request failed");
      if (!res.headersSent) {
        const body: { error: string; message?: string } = { error: err.code };
        if (err.message !== err.code) body.message = err.message;
        res.status(err.status).json(body);
      }
      return;
    }
    logger.error({ err: err.message, stack: err.stack }, "unhandled error");
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  });
  return app;
}

export async function cleanupAuthTables(): Promise<void> {
  const { db } = await import("../../../../src/infrastructure/database/knex");
  await db("refresh_tokens").delete();
  await db("users").delete();
}