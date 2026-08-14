import { Router } from "express";
import { type Knex } from "../infrastructure/database/knex";
import { createPlatformHandlers } from "./platform.controller";

export type PlatformRouterDeps = {
  readonly knex: Knex;
};

export function createPlatformRouter(deps: PlatformRouterDeps): Router {
  const router = Router();
  const handlers = createPlatformHandlers(deps.knex);

  router.post("/entities", handlers.registerEntity);
  router.get("/entities", handlers.listEntities);
  router.get("/entities/:name/v/:version", handlers.getEntityVersion);
  router.get("/entities/:name", handlers.getEntity);
  router.delete("/entities/:name/v/:version", handlers.deleteEntity);
  router.post("/data/:entity", handlers.createRecord);
  router.get("/data/:entity", handlers.listRecords);
  router.get("/data/:entity/:id", handlers.readRecord);
  router.patch("/data/:entity/:id", handlers.updateRecord);
  router.delete("/data/:entity/:id", handlers.deleteRecord);

  return router;
}
