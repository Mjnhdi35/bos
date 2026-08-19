/**
 * System metadata bootstrap.
 *
 * The runtime is metadata-driven; the `system` application is the
 * FIRST example of "the platform itself is just an application". The
 * bootstrap function registers User + Session metadata with the
 * runtime so they can be served by the same generic path as any
 * other domain entity.
 *
 * Idempotent: safe to call multiple times.
 */

import type { EntityRuntime } from "./runtime-index";
import { registerApplication } from "./application";

export const SYSTEM_APPLICATION_NAME = "system";

const SYSTEM_ENTITIES = [
  {
    name: "User",
    version: 1,
    fields: [
      { name: "email", type: "string", required: true, maxLength: 255 },
      { name: "password_hash", type: "string", required: true, maxLength: 255 },
      {
        name: "role",
        type: "enum",
        required: true,
        values: ["user", "admin"],
      },
    ],
  },
  {
    name: "Session",
    version: 1,
    fields: [
      { name: "user_id", type: "string", required: true, maxLength: 64 },
      { name: "token_hash", type: "string", required: true, maxLength: 128 },
      { name: "expires_at", type: "timestamp", required: true },
      { name: "revoked_at", type: "timestamp", required: false },
    ],
    relations: [
      {
        name: "user",
        kind: "many-to-one" as const,
        target: "User",
        required: true,
      },
    ],
  },
];

export function bootstrapSystemMetadata(runtime: EntityRuntime): void {
  const existing = runtime.getApplication(SYSTEM_APPLICATION_NAME);
  if (existing) {
    return;
  }
  registerApplication(runtime, {
    name: SYSTEM_APPLICATION_NAME,
    version: 1,
    description:
      "Platform-managed identity resources (User, Session). Materialised by the runtime at startup; do not redefine.",
    entities: SYSTEM_ENTITIES,
  });
}
