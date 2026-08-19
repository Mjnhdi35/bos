/**
 * CMS domain extension — extends the Landing Page (CMS) application
 * with workflow guards and editorial handlers.
 */

import type { EntityRuntime } from "../platform/entity-runtime";
import type { ApplicationDefinition } from "../platform/runtime-index";
import { LANDING_PAGE_APPLICATION } from "../applications/landing-page";

export const CMS_APPLICATION: ApplicationDefinition = LANDING_PAGE_APPLICATION;

export function registerCmsExtensions(runtime: EntityRuntime): void {
  // Reserved for CMS-specific guards. The Landing Page workflow is
  // intentionally simple (submit / reject / publish / archive) and
  // does not require any guard wiring at this stage.
  void runtime;
}