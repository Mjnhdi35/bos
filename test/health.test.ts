import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp, buildRuntime, type AppRuntime } from "../src/app/create-app";

function makeChainable(): unknown {
  const fn = (): unknown => makeChainable();
  const obj = Object.assign(fn, {
    then: (resolve: (_v: unknown) => void): void => {
      resolve([]);
    },
    catch: (resolve: (_v: unknown) => void): void => {
      resolve(undefined);
    },
    orderBy: () => makeChainable(),
    where: () => makeChainable(),
    first: () => makeChainable(),
    returning: () => makeChainable(),
    insert: () => makeChainable(),
    update: () => makeChainable(),
    delete: () => makeChainable(),
    select: () => makeChainable(),
    count: () => makeChainable(),
    jsonb: () => makeChainable(),
  });
  return obj;
}

function makeStubKnex(opts: {
  rawImpl?: (..._args: unknown[]) => unknown;
} = {}): unknown {
  const stub: Record<string, unknown> = {
    fn: { now: (): Date => new Date() },
    raw: opts.rawImpl ?? ((): { rows: unknown[] } => ({ rows: [] })),
  };
  const target = function (): unknown {
    return makeChainable();
  } as unknown as Record<string, unknown>;
  for (const k of Object.keys(stub)) {
    Object.defineProperty(target, k, {
      value: stub[k],
      enumerable: true,
      configurable: true,
    });
  }
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(t, prop) {
      if (typeof prop === "string" && prop in t) {
        return t[prop];
      }
      return makeChainable();
    },
  };
  return new Proxy(target, handler);
}

async function makeRuntimeWithKnex(rawImpl?: (..._args: unknown[]) => unknown): Promise<AppRuntime> {
  const rt = await buildRuntime();
  const stubKnex = makeStubKnex(rawImpl ? { rawImpl } : {});
  return {
    ...rt,
    persistence: {
      kind: "postgres",
      knex: stubKnex as never,
      repository: rt.persistence?.repository ?? (undefined as never),
    },
  };
}

describe("GET /health", () => {
  it("returns ok status", async () => {
    const app = await createApp({ runtime: await buildRuntime() });
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("GET /health/db", () => {
  it("returns 200 when DB is reachable", async () => {
    const raw = vi.fn().mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
    const app = await createApp({ runtime: await makeRuntimeWithKnex(raw) });
    const response = await request(app).get("/health/db").expect(200);
    expect(response.body).toEqual({ status: "ok", database: "postgres" });
    expect(raw).toHaveBeenCalledWith("SELECT 1");
  });

  it("returns 503 when DB is unreachable", async () => {
    const raw = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection refused"));
    const app = await createApp({ runtime: await makeRuntimeWithKnex(raw) });
    const response = await request(app).get("/health/db").expect(503);
    expect(response.body).toEqual({ status: "error", database: "postgres" });
  });
});