/**
 * Smoothie Store — a metadata-only Ecommerce application.
 *
 * Demonstrates a complete Ecommerce business app expressed entirely
 * through metadata:
 *
 *   Product   Category   Customer   Order   OrderItem
 *
 * Relations:
 *   Product    → Category       (many-to-one)
 *   Order      → Customer       (many-to-one)
 *   OrderItem  → Order          (many-to-one)
 *   OrderItem  → Product        (many-to-one)
 *
 * For an OPTIONAL domain extension example, see `src/domains/ecommerce.ts`.
 */

import type {
	ApplicationDefinition,
	ExtendedEntityDefinition,
} from "../platform/runtime-index";

export const CATEGORY_DEFINITION: ExtendedEntityDefinition = {
	name: "Category",
	version: 1,
	fields: [
		{ name: "name", type: "string", required: true, maxLength: 64 },
		{ name: "slug", type: "string", required: true, maxLength: 64 },
	],
};

export const PRODUCT_DEFINITION: ExtendedEntityDefinition = {
	name: "Product",
	version: 1,
	fields: [
		{ name: "name", type: "string", required: true, maxLength: 200 },
		{ name: "slug", type: "string", required: true, maxLength: 200 },
		{ name: "description", type: "text", required: false },
		{ name: "price_cents", type: "number", required: true },
		{ name: "stock", type: "number", required: true },
		{ name: "category_id", type: "string", required: true },
	],
	relations: [
		{
			name: "category",
			kind: "many-to-one",
			target: "Category",
			required: true,
		},
	],
};

export const CUSTOMER_DEFINITION: ExtendedEntityDefinition = {
	name: "Customer",
	version: 1,
	fields: [
		{ name: "name", type: "string", required: true, maxLength: 200 },
		{ name: "email", type: "string", required: true, maxLength: 200 },
	],
};

export const ORDER_ITEM_DEFINITION: ExtendedEntityDefinition = {
	name: "OrderItem",
	version: 1,
	fields: [
		{ name: "order_id", type: "string", required: true },
		{ name: "product_id", type: "string", required: true },
		{ name: "quantity", type: "number", required: true },
		{ name: "unit_price_cents", type: "number", required: true },
	],
	relations: [
		{
			name: "order",
			kind: "many-to-one",
			target: "Order",
			required: true,
		},
		{
			name: "product",
			kind: "many-to-one",
			target: "Product",
			required: true,
		},
	],
};

export const ORDER_DEFINITION: ExtendedEntityDefinition = {
	name: "Order",
	version: 1,
	fields: [
		{ name: "customer_id", type: "string", required: true },
		{ name: "total_cents", type: "number", required: true },
	],
	relations: [
		{
			name: "customer",
			kind: "many-to-one",
			target: "Customer",
			required: true,
		},
	],
	workflow: {
		initial: "pending",
		states: ["pending", "paid", "fulfilled", "cancelled"],
		transitions: [
			{ from: "pending", to: "paid", action: "pay" },
			{ from: "paid", to: "fulfilled", action: "fulfill" },
			{ from: "paid", to: "cancelled", action: "cancel" },
			{ from: "pending", to: "cancelled", action: "cancel" },
		],
	},
};

export const SMOOTHIE_STORE_APPLICATION: ApplicationDefinition = {
	name: "smoothie_store",
	version: 1,
	description:
		"Metadata-only Ecommerce backend for a smoothie store. Entities: Product, Category, Customer, Order, OrderItem. Order has a pending → paid → fulfilled workflow.",
	entities: [
		CATEGORY_DEFINITION,
		PRODUCT_DEFINITION,
		CUSTOMER_DEFINITION,
		ORDER_DEFINITION,
		ORDER_ITEM_DEFINITION,
	],
};
