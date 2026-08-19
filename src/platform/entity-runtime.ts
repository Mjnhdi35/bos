/**
 * EntityRuntime — the heart of the metadata-driven platform.
 *
 * Single runtime serves ALL entities for ALL registered applications.
 * The runtime has NO knowledge of any specific domain; it operates
 * entirely on metadata. Application isolation is enforced by the
 * `(applicationId, entityName)` identity on every operation.
 *
 * Responsibilities:
 * - register/lookup EntityDefinition under (applicationId, entityName)
 * - CRUD via repository, validating against metadata before each write
 * - emit lifecycle events (entity.created/updated/deleted)
 * - record audit entries
 * - apply workflow transitions
 *
 * Domain code calls:
 *   runtime.register("alpha", ArticleDefinition)
 *   runtime.create({ applicationId: "alpha", entityName: "Article" }, data)
 *   runtime.query({ applicationId: "alpha", entityName: "Article" }, args)
 *   runtime.transition({ applicationId: "alpha", entityName: "Article" }, id, "publish")
 *
 * For ergonomic per-application access:
 *   const alpha = runtime.scopedTo("alpha")
 *   alpha.create("Article", data)
 *
 * The runtime does NOT know what an "Article", "Product" or "Lead" is.
 */

import type {
  EntityRef,
  EntityRepository,
  EntityRecord,
} from "./repository";
import type {
  AuditEntry,
  ExtendedEntityDefinition,
  QueryCondition,
  QueryResult,
  QuerySort,
  WorkflowAction,
} from "./runtime";
import {
  RuntimeError,
  CrossApplicationRelationError,
  compileDefinition,
  entityRefKey,
  refOf,
  relationForeignKeyName,
  workflowStateField,
} from "./runtime";
import { EventBus } from "./event-bus";
import { AuditService, type AuditFilter } from "./audit";
import { WorkflowEngine, WorkflowError } from "./workflow";
import {
  validateRecord,
  ValidatorRegistry,
  type ValidationContext,
} from "./validator";

export type EntityRecordWithId = EntityRecord & { id: string };

export interface ActorProvider {
  current(): string;
}

export class ScopedEntityRuntime {
  private readonly parent: EntityRuntime;
  private readonly applicationId: string;

  constructor(
    parent: EntityRuntime,
    applicationId: string,
  ) {
    this.parent = parent;
    this.applicationId = applicationId;
  }

  get appId(): string {
    return this.applicationId;
  }

  ref(entityName: string): EntityRef {
    return refOf(this.applicationId, entityName);
  }

  getDefinition(entityName: string): ExtendedEntityDefinition | null {
    return this.parent.getDefinition(this.ref(entityName));
  }

  get eventBus(): EventBus {
    return this.parent.eventBus;
  }

  get workflowEngine(): WorkflowEngine {
    return this.parent.workflowEngine;
  }

  get validatorRegistry(): ValidatorRegistry {
    return this.parent.validatorRegistry;
  }

  register(
    raw: Readonly<Record<string, unknown>> | ExtendedEntityDefinition,
  ): ExtendedEntityDefinition {
    return this.parent.register(this.applicationId, raw);
  }

  listEntities(): readonly string[] {
    return this.parent.listEntities(this.applicationId);
  }

  async create(entityName: string, data: Readonly<Record<string, unknown>>): Promise<string> {
    return this.parent.create(this.ref(entityName), data);
  }

  async findById(entityName: string, id: string): Promise<EntityRecord | null> {
    return this.parent.findById(this.ref(entityName), id);
  }

  async update(entityName: string, id: string, data: Readonly<Record<string, unknown>>): Promise<void> {
    return this.parent.update(this.ref(entityName), id, data);
  }

  async delete(entityName: string, id: string): Promise<void> {
    return this.parent.delete(this.ref(entityName), id);
  }

  async query(
    entityName: string,
    args?: {
      readonly filter?: QueryCondition;
      readonly sort?: readonly QuerySort[];
      readonly page?: number;
      readonly limit?: number;
    },
  ): Promise<QueryResult<EntityRecord>> {
    return this.parent.query(this.ref(entityName), args);
  }

