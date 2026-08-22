import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { tracks } from "../db/schema.js";

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ db } = createDb(":memory:"));
  runMigrations(db);
  app = createApp(db);
});

async function createAlbum(body: Record<string, unknown>) {
  return app.request("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/albums", () => {
  it("creates an album", async () => {
    const res = await createAlbum({ title: "Album One", link: "https://label.example" });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ title: "Album One", link: "https://label.example" });
  });

  it("rejects a missing title", async () => {
    const res = await createAlbum({ link: "https://label.example" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid link", async () => {
    const res = await createAlbum({ title: "Album One", link: "not-a-url" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/albums", () => {
  it("lists and fetches albums", async () => {
    const created = await (await createAlbum({ title: "Album One" })).json();

    const list = await (await app.request("/api/albums")).json();
    expect(list).toHaveLength(1);

    const single = await app.request(`/api/albums/${created.id}`);
    expect(single.status).toBe(200);
  });

  it("returns 404 for a missing album", async () => {
    const res = await app.request("/api/albums/999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/albums/:id", () => {
  it("updates an album", async () => {
    const created = await (await createAlbum({ title: "Album One" })).json();

    const res = await app.request(`/api/albums/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Renamed" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ title: "Renamed" });
  });

  it("returns 404 for a missing album", async () => {
    const res = await app.request("/api/albums/999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "X" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/albums/:id", () => {
  it("deletes an unreferenced album", async () => {
    const created = await (await createAlbum({ title: "Album One" })).json();

    const res = await app.request(`/api/albums/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  it("returns 409 when the album has tracks", async () => {
    const created = await (await createAlbum({ title: "Album One" })).json();
    await db.insert(tracks).values({ title: "Track", albumId: created.id });

    const res = await app.request(`/api/albums/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(409);
  });
});
