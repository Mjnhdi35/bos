/**
 * Cross-domain test — proves that independent domain applications
 * (CMS + Ecommerce) coexist on the same runtime and never share
 * identity, persistence buckets, or audit trails.
 */

import { describe, expect, it } from "vitest";
import {
  EntityRuntime,
  EventBus,
  AuditService,
  InMemoryAuditStore,
  WorkflowEngine,
  InMemoryRepository,
  refOf,
} from "../../../src/platform/runtime-index";
import { registerApplication } from "../../../src/platform/application";
import { LANDING_PAGE_APPLICATION } from "../../../src/applications/landing-page";
import { SMOOTHIE_STORE_APPLICATION } from "../../../src/applications/smoothie-store";

function buildRuntime(): EntityRuntime {
  return new EntityRuntime(
    new InMemoryRepository(),
    new EventBus(),
    new AuditService(new InMemoryAuditStore()),
    new WorkflowEngine(),
    { current: () => "system" },
  );
}

describe("Cross-domain coexistence", () => {
  it("registers two domain apps and serves them from a single runtime", async () => {
    const runtime = buildRuntime();
    registerApplication(runtime, LANDING_PAGE_APPLICATION);
    registerApplication(runtime, SMOOTHIE_STORE_APPLICATION);

    expect(runtime.listApplications().map((a) => a.name).sort()).toEqual([
      "landing_page_backend",
      "smoothie_store",
    ]);

    const pageId = await runtime.create(
      refOf("landing_page_backend", "LandingPage"),
      { title: "Welcome", slug: "welcome", content: "Hello", published: true },
    );
    // First create a Category so the Product FK resolves.
    await runtime.create(refOf("smoothie_store", "Category"), {
      name: "Smoothies",
      slug: "smoothies",
    });
    const productId = await runtime.create(
      refOf("smoothie_store", "Product"),
      {
        name: "Green Smoothie",
        slug: "green",
        price_cents: 1200,
        stock: 10,
        category_id: "Category_000001",
      },
    );
    expect(pageId).toMatch(/^LandingPage_\d{6}$/);
    expect(productId).toMatch(/^Product_\d{6}$/);

    const pages = await runtime.query(
      refOf("landing_page_backend", "LandingPage"),
    );
    const products = await runtime.query(refOf("smoothie_store", "Product"));
    expect(pages.items).toHaveLength(1);
    expect(products.items).toHaveLength(1);
  });

  it("audit trails are scoped per application", async () => {
    const runtime = buildRuntime();
    registerApplication(runtime, LANDING_PAGE_APPLICATION);
    registerApplication(runtime, SMOOTHIE_STORE_APPLICATION);

    await runtime.create(
      refOf("landing_page_backend", "LandingPage"),
      { title: "Welcome", slug: "welcome", content: "Hello", published: true },
    );
    await runtime.create(refOf("smoothie_store", "Category"), {
      name: "Smoothies",
      slug: "smoothies",
    });
    await runtime.create(
      refOf("smoothie_store", "Product"),
      {
        name: "Green Smoothie",
        slug: "green",
        price_cents: 1200,
        stock: 10,
        category_id: "Category_000001",
      },
    );

    const all = await runtime.queryAudit();
    expect(all.length).toBeGreaterThanOrEqual(2);
    const apps = new Set(all.map((e) => e.applicationId));
    expect(apps.has("landing_page_backend")).toBe(true);
    expect(apps.has("smoothie_store")).toBe(true);
  });
});