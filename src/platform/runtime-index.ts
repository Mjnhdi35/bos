/**
 * Public exports for the metadata-driven platform runtime.
 */

export * from "./domain/field-type";
export * from "./domain/field-def";
export * from "./domain/relation-def";
export * from "./domain/workflow-def";
export * from "./domain/definition";
export {
  type ExtendedEntityDefinition,
  type RelationDef,
  type RelationKind,
  type WorkflowDef,
  type WorkflowTransition,
  type WorkflowState,
  type WorkflowAction,
  type PermissionDef,
  type QueryOperator,
  type QueryCondition,
  type QuerySort,
  type QueryPagination,
  type QueryDef,
  type QueryResult,
  type EntityEvent,
  type EntityEventKind,
  type AuditEntry,
  type EntityRef,
  compileDefinition,
  entityRefKey,
  refOf,
  isEntityRef,
  relationForeignKeyName,
  workflowStateField,
  DEFAULT_WORKFLOW_STATE_FIELD,
  RuntimeError,
  CrossApplicationRelationError,
} from "./runtime";
export {
  type EntityRecord,
  type EntityRepository,
  InMemoryRepository,
} from "./repository";
export { EventBus, type EventHandler } from "./event-bus";
export {
  type AuditStore,
  type AuditFilter,
  InMemoryAuditStore,
  AuditService,
} from "./audit";
export {
  WorkflowEngine,
  WorkflowError,
  type GuardFn,
} from "./workflow";
export {
  ValidatorRegistry,
  ValidationError,
  validateRecord,
  type ValidatorFn,
  type ValidationContext,
} from "./validator";
export {
  EntityRuntime,
  ScopedEntityRuntime,
  type ActorProvider,
} from "./entity-runtime";
export {
  type ApplicationDefinition,
  type CompiledApplication,
  compileApplication,
  registerApplication,
} from "./application";
