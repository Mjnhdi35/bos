import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { logger } from "../../../../src/shared/logging/logger";
import { db } from "../../../../src/infrastructure/database/knex";
import { createIdentityRouter } from "../../../../src/modules/identity/interface/http/routes";
import { createPostgresUserRepository } from "../../../../src/modules/identity/infrastructure/persistence/postgres-user-repository";
import { createPostgresRefreshTokenRepository } from "../../../../src/modules/identity/infrastructure/persistence/postgres-refresh-token-repository";
import { createBcryptPasswordHasher } from "../../../../src/modules/identity/infrastructure/services/bcrypt-password-hasher";
import { createJwtTokenService } from "../../../../src/modules/identity/infrastructure/services/jwt-token-service";

const TEST_JWT_SECRET =
  "test-only-secret-test-only-secret-test-only-secret-32plus";

export function createIdentityTestApp(): Express {
  const userRepository = createPostgresUserRepository(db);
  const refreshTokenRepository = createPostgresRefreshTokenRepository(db);
  const passwordHasher = createBcryptPasswordHasher();
  const tokenService = createJwtTokenService({
    secret: TEST_JWT_SECRET,
    accessTtl: "15m",
    refreshTtl: "30d",
  });

  const app = express();
  app.use(express.json());
  app.use(
    (req, _res, next) => {
      (req as { log?: unknown }).log = logger;
      next();
    },
  );
  app.use(
    "/identity",
    createIdentityRouter({
      userRepository,
      passwordHasher,
      tokenService,
      refreshTokenRepository,
    }),
  );
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: err.message, stack: err.stack }, "unhandled error");
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  });
  return app;
}

export async function cleanupIdentityTables(): Promise<void> {
  await db("refresh_tokens").delete();
  await db("users").delete();
}
