/**
 * Landing-page HTTP test — full editorial flow via the generic API.
 */

import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp, buildRuntime, type AppRuntime } from "../../../src/app/create-app";

async function makeApp(): Promise<{ app: Express; rt: AppRuntime }> {
  const rt = await buildRuntime();
  const app = await createApp({ runtime: rt });
  return { app, rt };
}

describe("Landing Page end-to-end", () => {
  let app: Express;
  let rt: AppRuntime;
  beforeEach(async () => {
    ({ app, rt } = await makeApp());
    void rt;
  });

  it("full editorial lifecycle", async () => {
    const create = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({
        title: "Promo",
        slug: "promo",
        content: "Big news",
        published: false,
      })
      .expect(201);
    const id = create.body.data.id as string;

    await request(app)
      .post(
        `/api/applications/landing_page_backend/entities/LandingPage/${id}/transition/submit`,
      )
      .expect(200);
    await request(app)
      .post(
        `/api/applications/landing_page_backend/entities/LandingPage/${id}/transition/publish`,
      )
      .expect(200);

    const audit = await request(app)
      .get(
        `/api/applications/landing_page_backend/entities/LandingPage/${id}/audit`,
      )
      .expect(200);
    const ops = (audit.body.data as Array<{ operation: string }>).map(
      (e) => e.operation,
    );
    expect(ops).toEqual(["create", "transition", "transition"]);
  });

  it("querying by state returns the right records", async () => {
    const a = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "A", slug: "a", content: "x", published: false });
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "B", slug: "b", content: "y", published: false });

    await request(app)
      .post(
        `/api/applications/landing_page_backend/entities/LandingPage/${a.body.data.id}/transition/submit`,
      )
      .expect(200);

    const drafts = await request(app)
      .get("/api/applications/landing_page_backend/entities/LandingPage")
      .query({ "filter[state_eq]": "draft" })
      .expect(200);
    expect(drafts.body.data).toHaveLength(1);
    expect(drafts.body.data[0].title).toBe("B");
  });

  it("user records exist via the generic API after registration", async () => {
    const reg = await request(app)
      .post("/auth/register")
      .send({ email: "u@example.com", password: "Sup3rSecret!" });
    expect(reg.status).toBe(201);

    const users = await request(app)
      .get("/api/applications/system/entities/User")
      .expect(200);
    expect(users.body.data).toHaveLength(1);

    const sessions = await request(app)
      .get("/api/applications/system/entities/Session")
      .expect(200);
    expect(sessions.body.data).toHaveLength(1);
  });
});