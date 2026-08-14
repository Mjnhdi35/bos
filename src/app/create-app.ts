import express, { type Express, type NextFunction, type Request, type Response } from "express";
import pinoHttp from "pino-http";
import { type Logger } from "pino";
import { db as defaultDb, type Knex } from "../infrastructure/database/knex";
import { logger as defaultLogger } from "../shared/logging/logger";
import { HttpError } from "../shared/errors";
import { createAuthRouter } from "../modules/auth/auth.routes";
import { createPlatformRouter } from "../platform/routes";
import { createUsersRouter } from "../modules/users/routes";
import { loadSnapshot } from "../platform/snapshot";

export type AppOptions = {
  db?: Knex;
  logger?: Logger;
  snapshotPath?: string;
};

const DEFAULT_SNAPSHOT_PATH = "bootstrap/snapshot.json";

export async function createApp(options: AppOptions = {}): Promise<Express> {
  const db = options.db ?? defaultDb;
  const log = options.logger ?? defaultLogger;
  const snapshotPath = options.snapshotPath ?? DEFAULT_SNAPSHOT_PATH;

  const snapshotResult = await loadSnapshot(db, snapshotPath);
  if (snapshotResult.loaded > 0) {
    log.info({ loaded: snapshotResult.loaded }, "platform snapshot applied");
  }

  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger: log }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/db", async (_req, res) => {
    try {
      await db.raw("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch {
      res.status(503).json({ status: "error", database: "unreachable" });
    }
  });

  app.use("/users", createUsersRouter());
  app.use("/identity", createAuthRouter());
  app.use("/platform", createPlatformRouter({ knex: db }));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      log.warn({ err: err.message, status: err.status, code: err.code }, "request failed");
      if (!res.headersSent) {
        res.status(err.status).json({ error: err.code });
      }
      return;
    }
    log.error({ err: err.message, stack: err.stack }, "unhandled error");
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  });

  return app;
}