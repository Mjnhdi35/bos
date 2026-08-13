import express, { type Express, type NextFunction, type Request, type Response } from "express";
import pinoHttp from "pino-http";
import { type Logger } from "pino";
import { db as defaultDb, type Knex } from "../infrastructure/database/knex";
import { logger as defaultLogger } from "../shared/logging/logger";
import { env } from "../shared/config/env";
import { createIdentityRouter } from "../modules/identity/interface/http/routes";
import { createPostgresUserRepository } from "../modules/identity/infrastructure/persistence/postgres-user-repository";
import { createPostgresRefreshTokenRepository } from "../modules/identity/infrastructure/persistence/postgres-refresh-token-repository";
import { createBcryptPasswordHasher } from "../modules/identity/infrastructure/services/bcrypt-password-hasher";
import { createJwtTokenService } from "../modules/identity/infrastructure/services/jwt-token-service";
import { createPlatformRouter } from "../platform/routes";
import { loadSnapshot } from "../platform/snapshot";

export type AppOptions = {
  db?: Knex;
  logger?: Logger;
  jwtSecret?: string;
  snapshotPath?: string;
};

const DEFAULT_SNAPSHOT_PATH = "bootstrap/snapshot.json";

export async function createApp(options: AppOptions = {}): Promise<Express> {
  const db = options.db ?? defaultDb;
  const log = options.logger ?? defaultLogger;
  const jwtSecret = options.jwtSecret ?? env.JWT_SECRET;
  const snapshotPath = options.snapshotPath ?? DEFAULT_SNAPSHOT_PATH;

  const userRepository = createPostgresUserRepository(db);
  const refreshTokenRepository = createPostgresRefreshTokenRepository(db);
  const passwordHasher = createBcryptPasswordHasher();
  const tokenService = createJwtTokenService({
    secret: jwtSecret,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
  });

  // bootstrap snapshot (only when platform_entities is empty)
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

  app.use(
    "/identity",
    createIdentityRouter({
      userRepository,
      passwordHasher,
      tokenService,
      refreshTokenRepository,
    }),
  );

  app.use("/platform", createPlatformRouter({ knex: db }));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    log.error({ err: err.message, stack: err.stack }, "unhandled error");
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  });

  return app;
}