  async transition(entityName: string, id: string, action: WorkflowAction): Promise<string> {
    return this.parent.transition(this.ref(entityName), id, action);
  }

  async auditTrail(entityName: string, entityId: string): Promise<readonly AuditEntry[]> {
    return this.parent.auditTrail(this.ref(entityName), entityId);
  }
}

export class EntityRuntime {
  private readonly definitions = new Map<string, ExtendedEntityDefinition>();
  private readonly idCounters = new Map<string, number>();
  private readonly repo: EntityRepository;
  private readonly events: EventBus;
  private readonly audit: AuditService;
  private readonly workflow: WorkflowEngine;
  private readonly actor: ActorProvider;
  private readonly validators: ValidatorRegistry;
  private readonly applications = new Map<
    string,
    {
      readonly name: string;
      readonly version: number;
      readonly description?: string;
      readonly entities: readonly string[];
    }
  >();

  constructor(
    repo: EntityRepository,
    events: EventBus,
    audit: AuditService,
    workflow: WorkflowEngine,
    actor: ActorProvider,
    validators: ValidatorRegistry = new ValidatorRegistry(),
  ) {
    this.repo = repo;
    this.events = events;
    this.audit = audit;
    this.workflow = workflow;
    this.actor = actor;
    this.validators = validators;
  }

  register(
    applicationId: string,
    raw: Readonly<Record<string, unknown>> | ExtendedEntityDefinition,
  ): ExtendedEntityDefinition {
    const isPreCompiled = (x: unknown): x is ExtendedEntityDefinition => {
      if (typeof x !== "object" || x === null) return false;
      if (!("fields" in x)) return false;
      return Array.isArray((x as Record<string, unknown>).fields);
    };
    const def: ExtendedEntityDefinition = isPreCompiled(raw)
      ? raw
      : compileDefinition(raw);

    const key = entityRefKey({ applicationId, entityName: def.name });
    const existing = this.definitions.get(key);
    if (existing) {
      if (existing.version === def.version) {
        return existing;
      }
      throw new RuntimeError(
        `entity '${def.name}' for application '${applicationId}' already registered at version ${String(existing.version)}; cannot re-register at version ${String(def.version)}`,
      );
    }
    this.definitions.set(key, def);
    return def;
  }

  getDefinition(ref: EntityRef): ExtendedEntityDefinition | null {
    return this.definitions.get(entityRefKey(ref)) ?? null;
  }

  listEntities(applicationId?: string): readonly string[] {
    if (applicationId === undefined) {
      return [...this.definitions.keys()];
    }
    const prefix = `${applicationId}/`;
    return [...this.definitions.keys()]
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }

  scopedTo(applicationId: string): ScopedEntityRuntime {
    return new ScopedEntityRuntime(this, applicationId);
  }

  trackApplication(meta: {
    readonly name: string;
    readonly version: number;
    readonly description?: string;
    readonly entities: readonly string[];
  }): void {
    const existing = this.applications.get(meta.name);
    if (existing) {
      if (existing.version === meta.version) {
        const next = { ...existing, ...meta };
        this.applications.set(meta.name, next);
        return;
      }
      throw new RuntimeError(
        `application '${meta.name}' already tracked at version ${String(existing.version)}; cannot re-track at version ${String(meta.version)}`,
      );
    }
    this.applications.set(meta.name, { ...meta });
  }

  listApplications(): readonly {
    readonly name: string;
    readonly version: number;
    readonly description?: string;
    readonly entities: readonly string[];
  }[] {
    return [...this.applications.values()];
  }

  getApplication(applicationId: string): {
    readonly name: string;
    readonly version: number;
    readonly description?: string;
    readonly entities: readonly string[];
  } | null {
    return this.applications.get(applicationId) ?? null;
  }

