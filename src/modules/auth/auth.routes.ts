import { Router } from "express";
import type { AuthRuntime } from "./auth.runtime";
import { createAuthController } from "./auth.controller";
import { createAuthMiddleware } from "./auth.middleware";

export function createAuthRouter(auth: AuthRuntime): Router {
  const router = Router();
  const ctl = createAuthController({ auth });
  const mw = createAuthMiddleware(auth);

  router.post("/auth/register", ctl.registerHandler);
  router.post("/auth/login", ctl.loginHandler);
  router.post("/auth/refresh", ctl.refreshHandler);
  router.post("/auth/logout", ctl.logoutHandler);
  router.get("/auth/me", mw.authenticate, ctl.meHandler);

  return router;
}