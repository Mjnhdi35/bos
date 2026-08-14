import { type Request, type Response } from "express";
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
import {
  EntityDefinitionSchema,
  ListQuerySchema,
  RecordInputSchema,
  metadataToDto,
} from "./schemas";

function readEntityName(req: Request, res: Response): string | null {
  const name = req.params.entity ?? req.params.name;
  if (typeof name !== "string" || name.length === 0) {
    res.status(400).json({ error: "invalid_request" });
    return null;
  }
  return name;
}

function readEntityId(req: Request, res: Response): string | null {
  const id = req.params.id;
  if (typeof id !== "string" || id.length === 0) {
    res.status(400).json({ error: "invalid_request" });
    return null;
  }
  return id;
}

function readVersion(req: Request, res: Response): number | null {
  const versionParam = req.params.version;
  if (typeof versionParam !== "string" || versionParam.length === 0) {
    res.status(400).json({ error: "invalid_version" });
    return null;
  }
  const version = Number.parseInt(versionParam, 10);
  if (!Number.isFinite(version) || version < 1) {
    res.status(400).json({ error: "invalid_version" });
    return null;
  }
  return version;
}

export function createPlatformHandlers(k: Knex) {
  return {
    registerEntity: async (req: Request, res: Response): Promise<void> => {
      const parsed = EntityDefinitionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_definition" });
        return;
      }
      const md = await registerEntity(k, parsed.data);
      res.status(201).json(metadataToDto(md));
    },

    listEntities: async (_req: Request, res: Response): Promise<void> => {
      const all = await listEntities(k);
      res.status(200).json({ entities: all.map(metadataToDto) });
    },

    getEntityVersion: async (req: Request, res: Response): Promise<void> => {
      const name = readEntityName(req, res);
      if (name === null) return;
      const version = readVersion(req, res);
      if (version === null) return;
      const md = await getEntity(k, name, version);
      res.status(200).json(metadataToDto(md));
    },

    getEntity: async (req: Request, res: Response): Promise<void> => {
      const name = readEntityName(req, res);
      if (name === null) return;
      const md = await getEntity(k, name);
      res.status(200).json(metadataToDto(md));
    },

    deleteEntity: async (req: Request, res: Response): Promise<void> => {
      const name = readEntityName(req, res);
      if (name === null) return;
      const version = readVersion(req, res);
      if (version === null) return;
      await deleteEntity(k, name, version);
      res.status(204).end();
    },

    createRecord: async (req: Request, res: Response): Promise<void> => {
      const entityName = readEntityName(req, res);
      if (entityName === null) return;
      const parsed = RecordInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_input" });
        return;
      }
      const record = await createRecord(k, entityName, parsed.data);
      res.status(201).json(record);
    },

    listRecords: async (req: Request, res: Response): Promise<void> => {
      const entityName = readEntityName(req, res);
      if (entityName === null) return;
      const parsedQuery = ListQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        res.status(400).json({ error: "invalid_query" });
        return;
      }
      const limit = parsedQuery.data.limit ?? 100;
      const offset = parsedQuery.data.offset ?? 0;
      const records = await listAllRecords(k, entityName, { limit, offset });
      res.status(200).json({ records, limit, offset });
    },

    readRecord: async (req: Request, res: Response): Promise<void> => {
      const entityName = readEntityName(req, res);
      if (entityName === null) return;
      const id = readEntityId(req, res);
      if (id === null) return;
      const record = await readRecord(k, entityName, id);
      res.status(200).json(record);
    },

    updateRecord: async (req: Request, res: Response): Promise<void> => {
      const entityName = readEntityName(req, res);
      if (entityName === null) return;
      const id = readEntityId(req, res);
      if (id === null) return;
      const parsed = RecordInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_input" });
        return;
      }
      const record = await updateOneRecord(k, entityName, id, parsed.data);
      res.status(200).json(record);
    },

    deleteRecord: async (req: Request, res: Response): Promise<void> => {
      const entityName = readEntityName(req, res);
      if (entityName === null) return;
      const id = readEntityId(req, res);
      if (id === null) return;
      await deleteOneRecord(k, entityName, id);
      res.status(204).end();
    },
  };
}
