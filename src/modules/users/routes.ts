import { Router } from "express";
import { createUserHandler } from "./users.controller";

export function createUsersRouter(): Router {
  const router = Router();
  router.post("/users", createUserHandler);
  return router;
}
