/**
 * System application — metadata-only bootstrap for platform-level
 * resources.
 *
 * Phase 6 refactor: identity is no longer a hard-coded `users` table +
 * `refresh_tokens` table + handwritten service. Identity is metadata
 * under the `system` application scope, served by the same
 * `EntityRuntime` + generic API that backs every other domain.
 */

import type {
	ApplicationDefinition,
	ExtendedEntityDefinition,
} from "../platform/runtime-index";

export const SYSTEM_USER_DEFINITION: ExtendedEntityDefinition = {
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
};

export const SYSTEM_SESSION_DEFINITION: ExtendedEntityDefinition = {
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
			kind: "many-to-one",
			target: "User",
			required: true,
		},
	],
};

export const SYSTEM_APPLICATION: ApplicationDefinition = {
	name: "system",
	version: 1,
	description:
		"Platform-managed identity resources (User, Session). Materialised by the runtime at startup; do not redefine.",
	entities: [SYSTEM_USER_DEFINITION, SYSTEM_SESSION_DEFINITION],
};
