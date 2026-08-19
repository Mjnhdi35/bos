import type { Request, Response } from "express";
import type { ExtendedEntityDefinition } from "../../../platform/runtime";
import type { EntityRuntime } from "../../../platform/entity-runtime";
import { asyncHandler } from "../../../shared/http";
import { notFound } from "../errors";

/**
 * Handlers for the application-list endpoints:
 *
 *   GET /api/applications
 *   GET /api/applications/:applicationId
 *   GET /api/applications/:applicationId/entities
 *
 * The generic API returns metadata about every application registered
 * with the runtime, regardless of which entities the application owns.
 * The response carries applicationId + entityName in entity
 * definitions so consumers do not have to back-derive scope.
 */

export function createApplicationHandlers(runtime: EntityRuntime) {
  return {
    listApplications: asyncHandler((_req: Request, res: Response): void => {
      const apps = runtime.listApplications().map((a: { name: string; version: number; description?: string; entities: readonly string[] }) => ({
        name: a.name,
        version: a.version,
        ...(a.description !== undefined ? { description: a.description } : {}),
        entities: [...a.entities],
      }));
      res.json({ data: apps });
    }),

    getApplication: asyncHandler((req: Request, res: Response): void => {
      const applicationId = req.params["applicationId"];
      if (typeof applicationId !== "string" || applicationId.length === 0) {
        throw notFound("application not found", "application_not_found");
      }
      const app = runtime.getApplication(applicationId);
      if (!app) {
        throw notFound(
          `application '${applicationId}' is not registered`,
          "application_not_found",
        );
      }
      res.json({
        data: {
          name: app.name,
          version: app.version,
          ...(app.description !== undefined ? { description: app.description } : {}),
          entities: [...app.entities],
        },
      });
    }),

    listEntities: asyncHandler((req: Request, res: Response): void => {
      const applicationId = req.params["applicationId"];
      if (typeof applicationId !== "string" || applicationId.length === 0) {
        throw notFound("application not found", "application_not_found");
      }
      const app = runtime.getApplication(applicationId);
      if (!app) {
        throw notFound(
          `application '${applicationId}' is not registered`,
          "application_not_found",
        );
      }
      res.json({ data: [...app.entities] });
    }),
  };
}

/**
 * Build the serialisable definition payload (carries applicationId +
 * entityName + fields + relations + workflow + permissions).
 *
 * This lives next to the application handlers because both the
 * applications router and the records router use it.
 */
export function serializeDefinition(
  applicationId: string,
  def: ExtendedEntityDefinition,
): Record<string, unknown> {
  return {
    applicationId,
    entityName: def.name,
    version: def.version,
    fields: def.fields.map((f) => ({ ...f })),
    relations: (def.relations ?? []).map((r) => ({ ...r })),
    workflow: def.workflow ?? null,
    permissions: (def.permissions ?? []).map((p) => ({ ...p })),
  };
}