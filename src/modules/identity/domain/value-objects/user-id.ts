export type UserId = string & { readonly __brand: 'UserId' };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toUserId(value: string): UserId {
  if (!UUID_RE.test(value)) {
    throw new InvalidUserIdError(value);
  }
  return value as UserId;
}

export class InvalidUserIdError extends Error {
  constructor(value: string) {
    super(`Invalid user id: ${value}`);
    this.name = 'InvalidUserIdError';
  }
}
