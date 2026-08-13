import { Router } from "express";
import { type PasswordHasher } from "../../domain/password-hasher";
import { type RefreshTokenRepository } from "../../domain/repositories/refresh-token-repository";
import { type UserRepository } from "../../domain/repositories/user-repository";
import { type TokenService } from "../../domain/token-service";
import { makeLoginController } from "./controllers/login.controller";
import { makeLogoutController } from "./controllers/logout.controller";
import { makeMeController } from "./controllers/me.controller";
import { makeRefreshController } from "./controllers/refresh.controller";
import { makeRegisterController } from "./controllers/register.controller";
import { makeAuthenticateMiddleware } from "./middleware/authenticate.middleware";

export type IdentityRouterDeps = {
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly tokenService: TokenService;
  readonly refreshTokenRepository: RefreshTokenRepository;
};

export function createIdentityRouter(deps: IdentityRouterDeps): Router {
  const router = Router();
  const authenticate = makeAuthenticateMiddleware({
    tokenService: deps.tokenService,
  });

  router.post("/register", makeRegisterController(deps));
  router.post("/login", makeLoginController(deps));
  router.post("/refresh", makeRefreshController(deps));
  router.post("/logout", makeLogoutController(deps));
  router.get("/me", authenticate, makeMeController(deps));
  return router;
}