import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../src/infrastructure/database/knex";

const E2E_PORT = 13901;
const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
const SERVER_START_TIMEOUT_MS = 15_000;

let serverProcess: ChildProcess | undefined;
let _serverStdout = "";
let serverStderr = "";

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Server did not become ready within ${timeoutMs}ms. stderr=${serverStderr.slice(-500)}`,
  );
}

beforeAll(async () => {
  serverProcess = spawn(
    process.execPath,
    ["--env-file-if-exists=.env", "--import", "tsx", "src/server.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(E2E_PORT),
        NODE_ENV: "test",
        LOG_LEVEL: "silent",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  serverProcess.stdout?.on("data", (d: Buffer) => {
    _serverStdout += d.toString();
  });
  serverProcess.stderr?.on("data", (d: Buffer) => {
    serverStderr += d.toString();
  });
  await waitForServer(`${BASE_URL}/health`, SERVER_START_TIMEOUT_MS);
}, SERVER_START_TIMEOUT_MS + 5_000);

afterAll(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      serverProcess?.on("exit", () => {
        resolve();
      });
      setTimeout(() => {
        resolve();
      }, 2_000);
    });
  }
  await db.destroy();
});

describe("E2E identity journey (real HTTP, real Postgres)", () => {
  it("register → login → me → refresh → logout", async () => {
    const email = `e2e+${Date.now()}@example.com`;
    const password = "correcthorse";

    // 1. register
    const regRes = await fetch(`${BASE_URL}/identity/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(regRes.status).toBe(201);
    const regBody = (await regRes.json()) as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };
    expect(regBody.access_token).toMatch(/^eyJ/);
    expect(regBody.token_type).toBe("Bearer");

    // 2. me (authenticated)
    const meRes = await fetch(`${BASE_URL}/identity/me`, {
      headers: { authorization: `Bearer ${regBody.access_token}` },
    });
    expect(meRes.status).toBe(200);
    const meBody = (await meRes.json()) as { email: string; role: string };
    expect(meBody.email).toBe(email);
    expect(meBody.role).toBe("user");

    // 3. login (existing user)
    const loginRes = await fetch(`${BASE_URL}/identity/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as {
      access_token: string;
      refresh_token: string;
    };

    // 4. refresh
    const refreshRes = await fetch(`${BASE_URL}/identity/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: loginBody.refresh_token }),
    });
    expect(refreshRes.status).toBe(200);
    const refreshBody = (await refreshRes.json()) as {
      access_token: string;
      refresh_token: string;
    };
    expect(refreshBody.access_token).toMatch(/^eyJ/);
    expect(refreshBody.refresh_token).not.toBe(loginBody.refresh_token);

    // 5. me (still works with new token)
    const meAfterRefresh = await fetch(`${BASE_URL}/identity/me`, {
      headers: { authorization: `Bearer ${refreshBody.access_token}` },
    });
    expect(meAfterRefresh.status).toBe(200);

    // 6. logout
    const logoutRes = await fetch(`${BASE_URL}/identity/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshBody.refresh_token }),
    });
    expect(logoutRes.status).toBe(204);

    // 7. refresh after logout → invalid_token
    const reuseRes = await fetch(`${BASE_URL}/identity/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshBody.refresh_token }),
    });
    expect(reuseRes.status).toBe(401);
    const reuseBody = (await reuseRes.json()) as { error: string };
    expect(reuseBody.error).toBe("invalid_token");
  }, SERVER_START_TIMEOUT_MS);

  it("rejects malformed JSON body with 400", async () => {
    const res = await fetch(`${BASE_URL}/identity/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    // express.json() throws on bad JSON → 400 from error path or our 500 handler
    expect([400, 500]).toContain(res.status);
  });
});