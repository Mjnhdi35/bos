/**
 * createApp — wires the Express application for BOS.
 *
 * Phase 5+ architecture:
 *   - The runtime (EntityRuntime + EventBus + AuditService + WorkflowEngine)
 *     is constructed once and shared across every route.
 *   - `bootstrapSystemMetadata` registers the `system` application
 *     (User + Session) with the runtime.
 *   - `registerApplication` registers every other application
 *     (`landing_page_backend`, `smoothie_store`, etc.).
 *   - The generic API is mounted at `/api`. The auth router mounts
 *     `/auth/*`. The error middleware translates HttpError → JSON.
 *
 * The function supports an `AppOptions.runtime` knob so tests can
 * inject a custom-built runtime (in-memory, Postgres, MySQL).
 */

import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import pinoHttp from "pino-http";
import { type Logger } from "pino";
import { logger as defaultLogger } from "../shared/logging/logger";
import { HttpError } from "../shared/errors";
import { mountGenericApi } from "../api/generic/router";
import { createAuthRouter } from "../modules/auth/auth.routes";
import { AuthRuntime } from "../modules/auth/auth.runtime";
import { bootstrapSystemMetadata } from "../platform/system-bootstrap";
import { registerApplication } from "../platform/application";
import { createPersistence, type PersistenceHandle } from "../platform/persistence/persistence-factory";
import {
  AuditService,
  EntityRuntime,
  EventBus,
  InMemoryAuditStore,
  WorkflowEngine,
} from "../platform/runtime-index";
import type { ActorProvider } from "../platform/entity-runtime";
import { SYSTEM_APPLICATION } from "../applications/system";
import { LANDING_PAGE_APPLICATION } from "../applications/landing-page";
import { SMOOTHIE_STORE_APPLICATION } from "../applications/smoothie-store";

export type AppRuntime = {
  readonly runtime: EntityRuntime;
  readonly events: EventBus;
  readonly audit: AuditService;
  readonly auditStore: InMemoryAuditStore;
  readonly workflow: WorkflowEngine;
  readonly persistence?: PersistenceHandle;
  readonly auth: AuthRuntime;
};

export type AppOptions = {
  readonly logger?: Logger;
  readonly runtime?: AppRuntime;
};

const SYSTEM_ACTOR: ActorProvider = { current: () => "system" };

export async function createApp(options: AppOptions = {}): Promise<Express> {
  const log = options.logger ?? defaultLogger;
  const built = options.runtime ?? (await buildRuntime());

  const app = express();
  // Express 5 default query parser is "simple" which drops bracket notation;
  // the generic API requires "extended" (qs) for `filter[field_op]=value`.
  app.set("query parser", "extended");
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger: log }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/db", async (_req, res) => {
    if (!built.persistence || built.persistence.kind === "inmemory") {
      res.json({ status: "ok", database: "inmemory" });
      return;
    }
    try {
      const k = built.persistence.knex;
      if (!k) throw new Error("persistence handle missing knex");
      await k.raw("SELECT 1");
      res.json({ status: "ok", database: built.persistence.kind });
    } catch {
      res.status(503).json({ status: "error", database: built.persistence.kind });
    }
  });

  app.use(createAuthRouter(built.auth));
  app.use("/api", mountGenericApi(built.runtime));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      log.warn(
        { err: err.message, status: err.status, code: err.code },
        "request failed",
      );
      if (!res.headersSent) {
        const body: { error: string; message?: string } = { error: err.code };
        if (err.message !== err.code) body.message = err.message;
        res.status(err.status).json(body);
      }
      return;
    }
    log.error({ err: err.message, stack: err.stack }, "unhandled error");
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  });

  return app;
}

export function buildRuntime(
  actor: ActorProvider = SYSTEM_ACTOR,
): Promise<AppRuntime> {
  const events = new EventBus();
  const auditStore = new InMemoryAuditStore();
  const audit = new AuditService(auditStore);
  const workflow = new WorkflowEngine();

  const persistence = createPersistence();
  const runtime = new EntityRuntime(
    persistence.repository,
    events,
    audit,
    workflow,
    actor,
  );

  bootstrapSystemMetadata(runtime);
  registerApplication(runtime, SYSTEM_APPLICATION);
  registerApplication(runtime, LANDING_PAGE_APPLICATION);
  registerApplication(runtime, SMOOTHIE_STORE_APPLICATION);

  const auth = new AuthRuntime({ runtime });

  return Promise.resolve({
    runtime,
    events,
    audit,
    auditStore,
    workflow,
    persistence,
    auth,
  });
}