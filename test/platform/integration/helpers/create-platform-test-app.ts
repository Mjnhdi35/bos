import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { logger } from "../../../../src/shared/logging/logger";
import { db } from "../../../../src/infrastructure/database/knex";
import { HttpError } from "../../../../src/shared/errors";
import { createPlatformRouter } from "../../../../src/platform/routes";

export function createPlatformTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(
    (req, _res, next) => {
      (req as { log?: unknown }).log = logger;
      next();
    },
  );
  app.use("/platform", createPlatformRouter({ knex: db }));
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

export async function cleanupPlatformTables(): Promise<void> {
  const systemTables = [
    "knex_migrations",
    "schema_meta",
    "users",
    "refresh_tokens",
    "platform_entities",
  ];
  const result = await db.raw<{ rows: { tablename: string }[] }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );
  for (const row of result.rows) {
    if (!systemTables.includes(row.tablename)) {
      await db.schema.dropTableIfExists(row.tablename);
    }
  }
  await db("platform_entities").delete();
}