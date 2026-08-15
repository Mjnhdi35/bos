import bcrypt from "bcrypt";

// Defense in depth: reject inputs that bcrypt would otherwise silently
// mis-handle (truncation at 72 bytes, empty hash, non-bcrypt format).
const COST = 12;
const MAX_PASSWORD_BYTES = 72;
const BCRYPT_HASH_PREFIX = /^\$2[abxy]?\$/;

/**
 * Hash a plaintext password using bcrypt with cost factor 12.
 *
 * Defense in depth (BOS-IDENTITY-002 audit):
 * - Empty / non-string inputs are rejected explicitly with a specific error
 *   message (instead of letting bcrypt throw with a less specific error).
 * - Inputs longer than 72 bytes are rejected explicitly. bcrypt would
 *   otherwise silently truncate at 72 bytes, which can mask caller bugs.
 *   Callers should enforce a max-length contract at the schema layer
 *   (see `src/shared/credential.ts`).
 *
 * Cost factor 12 is the OWASP-recommended minimum for production bcrypt
 * deployments. Revisit if hardware baselines change significantly.
 */
export async function hashPassword(plain: unknown): Promise<string> {
  if (typeof plain !== "string") {
    throw new TypeError("password must be a string");
  }
  if (plain.length === 0) {
    throw new Error("password must not be empty");
  }
  if (Buffer.byteLength(plain, "utf8") > MAX_PASSWORD_BYTES) {
    throw new Error(
      `password must not exceed ${String(MAX_PASSWORD_BYTES)} bytes when UTF-8 encoded`,
    );
  }
  return bcrypt.hash(plain, COST);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 *
 * Behavior (BOS-IDENTITY-002 audit):
 * - Returns false (does NOT throw) for malformed hashes, empty inputs, or
 *   non-string inputs. This prevents enumeration of valid hash formats via
 *   exception types or timing differences.
 * - Uses bcrypt.compare internally, which performs timing-safe comparison.
 */
export async function verifyPassword(
  plain: unknown,
  hash: unknown,
): Promise<boolean> {
  if (typeof plain !== "string" || plain.length === 0) return false;
  if (typeof hash !== "string" || hash.length === 0) return false;
  if (!BCRYPT_HASH_PREFIX.test(hash)) return false;
  return bcrypt.compare(plain, hash);
}
