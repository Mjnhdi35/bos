export class EntityAlreadyExistsError extends Error {
  constructor(name: string, version: number) {
    super(`Entity already exists: ${name} v${String(version)}`);
    this.name = "EntityAlreadyExistsError";
  }
}

export class EntityNotFoundError extends Error {
  constructor(name: string, version?: number) {
    super(
      version === undefined
        ? `Entity not found: ${name}`
        : `Entity not found: ${name} v${String(version)}`,
    );
    this.name = "EntityNotFoundError";
  }
}

export class SchemaMaterializationError extends Error {
  constructor(message: string) {
    super(`Schema materialization failed: ${message}`);
    this.name = "SchemaMaterializationError";
  }
}

export class EntityDataError extends Error {
  constructor(message: string) {
    super(`Entity data error: ${message}`);
    this.name = "EntityDataError";
  }
}
