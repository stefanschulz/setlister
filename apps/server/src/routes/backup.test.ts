import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { seed } from "../db/seed.js";
import { artists, episodes } from "../db/schema.js";

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ db } = createDb(":memory:"));
  runMigrations(db);
  app = createApp(db);
});

async function getBackup() {
  const res = await app.request("/api/backup");
  expect(res.status).toBe(200);
  return res.json();
}

async function restore(body: unknown) {
  return app.request("/api/backup/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/backup", () => {
  it("exports every table plus format metadata", async () => {
    await seed(db);
    const backup = await getBackup();

    expect(backup.formatVersion).toBe(1);
    expect(typeof backup.exportedAt).toBe("string");
    for (const key of [
      "artists",
      "outputChannels",
      "artistSocialReferences",
      "albums",
      "tracks",
      "trackContributors",
      "episodes",
      "episodePlaylistEntries",
    ]) {
      expect(Array.isArray(backup.data[key])).toBe(true);
    }
    expect(backup.data.artists.length).toBeGreaterThan(0);
    expect(backup.data.episodes.length).toBeGreaterThan(0);
  });

  it("exports an empty-but-valid backup for a fresh database", async () => {
    const backup = await getBackup();
    expect(backup.data.artists).toEqual([]);
    expect(backup.data.episodes).toEqual([]);
  });
});

describe("POST /api/backup/restore", () => {
  it("round-trips: export, wipe, restore -> database matches exactly", async () => {
    await seed(db);
    const backup = await getBackup();

    const before = {
      artists: await db.query.artists.findMany(),
      tracks: await db.query.tracks.findMany(),
      episodes: await db.query.episodes.findMany(),
      playlistEntries: await db.query.episodePlaylistEntries.findMany(),
    };

    const res = await restore(backup);
    expect(res.status).toBe(200);

    expect(await db.query.artists.findMany()).toEqual(before.artists);
    expect(await db.query.tracks.findMany()).toEqual(before.tracks);
    expect(await db.query.episodes.findMany()).toEqual(before.episodes);
    expect(await db.query.episodePlaylistEntries.findMany()).toEqual(before.playlistEntries);
  });

  it("preserves original ids and lets new rows continue the id sequence without collisions", async () => {
    await seed(db);
    const backup = await getBackup();
    const maxIdBefore = Math.max(...backup.data.artists.map((a: { id: number }) => a.id));

    await restore(backup);

    const res = await app.request("/api/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Post-Restore Artist" }),
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.id).toBeGreaterThan(maxIdBefore);

    const allNames = (await db.query.artists.findMany()).map((a) => a.name);
    expect(new Set(allNames).size).toBe(allNames.length); // no accidental duplicate/collision
  });

  it("rejects a malformed backup body and leaves existing data untouched", async () => {
    await seed(db);
    const before = await db.query.artists.findMany();

    const res = await restore({ formatVersion: 1, exportedAt: "now", data: { artists: "not an array" } });
    expect(res.status).toBe(400);

    expect(await db.query.artists.findMany()).toEqual(before);
  });

  it("rejects an unknown format version", async () => {
    const backup = await getBackup();
    const res = await restore({ ...backup, formatVersion: 999 });
    expect(res.status).toBe(400);
  });

  it("restoring an empty backup clears the database", async () => {
    await seed(db);
    const empty = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        artists: [],
        outputChannels: [],
        artistSocialReferences: [],
        albums: [],
        tracks: [],
        trackContributors: [],
        episodes: [],
        episodePlaylistEntries: [],
      },
    };

    const res = await restore(empty);
    expect(res.status).toBe(200);
    expect(await db.select().from(artists)).toEqual([]);
    expect(await db.select().from(episodes)).toEqual([]);
  });
});
