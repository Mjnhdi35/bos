import { Router } from "express";
import { authenticate } from "./auth.middleware";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from "./auth.controller";

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/auth/register", registerHandler);
  router.post("/auth/login", loginHandler);
  router.post("/auth/refresh", refreshHandler);
  router.post("/auth/logout", logoutHandler);
  router.get("/auth/me", authenticate, meHandler);

  return router;
}