  async create(
    ref: EntityRef,
    data: Readonly<Record<string, unknown>>,
  ): Promise<string> {
    const def = this.requireDef(ref);
    const id = this.nextId(ref);

    const preSystemRecord = { id, ...data } as EntityRecordWithId;
    await this.validate(def, preSystemRecord, ref);
    await this.checkRelations(def, preSystemRecord, ref);

    const systemFields: Record<string, unknown> = {};
    if (def.workflow) {
      const stateField = workflowStateField(def.workflow);
      systemFields[stateField] = def.workflow.initial;
    }
    const record: EntityRecord = {
      id,
      ...data,
      ...systemFields,
    };

    await this.repo.insert(ref, record);

    const who = this.actor.current();
    await this.audit.recordCreate(who, ref.applicationId, ref.entityName, id, record);
    await this.events.publish({
      kind: "entity.created",
      applicationId: ref.applicationId,
      entity: ref.entityName,
      entityId: id,
      payload: record,
      timestamp: new Date().toISOString(),
    });

    return id;
  }

  async findById(ref: EntityRef, id: string): Promise<EntityRecord | null> {
    if (!this.definitions.has(entityRefKey(ref))) {
      return null;
    }
    return this.repo.findById(ref, id);
  }

  async update(
    ref: EntityRef,
    id: string,
    data: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const def = this.requireDef(ref);
    const before = await this.repo.findById(ref, id);
    if (!before) {
      throw new RuntimeError(
        `record '${id}' not found in ${entityRefKey(ref)}`,
      );
    }
    const after = { ...before, ...data } as EntityRecord;

    await this.validate(def, after, ref);
    await this.checkRelations(def, after, ref);

    await this.repo.update(ref, id, after);

    const who = this.actor.current();
    await this.audit.recordUpdate(
      who,
      ref.applicationId,
      ref.entityName,
      id,
      before,
      after,
    );
    await this.events.publish({
      kind: "entity.updated",
      applicationId: ref.applicationId,
      entity: ref.entityName,
      entityId: id,
      payload: after,
      timestamp: new Date().toISOString(),
    });
  }

  async delete(ref: EntityRef, id: string): Promise<void> {
    this.requireDef(ref);
    const before = await this.repo.findById(ref, id);
    if (!before) {
      throw new RuntimeError(
        `record '${id}' not found in ${entityRefKey(ref)}`,
      );
    }
    await this.repo.delete(ref, id);
    const who = this.actor.current();
    await this.audit.recordDelete(who, ref.applicationId, ref.entityName, id, before);
    await this.events.publish({
      kind: "entity.deleted",
      applicationId: ref.applicationId,
      entity: ref.entityName,
      entityId: id,
      payload: { id },
      timestamp: new Date().toISOString(),
    });
  }

  async query(
    ref: EntityRef,
    args?: {
      readonly filter?: QueryCondition;
      readonly sort?: readonly QuerySort[];
      readonly page?: number;
      readonly limit?: number;
    },
  ): Promise<QueryResult<EntityRecord>> {
    this.requireDef(ref);
    const result = await this.repo.query(ref, args ?? {});
    return {
      items: result.items,
      total: result.total,
      page: args?.page ?? 1,
      limit: args?.limit ?? result.items.length,
    };
  }

  async transition(
    ref: EntityRef,
    id: string,
    action: WorkflowAction,
  ): Promise<string> {
    const def = this.requireDef(ref);
    if (!def.workflow) {
      throw new RuntimeError(
        `entity '${entityRefKey(ref)}' has no workflow defined`,
      );
    }
    const before = await this.repo.findById(ref, id);
    if (!before) {
      throw new RuntimeError(
        `record '${id}' not found in ${entityRefKey(ref)}`,
      );
    }
    const stateField = workflowStateField(def.workflow);
    const fromState = before[stateField];
    if (typeof fromState !== "string") {
      throw new WorkflowError(`record has no string '${stateField}' field`);
    }
    const newState = await this.workflow.transition(def.workflow, before, action);
    const after = { ...before, [stateField]: newState };
    await this.repo.update(ref, id, after);
    const who = this.actor.current();
    await this.audit.recordTransition(
      who,
      ref.applicationId,
      ref.entityName,
      id,
      fromState,
      newState,
    );
    await this.events.publish({
      kind: "workflow.transitioned",
      applicationId: ref.applicationId,
      entity: ref.entityName,
      entityId: id,
      payload: { from: fromState, to: newState, action },
      timestamp: new Date().toISOString(),
    });
    return newState;
  }

