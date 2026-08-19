/**
 * Workflow definition — a small state-machine declared in metadata.
 *
 * The runtime's `WorkflowEngine` interprets these definitions. The engine
 * itself is metadata-driven; it has no opinion on what "Order.fulfill"
 * means. Domain-specific guards (e.g. "Order can only ship if payment is
 * captured") are registered by name and invoked before the transition
 * is applied.
 */

export type WorkflowState = string;
export type WorkflowAction = string;

export type WorkflowTransition = {
  readonly from: WorkflowState;
  readonly to: WorkflowState;
  readonly action: WorkflowAction;
  /** Optional guard name registered in the WorkflowEngine. */
  readonly guard?: string;
};

export type WorkflowDef = {
  /** Initial state assigned to a record on create. */
  readonly initial: WorkflowState;
  /** All reachable states. */
  readonly states: readonly WorkflowState[];
  /** Allowed transitions. */
  readonly transitions: readonly WorkflowTransition[];
  /** Field that stores the current state. Defaults to "state". */
  readonly stateField?: string;
};

export function workflowStateField(def: WorkflowDef): string {
  return def.stateField ?? "state";
}

export const DEFAULT_WORKFLOW_STATE_FIELD = "state";
