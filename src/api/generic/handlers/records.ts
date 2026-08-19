import type { Request, Response } from "express";
import type { EntityRuntime } from "../../../platform/entity-runtime";
import { HttpError } from "../../../shared/errors";
import { asyncHandler } from "../../../shared/http";
import {
  CrossApplicationRelationError,
  RuntimeError,
  refOf,
} from "../../../platform/runtime";
import { ValidationError } from "../../../platform/validator";
import { WorkflowError } from "../../../platform/workflow";
import {
  badRequest,
  conflict,
  notFound,
  validationFailed,
} from "../errors";
import { parseBodyQuery, parseUrlQuery } from "../query-parser";
import { serializeDefinition } from "./applications";

/**
 * Handlers for entity CRUD + workflow + audit endpoints.
 *
 * Route shape (canonical):
 *   POST   /api/applications/:applicationId/entities/:entityName
 *   GET    /api/applications/:applicationId/entities/:entityName
 *   POST   /api/applications/:applicationId/entities/:entityName/_query
 *   GET    /api/applications/:applicationId/entities/:entityName/definition
 *   GET    /api/applications/:applicationId/entities/:entityName/:id
 *   PATCH  /api/applications/:applicationId/entities/:entityName/:id
 *   DELETE /api/applications/:applicationId/entities/:entityName/:id
 *   POST   /api/applications/:applicationId/entities/:entityName/:id/transition
 *   POST   /api/applications/:applicationId/entities/:entityName/:id/transition/:action
 *   GET    /api/applications/:applicationId/entities/:entityName/:id/audit
 *
 * The handlers translate runtime exceptions into stable HTTP error
 * codes (see ./errors.ts). They do not import any domain entity.
 */

export function createRecordHandlers(runtime: EntityRuntime) {
  return {
    getDefinition: asyncHandler((req: Request, res: Response): void => {
      const { applicationId, entityName } = readScope(req);
      const def = runtime.getDefinition(refOf(applicationId, entityName));
      if (!def) {
        throw notFound(
          `entity '${entityName}' is not registered in application '${applicationId}'`,
          "entity_not_found",
        );
      }
      res.json({ data: serializeDefinition(applicationId, def) });
    }),

    createRecord: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      if (!isPlainObject(req.body)) {
        throw badRequest("request body must be a JSON object", "invalid_body");
      }
      try {
        const id = await runtime.create(refOf(applicationId, entityName), req.body);
        const created = await runtime.findById(refOf(applicationId, entityName), id);
        res.status(201).json({ data: created ?? { id, ...req.body } });
      } catch (e) {
        throw translateError(e);
      }
    }),

    listRecords: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      const query = parseUrlQuery(req.query);
      try {
        const result = await runtime.query(refOf(applicationId, entityName), query);
        res.json({
          data: result.items,
          meta: {
            total: result.total,
            page: result.page,
            limit: result.limit,
          },
        });
      } catch (e) {
        throw translateError(e);
      }
    }),

    queryRecords: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      const query = parseBodyQuery(req.body);
      try {
        const result = await runtime.query(refOf(applicationId, entityName), query);
        res.json({
          data: result.items,
          meta: {
            total: result.total,
            page: result.page,
            limit: result.limit,
          },
        });
      } catch (e) {
        throw translateError(e);
      }
    }),

    getRecord: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      const id = readId(req);
      try {
        const record = await runtime.findById(refOf(applicationId, entityName), id);
        if (!record) {
          throw notFound(
            `record '${id}' not found in ${applicationId}/${entityName}`,
            "record_not_found",
          );
        }
        res.json({ data: record });
      } catch (e) {
        throw translateError(e);
      }
    }),

    updateRecord: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      const id = readId(req);
      if (!isPlainObject(req.body)) {
        throw badRequest("request body must be a JSON object", "invalid_body");
      }
      try {
        await runtime.update(refOf(applicationId, entityName), id, req.body);
        const updated = await runtime.findById(refOf(applicationId, entityName), id);
        res.json({ data: updated });
      } catch (e) {
        throw translateError(e);
      }
    }),

    deleteRecord: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      const id = readId(req);
      try {
        await runtime.delete(refOf(applicationId, entityName), id);
        res.status(204).end();
      } catch (e) {
        throw translateError(e);
      }
    }),

    /**
     * Transition via body — body may carry `{ transition }` or
     * `{ action }`. Phase 6 keeps both forms for backward compatibility.
     */
    transitionActionBody: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      const id = readId(req);
      if (!isPlainObject(req.body)) {
        throw badRequest("request body must be a JSON object", "invalid_body");
      }
      const action = readActionFromBody(req.body);
      try {
        const newState = await runtime.transition(
          refOf(applicationId, entityName),
          id,
          action,
        );
        const updated = await runtime.findById(refOf(applicationId, entityName), id);
        res.json({ data: updated, meta: { from: null, to: newState, action } });
      } catch (e) {
        throw translateError(e);
      }
    }),

    /**
     * Transition via path param — canonical form
     * `POST /entities/:id/transition/:action`.
     */
    transitionAction: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      const id = readId(req);
      const action = req.params["action"];
      if (typeof action !== "string" || action.length === 0) {
        throw badRequest("path param 'action' is missing", "missing_action");
      }
      try {
        const newState = await runtime.transition(
          refOf(applicationId, entityName),
          id,
          action,
        );
        const updated = await runtime.findById(refOf(applicationId, entityName), id);
        res.json({ data: updated, meta: { from: null, to: newState, action } });
      } catch (e) {
        throw translateError(e);
      }
    }),

    auditTrail: asyncHandler(async (req: Request, res: Response) => {
      const { applicationId, entityName } = readScope(req);
      const id = readId(req);
      const entries = await runtime.auditTrail(refOf(applicationId, entityName), id);
      res.json({ data: entries });
    }),
  };
}