  async auditTrail(
    ref: EntityRef,
    entityId: string,
  ): Promise<readonly AuditEntry[]> {
    return this.audit.query({
      applicationId: ref.applicationId,
      entity: ref.entityName,
      entityId,
    });
  }

  queryAudit(filter?: AuditFilter): Promise<readonly AuditEntry[]> {
    return this.audit.query(filter);
  }

  get eventBus(): EventBus {
    return this.events;
  }
  get workflowEngine(): WorkflowEngine {
    return this.workflow;
  }
  get validatorRegistry(): ValidatorRegistry {
    return this.validators;
  }

  private requireDef(ref: EntityRef): ExtendedEntityDefinition {
    const def = this.definitions.get(entityRefKey(ref));
    if (!def) {
      throw new RuntimeError(
        `entity '${ref.entityName}' is not registered for application '${ref.applicationId}'`,
      );
    }
    return def;
  }

  private nextId(ref: EntityRef): string {
    // The counter MUST be keyed by the composite `(applicationId,
    // entityName)` so two applications with the same entity name
    // generate independent id sequences. The id format itself drops
    // the application prefix because the prefix is already encoded
    // in the URL path; including it would collide with the `:id`
    // path param's slashes.
    const key = entityRefKey(ref);
    const next = (this.idCounters.get(key) ?? 0) + 1;
    this.idCounters.set(key, next);
    return `${ref.entityName}_${String(next).padStart(6, "0")}`;
  }

  private async validate(
    def: ExtendedEntityDefinition,
    record: Readonly<Record<string, unknown>>,
    ref: EntityRef,
  ): Promise<void> {
    const ctx: ValidationContext = {
      entity: def.name,
      applicationId: ref.applicationId,
      record,
      exists: async (entityName, id) => {
        return (await this.repo.findById(
          { applicationId: ref.applicationId, entityName },
          id,
        )) !== null;
      },
    };
    await validateRecord(def.fields, record, ctx, this.validators);
  }

  private async checkRelations(
    def: ExtendedEntityDefinition,
    record: Readonly<Record<string, unknown>>,
    ref: EntityRef,
  ): Promise<void> {
    if (!def.relations) return;
    for (const rel of def.relations) {
      const fkName = relationForeignKeyName(rel);
      const fkValue = record[fkName];
      if (fkValue === undefined || fkValue === null) {
        if (rel.required) {
          throw new RuntimeError(
            `relation '${rel.name}' is required but '${fkName}' is missing`,
          );
        }
        continue;
      }
      const fkValueString = typeof fkValue === "string" || typeof fkValue === "number"
        ? String(fkValue)
        : "<unknown>";
      const targetRef: EntityRef = {
        applicationId: ref.applicationId,
        entityName: rel.target,
      };
      const targetDef = this.definitions.get(entityRefKey(targetRef));
      if (!targetDef) {
        throw new CrossApplicationRelationError(
          { applicationId: ref.applicationId, entityName: ref.entityName },
          rel.name,
          rel.target,
          fkValueString,
          `relation '${rel.name}' targets entity '${rel.target}' which is not declared in application '${ref.applicationId}'; cross-application relations are not supported (Phase 4.1 §23)`,
        );
      }
      const exists = await this.repo.findById(targetRef, fkValueString);
      if (!exists) {
        throw new RuntimeError(
          `relation '${rel.name}' FK '${fkValueString}' not found in ${entityRefKey(targetRef)}`,
        );
      }
    }
  }
}

export type { EntityEvent } from "./runtime";
