import { z } from "zod";

export const FieldTypeSchema = z.enum([
  "string",
  "text",
  "number",
  "decimal",
  "boolean",
  "timestamp",
  "json",
  "enum",
  "array",
]);

const BaseFieldSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "must match /^[a-z][a-z0-9_]*$/"),
  required: z.boolean(),
});

export const FieldDefSchema = z.discriminatedUnion("type", [
  BaseFieldSchema.extend({
    type: z.literal("string"),
    maxLength: z.number().int().positive().optional(),
  }),
  BaseFieldSchema.extend({ type: z.literal("text") }),
  BaseFieldSchema.extend({ type: z.literal("number") }),
  BaseFieldSchema.extend({
    type: z.literal("decimal"),
    precision: z.number().int().positive().optional(),
    scale: z.number().int().nonnegative().optional(),
  }),
  BaseFieldSchema.extend({ type: z.literal("boolean") }),
  BaseFieldSchema.extend({ type: z.literal("timestamp") }),
  BaseFieldSchema.extend({ type: z.literal("json") }),
  BaseFieldSchema.extend({
    type: z.literal("enum"),
    values: z.array(z.string().min(1)).min(1),
    maxLength: z.number().int().positive().optional(),
  }),
  BaseFieldSchema.extend({
    type: z.literal("array"),
    items: z.object({
      type: z.enum([
        "string",
        "text",
        "number",
        "decimal",
        "boolean",
        "timestamp",
        "json",
      ]),
    }),
  }),
]);

export const EntityDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "must match /^[a-z][a-z0-9_]*$/"),
  version: z.number().int().min(1),
  fields: z.array(FieldDefSchema).min(1),
});

export const RecordInputSchema = z.record(z.string(), z.unknown());

export const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export function metadataToDto(md: EntityMetadataLike): EntityMetadataDto {
  return {
    name: md.name,
    version: md.version,
    fields: md.fields as unknown[],
    is_system: md.isSystem,
    created_at: md.createdAt.toISOString(),
    updated_at: md.updatedAt.toISOString(),
  };
}

type EntityMetadataLike = {
  name: string;
  version: number;
  fields: readonly unknown[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type EntityMetadataDto = {
  name: string;
  version: number;
  fields: unknown[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
};