// ---------------------------------------------------------------------------
// Local helpers — kept inline because they are only meaningful for the
// generic API record handlers.
// ---------------------------------------------------------------------------

function readScope(req: Request): { applicationId: string; entityName: string } {
  const applicationId = req.params["applicationId"];
  const entityName = req.params["entityName"];
  if (typeof applicationId !== "string" || applicationId.length === 0) {
    throw badRequest("path param 'applicationId' is missing");
  }
  if (typeof entityName !== "string" || entityName.length === 0) {
    throw badRequest("path param 'entityName' is missing");
  }
  return { applicationId, entityName };
}

function readId(req: Request): string {
  const id = req.params["id"];
  if (typeof id !== "string" || id.length === 0) {
    throw badRequest("path param 'id' is missing");
  }
  return id;
}

function readActionFromBody(body: Record<string, unknown>): string {
  const direct = body["action"];
  if (typeof direct === "string" && direct.length > 0) return direct;
  const wrapped = body["transition"];
  if (typeof wrapped === "string" && wrapped.length > 0) return wrapped;
  if (isPlainObject(wrapped)) {
    const action = wrapped["action"];
    if (typeof action === "string" && action.length > 0) return action;
  }
  throw badRequest(
    "request body must include either 'action' (string) or 'transition' (string or { action })",
    "missing_action",
  );
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function translateError(e: unknown): HttpError {
  if (e instanceof HttpError) return e;
  if (e instanceof ValidationError) {
    return validationFailed(e.message);
  }
  if (e instanceof WorkflowError) {
    return conflict(e.message, "workflow_conflict");
  }
  if (e instanceof CrossApplicationRelationError) {
    return new HttpError(409, e.code, e.message);
  }
  if (e instanceof RuntimeError) {
    return new HttpError(e.status, e.code, e.message);
  }
  if (e instanceof Error) {
    return new HttpError(500, "internal_error", e.message);
  }
  return new HttpError(500, "internal_error", String(e));
}