/**
 * Supplier domain extension — wires workflow guards for the supplier
 * approval workflow declared on `Supplier`. This is an example of
 * how the platform handles domain-specific lifecycle rules without
 * baking them into the runtime itself.
 */

import type { EntityRuntime } from "../platform/entity-runtime";

export function registerSupplierExtensions(runtime: EntityRuntime): void {
  // No additional guards registered at prototype stage.
  void runtime;
}