import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { seed } from "../db/seed.js";
import { albums, artists } from "../db/schema.js";

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ db } = createDb(":memory:"));
  runMigrations(db);
  app = createApp(db);
});

async function createEpisode(body: Record<string, unknown>) {
  return app.request("/api/episodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createTrack(body: Record<string, unknown>) {
  return app.request("/api/tracks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function setPlaylist(episodeId: number, trackIds: number[]) {
  return app.request(`/api/episodes/${episodeId}/playlist`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackIds }),
  });
}

describe("GET /api/setlists", () => {
  it("returns one entry per playlist occurrence, across all episodes, with the episode number attached", async () => {
    const [album] = await db.insert(albums).values({ title: "Album" }).returning();
    const [artist] = await db.insert(artists).values({ name: "Artist" }).returning();
    const track = await (
      await createTrack({
        title: "Track",
        albumId: album.id,
        contributors: [{ artistId: artist.id, role: "ORIGINAL", position: 0 }],
      })
    ).json();

    const ep1 = await (await createEpisode({ number: 1, headline: "First", topic: "T" })).json();
    const ep2 = await (await createEpisode({ number: 2, headline: "Second", topic: "T" })).json();
    await setPlaylist(ep1.id, [track.id]);
    await setPlaylist(ep2.id, [track.id]);

    const res = await app.request("/api/setlists");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveLength(2);
    expect(body.map((e: { episodeNumber: number }) => e.episodeNumber).sort()).toEqual([1, 2]);
    expect(body.every((e: { track: { title: string } }) => e.track.title === "Track")).toBe(true);
  });

  it("returns an empty list when no episode has a playlist yet", async () => {
    await createEpisode({ number: 1, headline: "H", topic: "T" });

    const res = await app.request("/api/setlists");
    expect(await res.json()).toEqual([]);
  });

  it("includes the full track shape (album, contributors with artist) needed for the overview", async () => {
    await seed(db);

    const res = await app.request("/api/setlists");
    const body = await res.json();

    const collabEntry = body.find((e: { track: { title: string } }) => e.track.title === "Collab Tune");
    expect(collabEntry.track.album.title).toBe("Album One");
    expect(collabEntry.track.contributors.map((c: { artist: { name: string } }) => c.artist.name)).toEqual([
      "Artist A",
      "Artist B",
    ]);
  });
});
