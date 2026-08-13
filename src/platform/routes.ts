import { Router, type Request, type Response, type NextFunction } from "express";
import { type Knex } from "../infrastructure/database/knex";
import {
  createRecord,
  deleteEntity,
  deleteOneRecord,
  getEntity,
  listAllRecords,
  listEntities,
  readRecord,
  registerEntity,
  updateOneRecord,
} from "./entity-service";
import { metadataToDto, EntityDefinitionSchema, ListQuerySchema, RecordInputSchema } from "./schemas";
import {
  EntityAlreadyExistsError,
  EntityDataError,
  EntityNotFoundError,
  SchemaMaterializationError,
} from "./domain/errors";
import { InvalidDefinitionError } from "./domain/definition";
import { InvalidFieldDefError } from "./domain/field-def";

export type PlatformRouterDeps = {
  readonly knex: Knex;
};

export function createPlatformRouter(deps: PlatformRouterDeps): Router {
  const router = Router();
  const k = deps.knex;

  router.post("/entities", async (req, res, next) => {
    const parsed = EntityDefinitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_definition" });
      return;
    }
    try {
      const md = await registerEntity(k, parsed.data);
      res.status(201).json(metadataToDto(md));
    } catch (err) {
      if (
        err instanceof InvalidDefinitionError ||
        err instanceof InvalidFieldDefError
      ) {
        res.status(400).json({ error: "invalid_definition" });
        return;
      }
      if (err instanceof EntityAlreadyExistsError) {
        res.status(409).json({ error: "entity_already_exists" });
        return;
      }
      if (err instanceof SchemaMaterializationError) {
        res.status(500).json({ error: "schema_materialization_failed" });
        return;
      }
      next(err);
    }
  });

  router.get("/entities", async (_req, res, next) => {
    try {
      const all = await listEntities(k);
      res.status(200).json({ entities: all.map(metadataToDto) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/entities/:name/v/:version", async (req, res, next) => {
    const name = req.params.name;
    const versionParam = req.params.version;
    if (typeof name !== "string" || name.length === 0) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    if (typeof versionParam !== "string" || versionParam.length === 0) {
      res.status(400).json({ error: "invalid_version" });
      return;
    }
    const version = Number.parseInt(versionParam, 10);
    if (!Number.isFinite(version) || version < 1) {
      res.status(400).json({ error: "invalid_version" });
      return;
    }
    try {
      const md = await getEntity(k, name, version);
      res.status(200).json(metadataToDto(md));
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        res.status(404).json({ error: "entity_not_found" });
        return;
      }
      next(err);
    }
  });

  router.get("/entities/:name", async (req, res, next) => {
    const name = req.params.name;
    if (typeof name !== "string" || name.length === 0) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      const md = await getEntity(k, name);
      res.status(200).json(metadataToDto(md));
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        res.status(404).json({ error: "entity_not_found" });
        return;
      }
      next(err);
    }
  });

  router.delete("/entities/:name/v/:version", async (req, res, next) => {
    const name = req.params.name;
    const versionParam = req.params.version;
    if (typeof name !== "string" || name.length === 0) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    if (typeof versionParam !== "string" || versionParam.length === 0) {
      res.status(400).json({ error: "invalid_version" });
      return;
    }
    const version = Number.parseInt(versionParam, 10);
    if (!Number.isFinite(version) || version < 1) {
      res.status(400).json({ error: "invalid_version" });
      return;
    }
    try {
      await deleteEntity(k, name, version);
      res.status(204).end();
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        res.status(404).json({ error: "entity_not_found" });
        return;
      }
      next(err);
    }
  });

  router.post("/data/:entity", async (req, res, next) => {
    const entityName = req.params.entity;
    if (typeof entityName !== "string" || entityName.length === 0) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    const parsed = RecordInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    try {
      const record = await createRecord(k, entityName, parsed.data);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof EntityDataError) {
        res.status(400).json({ error: "invalid_input", message: err.message });
        return;
      }
      if (err instanceof EntityNotFoundError) {
        res.status(404).json({ error: "entity_not_found" });
        return;
      }
      next(err);
    }
  });

  router.get("/data/:entity", async (req, res, next) => {
    const entityName = req.params.entity;
    if (typeof entityName !== "string" || entityName.length === 0) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    const parsedQuery = ListQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }
    const limit = parsedQuery.data.limit ?? 100;
    const offset = parsedQuery.data.offset ?? 0;
    try {
      const records = await listAllRecords(k, entityName, { limit, offset });
      res.status(200).json({ records, limit, offset });
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        res.status(404).json({ error: "entity_not_found" });
        return;
      }
      next(err);
    }
  });

  router.get("/data/:entity/:id", async (req, res, next) => {
    const entityName = req.params.entity;
    const id = req.params.id;
    if (
      typeof entityName !== "string" ||
      entityName.length === 0 ||
      typeof id !== "string" ||
      id.length === 0
    ) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      const record = await readRecord(k, entityName, id);
      res.status(200).json(record);
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      next(err);
    }
  });

  router.patch("/data/:entity/:id", async (req, res, next) => {
    const entityName = req.params.entity;
    const id = req.params.id;
    if (
      typeof entityName !== "string" ||
      entityName.length === 0 ||
      typeof id !== "string" ||
      id.length === 0
    ) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    const parsed = RecordInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    try {
      const record = await updateOneRecord(k, entityName, id, parsed.data);
      res.status(200).json(record);
    } catch (err) {
      if (err instanceof EntityDataError) {
        res.status(400).json({ error: "invalid_input", message: err.message });
        return;
      }
      if (err instanceof EntityNotFoundError) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      next(err);
    }
  });

  router.delete("/data/:entity/:id", async (req, res, next) => {
    const entityName = req.params.entity;
    const id = req.params.id;
    if (
      typeof entityName !== "string" ||
      entityName.length === 0 ||
      typeof id !== "string" ||
      id.length === 0
    ) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      await deleteOneRecord(k, entityName, id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      next(err);
    }
  });

  void ({} as NextFunction);
  void ({} as Request);
  void ({} as Response);

  return router;
}
