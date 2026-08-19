/**
 * In-memory event bus for the prototype.
 *
 * Uniform identity: every event carries an `applicationId` so handlers
 * can route by application. The bus is synchronous in the prototype;
 * a future implementation may back this with a real broker.
 */

import type { EntityEvent, EntityEventKind } from "./runtime";

export type EventHandler<TPayload = unknown> = (
  _event: EntityEvent<TPayload>,
) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<EntityEventKind, Set<EventHandler>>();

  on<TPayload>(kind: EntityEventKind, handler: EventHandler<TPayload>): void {
    let set = this.handlers.get(kind);
    if (!set) {
      set = new Set();
      this.handlers.set(kind, set);
    }
    set.add(handler as EventHandler);
  }

  off(kind: EntityEventKind, handler: EventHandler): void {
    this.handlers.get(kind)?.delete(handler);
  }

  async publish<TPayload>(event: EntityEvent<TPayload>): Promise<void> {
    const set = this.handlers.get(event.kind);
    if (!set) return;
    for (const handler of set) {
      await handler(event);
    }
  }
}
