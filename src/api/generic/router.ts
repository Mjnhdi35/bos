import { Router } from "express";
import type { EntityRuntime } from "../../platform/entity-runtime";
import { createApplicationHandlers } from "./handlers/applications";
import { createRecordHandlers } from "./handlers/records";

/**
 * Mount the generic API for the metadata-driven runtime.
 *
 * Routes (13):
 *   GET    /api/applications
 *   GET    /api/applications/:applicationId
 *   GET    /api/applications/:applicationId/entities
 *   GET    /api/applications/:applicationId/entities/:entityName/definition
 *   POST   /api/applications/:applicationId/entities/:entityName
 *   GET    /api/applications/:applicationId/entities/:entityName
 *   POST   /api/applications/:applicationId/entities/:entityName/_query
 *   GET    /api/applications/:applicationId/entities/:entityName/:id
 *   PATCH  /api/applications/:applicationId/entities/:entityName/:id
 *   DELETE /api/applications/:applicationId/entities/:entityName/:id
 *   POST   /api/applications/:applicationId/entities/:entityName/:id/transition         (body form)
 *   POST   /api/applications/:applicationId/entities/:entityName/:id/transition/:action (path-param)
 *   GET    /api/applications/:applicationId/entities/:entityName/:id/audit
 *
 * The router carries NO knowledge of any domain. It only depends on
 * the EntityRuntime contract and dispatches to per-entity handlers
 * via metadata.
 */
export function mountGenericApi(runtime: EntityRuntime): Router {
  const router = Router();
  const apps = createApplicationHandlers(runtime);
  const records = createRecordHandlers(runtime);

  router.get("/applications", apps.listApplications);
  router.get("/applications/:applicationId", apps.getApplication);
  router.get("/applications/:applicationId/entities", apps.listEntities);

  router.get(
    "/applications/:applicationId/entities/:entityName/definition",
    records.getDefinition,
  );
  router.post(
    "/applications/:applicationId/entities/:entityName",
    records.createRecord,
  );
  router.get(
    "/applications/:applicationId/entities/:entityName",
    records.listRecords,
  );
  router.post(
    "/applications/:applicationId/entities/:entityName/_query",
    records.queryRecords,
  );
  router.get(
    "/applications/:applicationId/entities/:entityName/:id",
    records.getRecord,
  );
  router.patch(
    "/applications/:applicationId/entities/:entityName/:id",
    records.updateRecord,
  );
  router.delete(
    "/applications/:applicationId/entities/:entityName/:id",
    records.deleteRecord,
  );
  router.post(
    "/applications/:applicationId/entities/:entityName/:id/transition",
    records.transitionActionBody,
  );
  router.post(
    "/applications/:applicationId/entities/:entityName/:id/transition/:action",
    records.transitionAction,
  );
  router.get(
    "/applications/:applicationId/entities/:entityName/:id/audit",
    records.auditTrail,
  );

  return router;
}