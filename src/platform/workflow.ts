/**
 * Workflow engine — drives state transitions declared in metadata.
 *
 * The engine holds no domain knowledge. It accepts a `WorkflowDef` plus a
 * registry of named guard functions (provided by domain code) and applies
 * transitions deterministically. Domain-specific guards (e.g. "Order can
 * only ship if payment is captured") are registered by name and invoked
 * before the transition is applied.
 */

import type { WorkflowDef, WorkflowState, WorkflowAction } from "./runtime";

export type GuardFn = (_record: Readonly<Record<string, unknown>>) => boolean | Promise<boolean>;

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

export class WorkflowEngine {
  private readonly guards = new Map<string, GuardFn>();

  registerGuard(name: string, fn: GuardFn): void {
    if (this.guards.has(name)) {
      throw new WorkflowError(`guard '${name}' already registered`);
    }
    this.guards.set(name, fn);
  }

  nextState(
    workflow: WorkflowDef,
    current: WorkflowState,
    action: WorkflowAction,
  ): WorkflowState | null {
    const t = workflow.transitions.find(
      (tr) => tr.from === current && tr.action === action,
    );
    return t ? t.to : null;
  }

  async transition(
    workflow: WorkflowDef,
    record: Readonly<Record<string, unknown>>,
    action: WorkflowAction,
  ): Promise<WorkflowState> {
    const stateField = workflow.stateField ?? "state";
    const current = record[stateField];
    if (typeof current !== "string") {
      throw new WorkflowError(`record has no string '${stateField}' field`);
    }
    const t = workflow.transitions.find(
      (tr) => tr.from === current && tr.action === action,
    );
    if (!t) {
      throw new WorkflowError(
        `no transition from '${current}' for action '${action}'`,
      );
    }
    if (t.guard) {
      const guard = this.guards.get(t.guard);
      if (!guard) {
        throw new WorkflowError(`guard '${t.guard}' not registered`);
      }
      const ok = await guard(record);
      if (!ok) {
        throw new WorkflowError(
          `guard '${t.guard}' rejected transition '${current}' -> '${t.to}'`,
        );
      }
    }
    return t.to;
  }

  canTransition(
    workflow: WorkflowDef,
    current: WorkflowState,
    action: WorkflowAction,
  ): boolean {
    return this.nextState(workflow, current, action) !== null;
  }
}
