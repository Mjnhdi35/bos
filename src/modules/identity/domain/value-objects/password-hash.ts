export type PasswordHash = string & { readonly __brand: 'PasswordHash' };

export function toPasswordHash(value: string): PasswordHash {
  return value as PasswordHash;
}