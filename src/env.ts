import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "Invalid environment variables:",
    JSON.stringify(z.treeifyError(parsed.error), null, 2),
  );
  process.exit(1);
}

export type Env = z.infer<typeof EnvSchema>;

export const env: Readonly<Env> = Object.freeze(parsed.data);
