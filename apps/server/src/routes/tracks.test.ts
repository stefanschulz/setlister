import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { albums, artists, episodePlaylistEntries, episodes } from "../db/schema.js";

let db: Db;
let app: ReturnType<typeof createApp>;
let albumId: number;
let artistAId: number;
let artistBId: number;

beforeEach(async () => {
  ({ db } = createDb(":memory:"));
  runMigrations(db);
  app = createApp(db);

  [{ id: albumId }] = await db.insert(albums).values({ title: "Album" }).returning();
  [{ id: artistAId }] = await db.insert(artists).values({ name: "Artist A" }).returning();
  [{ id: artistBId }] = await db.insert(artists).values({ name: "Artist B" }).returning();
});

async function createTrack(body: Record<string, unknown>) {
  return app.request("/api/tracks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tracks", () => {
  it("creates a track with multiple contributors", async () => {
    const res = await createTrack({
      title: "Collab Tune",
      albumId,
      contributors: [
        { artistId: artistAId, role: "ORIGINAL", position: 0 },
        { artistId: artistBId, role: "FEATURING", position: 0 },
      ],
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Collab Tune");
    expect(body.album).toMatchObject({ id: albumId });
    expect(body.contributors).toHaveLength(2);
    expect(body.contributors.map((c: { artist: { name: string } }) => c.artist.name).sort()).toEqual([
      "Artist A",
      "Artist B",
    ]);
  });

  it("rejects an empty contributor list", async () => {
    const res = await createTrack({ title: "Track", albumId, contributors: [] });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate positions within the same role", async () => {
    const res = await createTrack({
      title: "Track",
      albumId,
      contributors: [
        { artistId: artistAId, role: "ORIGINAL", position: 0 },
        { artistId: artistBId, role: "ORIGINAL", position: 0 },
      ],
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-existent albumId", async () => {
    const res = await createTrack({
      title: "Track",
      albumId: 999,
      contributors: [{ artistId: artistAId, role: "ORIGINAL", position: 0 }],
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-existent contributor artistId", async () => {
    const res = await createTrack({
      title: "Track",
      albumId,
      contributors: [{ artistId: 999, role: "ORIGINAL", position: 0 }],
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tracks", () => {
  it("lists tracks with album and contributors", async () => {
    await createTrack({
      title: "Track",
      albumId,
      contributors: [{ artistId: artistAId, role: "ORIGINAL", position: 0 }],
    });

    const res = await app.request("/api/tracks");
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].album.id).toBe(albumId);
  });

  it("returns 404 for a missing track", async () => {
    const res = await app.request("/api/tracks/999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/tracks/:id", () => {
  it("replaces the contributor set", async () => {
    const created = await (
      await createTrack({
        title: "Track",
        albumId,
        contributors: [{ artistId: artistAId, role: "ORIGINAL", position: 0 }],
      })
    ).json();

    const res = await app.request(`/api/tracks/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Track",
        albumId,
        contributors: [{ artistId: artistBId, role: "REMIX", position: 0 }],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contributors).toHaveLength(1);
    expect(body.contributors[0]).toMatchObject({ role: "REMIX", artist: { name: "Artist B" } });
  });
});

describe("DELETE /api/tracks/:id", () => {
  it("deletes a track and its contributor rows", async () => {
    const created = await (
      await createTrack({
        title: "Track",
        albumId,
        contributors: [{ artistId: artistAId, role: "ORIGINAL", position: 0 }],
      })
    ).json();

    const res = await app.request(`/api/tracks/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);

    const getRes = await app.request(`/api/tracks/${created.id}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 409 when the track is referenced by a playlist entry", async () => {
    const created = await (
      await createTrack({
        title: "Track",
        albumId,
        contributors: [{ artistId: artistAId, role: "ORIGINAL", position: 0 }],
      })
    ).json();
    const [episode] = await db
      .insert(episodes)
      .values({ number: 1, headline: "H", topic: "T" })
      .returning();
    await db
      .insert(episodePlaylistEntries)
      .values({ episodeId: episode.id, trackId: created.id, position: 0 });

    const res = await app.request(`/api/tracks/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(409);
  });
});
