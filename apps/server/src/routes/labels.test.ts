import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ db } = createDb(":memory:"));
  runMigrations(db);
  app = createApp(db);
});

async function createLabel(body: Record<string, unknown>) {
  return app.request("/api/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/labels", () => {
  it("creates a label", async () => {
    const res = await createLabel({
      name: "Label One",
      link: "https://label-one.example",
      facebookReferenceName: "labelone.official",
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      name: "Label One",
      link: "https://label-one.example",
      facebookReferenceName: "labelone.official",
    });
  });

  it("creates a label with only the required name", async () => {
    const res = await createLabel({ name: "Label One" });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ name: "Label One", link: null, facebookReferenceName: null });
  });

  it("rejects a missing name", async () => {
    const res = await createLabel({ link: "https://label-one.example" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid link", async () => {
    const res = await createLabel({ name: "Label One", link: "not-a-url" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/labels", () => {
  it("lists and fetches labels", async () => {
    const created = await (await createLabel({ name: "Label One" })).json();

    const list = await (await app.request("/api/labels")).json();
    expect(list).toHaveLength(1);

    const single = await app.request(`/api/labels/${created.id}`);
    expect(single.status).toBe(200);
  });

  it("returns 404 for a missing label", async () => {
    const res = await app.request("/api/labels/999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/labels/:id", () => {
  it("updates a label", async () => {
    const created = await (await createLabel({ name: "Label One" })).json();

    const res = await app.request(`/api/labels/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Renamed" });
  });

  it("returns 404 for a missing label", async () => {
    const res = await app.request("/api/labels/999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/labels/:id", () => {
  it("deletes a label", async () => {
    const created = await (await createLabel({ name: "Label One" })).json();

    const res = await app.request(`/api/labels/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  it("returns 404 for a missing label", async () => {
    const res = await app.request("/api/labels/999", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
