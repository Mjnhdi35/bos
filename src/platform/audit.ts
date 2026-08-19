/**
 * Audit service — append-only log of mutations.
 *
 * Every create/update/delete/transition on an entity produces an audit
 * entry. Each entry records `applicationId` so the trail is
 * application-scoped. Querying by `(applicationId, entity)` returns
 * only the entries for that application; an absent `applicationId`
 * filter means "all applications" and is intended for diagnostics
 * only.
 *
 * The audit store is the simplest possible: an in-memory array. A
 * future implementation may back this with an append-only database
 * table or an external service.
 */

import type { AuditEntry } from "./runtime";

export type AuditFilter = {
  readonly applicationId?: string;
  readonly entity?: string;
  readonly entityId?: string;
  readonly who?: string;
};

export interface AuditStore {
  append(_entry: AuditEntry): Promise<void>;
  query(_filter?: AuditFilter): Promise<readonly AuditEntry[]>;
}

export class InMemoryAuditStore implements AuditStore {
  private readonly entries: AuditEntry[] = [];

  append(entry: AuditEntry): Promise<void> {
    this.entries.push({ ...entry });
    return Promise.resolve();
  }

  query(filter?: AuditFilter): Promise<readonly AuditEntry[]> {
    if (!filter) return Promise.resolve(this.entries.slice());
    return Promise.resolve(
      this.entries.filter((e) => {
        if (filter.applicationId && e.applicationId !== filter.applicationId) return false;
        if (filter.entity && e.entity !== filter.entity) return false;
        if (filter.entityId && e.entityId !== filter.entityId) return false;
        if (filter.who && e.who !== filter.who) return false;
        return true;
      }),
    );
  }
}

export class AuditService {
  private readonly store: AuditStore;
  constructor(store: AuditStore) {
    this.store = store;
  }

  query(filter?: AuditFilter): Promise<readonly AuditEntry[]> {
    return this.store.query(filter);
  }

  async recordCreate(
    who: string,
    applicationId: string,
    entity: string,
    entityId: string,
    after: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await this.store.append({
      who,
      applicationId,
      entity,
      entityId,
      operation: "create",
      before: null,
      after,
      timestamp: new Date().toISOString(),
    });
  }

  async recordUpdate(
    who: string,
    applicationId: string,
    entity: string,
    entityId: string,
    before: Readonly<Record<string, unknown>>,
    after: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await this.store.append({
      who,
      applicationId,
      entity,
      entityId,
      operation: "update",
      before,
      after,
      timestamp: new Date().toISOString(),
    });
  }

  async recordDelete(
    who: string,
    applicationId: string,
    entity: string,
    entityId: string,
    before: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await this.store.append({
      who,
      applicationId,
      entity,
      entityId,
      operation: "delete",
      before,
      after: null,
      timestamp: new Date().toISOString(),
    });
  }

  async recordTransition(
    who: string,
    applicationId: string,
    entity: string,
    entityId: string,
    fromState: string,
    toState: string,
  ): Promise<void> {
    await this.store.append({
      who,
      applicationId,
      entity,
      entityId,
      operation: "transition",
      before: { state: fromState },
      after: { state: toState },
      timestamp: new Date().toISOString(),
    });
  }
}
