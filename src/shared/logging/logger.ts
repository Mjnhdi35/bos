import pino, { type Logger, type LoggerOptions } from "pino";
import { env } from "../config/env";

const isTest = env.NODE_ENV === "test" || process.env.VITEST === "true";
const isProduction = env.NODE_ENV === "production";

const options: LoggerOptions = {
  level: isTest ? "error" : env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.token",
      "*.secret",
      "*.apiKey",
      "*.api_key",
    ],
    censor: "[REDACTED]",
  },
  base: {
    service: "bos",
    env: env.NODE_ENV,
  },
  ...(!isProduction && !isTest
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
};

export const logger: Logger = pino(options);
