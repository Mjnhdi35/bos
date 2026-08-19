/**
 * Ecommerce domain extension — registers workflow guards and any
 * domain-specific handlers against the smoothie-store application.
 *
 * Domain code lives outside the platform so that the platform itself
 * remains metadata-driven. The runtime calls this once at startup.
 */

import type { EntityRuntime } from "../platform/entity-runtime";
import type { ActorProvider } from "../platform/entity-runtime";
import type { ApplicationDefinition } from "../platform/runtime-index";
import { SMOOTHIE_STORE_APPLICATION } from "../applications/smoothie-store";

export const ECOMMERCE_APPLICATION: ApplicationDefinition = SMOOTHIE_STORE_APPLICATION;

/**
 * Wire workflow guards (e.g. "Order can only ship if payment captured")
 * onto the runtime. Idempotent.
 */
export function registerEcommerceExtensions(
  runtime: EntityRuntime,
  _actor: ActorProvider,
): void {
  // Reserved for domain guards/handlers. No metadata-only runtime
  // extensions are needed for the prototype.
  void runtime;
}