/**
 * Runtime setup helper — wires the EntityRuntime with all platform
 * dependencies. Used by tests and by the application entrypoint.
 */

import {
  AuditService,
  EntityRuntime,
  EventBus,
  InMemoryAuditStore,
  InMemoryRepository,
  type ActorProvider,
  WorkflowEngine,
} from "./runtime-index";

export type RuntimeContext = {
  readonly runtime: EntityRuntime;
  readonly repo: InMemoryRepository;
  readonly events: EventBus;
  readonly audit: AuditService;
  readonly auditStore: InMemoryAuditStore;
  readonly workflow: WorkflowEngine;
};

/** Test/system actor — every write is recorded as `who: "system"`. */
export const SYSTEM_ACTOR: ActorProvider = {
  current: () => "system",
};

export function createRuntimeContext(
  actor: ActorProvider = SYSTEM_ACTOR,
): RuntimeContext {
  const repo = new InMemoryRepository();
  const events = new EventBus();
  const auditStore = new InMemoryAuditStore();
  const audit = new AuditService(auditStore);
  const workflow = new WorkflowEngine();
  const runtime = new EntityRuntime(repo, events, audit, workflow, actor);
  return { runtime, repo, events, audit, auditStore, workflow };
}
