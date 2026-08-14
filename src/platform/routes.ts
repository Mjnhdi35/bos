import { Router } from "express";
import { type Knex } from "../infrastructure/database/knex";
import { createPlatformHandlers } from "./platform.controller";

export type PlatformRouterDeps = {
  readonly knex: Knex;
};

export function createPlatformRouter(deps: PlatformRouterDeps): Router {
  const router = Router();
  const handlers = createPlatformHandlers(deps.knex);

  router.post("/platform/entities", handlers.registerEntity);
  router.get("/platform/entities", handlers.listEntities);
  router.get("/platform/entities/:name/v/:version", handlers.getEntityVersion);
  router.get("/platform/entities/:name", handlers.getEntity);
  router.delete("/platform/entities/:name/v/:version", handlers.deleteEntity);
  router.post("/platform/data/:entity", handlers.createRecord);
  router.get("/platform/data/:entity", handlers.listRecords);
  router.get("/platform/data/:entity/:id", handlers.readRecord);
  router.patch("/platform/data/:entity/:id", handlers.updateRecord);
  router.delete("/platform/data/:entity/:id", handlers.deleteRecord);

  return router;
}
