import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  DATABASE: z
    .enum(["inmemory", "postgres", "mysql"])
    .default("inmemory"),

  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().max(65535).default(5432),
  DB_NAME: z.string().default("bos"),
  DB_USER: z.string().default("bos"),
  DB_PASSWORD: z.string().default(""),

  MYSQL_HOST: z.string().default("localhost"),
  MYSQL_PORT: z.coerce.number().int().positive().max(65535).default(3306),
  MYSQL_DATABASE: z.string().default("bos"),
  MYSQL_USER: z.string().default("bos"),
  MYSQL_PASSWORD: z.string().default(""),
  MYSQL_ROOT_PASSWORD: z.string().default(""),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("info"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 chars")
    .default("dev-only-insecure-jwt-secret-please-change-me-min-32-chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write(
    `Invalid environment variables: ${JSON.stringify(z.treeifyError(parsed.error), null, 2)}\n`,
  );
  process.exit(1);
}

export type Env = z.infer<typeof EnvSchema>;

export const env: Readonly<Env> = Object.freeze(parsed.data);
