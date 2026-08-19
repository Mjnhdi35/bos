/**
 * Landing Page Backend — a metadata-only application.
 *
 * Demonstrates that a complete CRUD + publishing backend can be
 * constructed from metadata alone, with no handwritten Controller,
 * Service, or Repository for the entity.
 */

import type {
	ApplicationDefinition,
	ExtendedEntityDefinition,
} from "../platform/runtime-index";

export const LANDING_PAGE_DEFINITION: ExtendedEntityDefinition = {
	name: "LandingPage",
	version: 1,
	fields: [
		{ name: "title", type: "string", required: true, maxLength: 200 },
		{ name: "slug", type: "string", required: true, maxLength: 200 },
		{ name: "hero", type: "text", required: false },
		{ name: "content", type: "text", required: true },
		{ name: "seo_title", type: "string", required: false, maxLength: 200 },
		{ name: "seo_description", type: "string", required: false, maxLength: 500 },
		{ name: "published", type: "boolean", required: true },
	],
	workflow: {
		initial: "draft",
		states: ["draft", "review", "published", "archived"],
		transitions: [
			{ from: "draft", to: "review", action: "submit" },
			{ from: "review", to: "draft", action: "reject" },
			{ from: "review", to: "published", action: "publish" },
			{ from: "published", to: "archived", action: "archive" },
			{ from: "archived", to: "draft", action: "restore" },
		],
	},
};

export const LANDING_PAGE_APPLICATION: ApplicationDefinition = {
	name: "landing_page_backend",
	version: 1,
	description:
		"Metadata-only CMS backend for marketing landing pages. Single entity (LandingPage) with editorial workflow and SEO fields.",
	entities: [LANDING_PAGE_DEFINITION],
};
