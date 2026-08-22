import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { albums, tracks, trackContributors } from "../db/schema.js";

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ db } = createDb(":memory:"));
  runMigrations(db);
  app = createApp(db);
});

async function createArtist(body: Record<string, unknown>) {
  return app.request("/api/artists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/artists", () => {
  it("creates an artist with social references", async () => {
    const res = await createArtist({
      name: "Artist A",
      websiteUrl: "https://a.example",
      socialReferences: [{ platform: "Bluesky", referenceName: "@a" }],
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: "Artist A", websiteUrl: "https://a.example" });
    expect(body.socialReferences).toEqual([
      expect.objectContaining({ platform: "Bluesky", referenceName: "@a" }),
    ]);
  });

  it("rejects a missing name", async () => {
    const res = await createArtist({ websiteUrl: "https://a.example" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid website URL", async () => {
    const res = await createArtist({ name: "Artist A", websiteUrl: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON", async () => {
    const res = await app.request("/api/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/artists", () => {
  it("lists created artists", async () => {
    await createArtist({ name: "Artist A" });
    await createArtist({ name: "Artist B" });

    const res = await app.request("/api/artists");
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("returns 404 for a missing artist", async () => {
    const res = await app.request("/api/artists/999");
    expect(res.status).toBe(404);
  });

  it("returns a single artist with social references", async () => {
    const created = await (await createArtist({ name: "Artist A" })).json();

    const res = await app.request(`/api/artists/${created.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Artist A" });
  });
});

describe("PUT /api/artists/:id", () => {
  it("updates fields and replaces social references", async () => {
    const created = await (
      await createArtist({
        name: "Artist A",
        socialReferences: [{ platform: "Bluesky", referenceName: "@old" }],
      })
    ).json();

    const res = await app.request(`/api/artists/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Artist A Renamed",
        socialReferences: [{ platform: "Instagram", referenceName: "@new" }],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Artist A Renamed");
    expect(body.socialReferences).toEqual([
      expect.objectContaining({ platform: "Instagram", referenceName: "@new" }),
    ]);
  });

  it("returns 404 for a missing artist", async () => {
    const res = await app.request("/api/artists/999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/artists/:id", () => {
  it("deletes an unreferenced artist", async () => {
    const created = await (await createArtist({ name: "Artist A" })).json();

    const res = await app.request(`/api/artists/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);

    const getRes = await app.request(`/api/artists/${created.id}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 409 when the artist is referenced by a track contribution", async () => {
    const created = await (await createArtist({ name: "Artist A" })).json();
    const [album] = await db.insert(albums).values({ title: "Album" }).returning();
    const [track] = await db.insert(tracks).values({ title: "Track", albumId: album.id }).returning();
    await db
      .insert(trackContributors)
      .values({ trackId: track.id, artistId: created.id, role: "ORIGINAL", position: 0 });

    const res = await app.request(`/api/artists/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(409);
  });
});
