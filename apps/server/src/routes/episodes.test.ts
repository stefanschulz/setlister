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

describe("POST /api/episodes — published status derivation", () => {
  it("is a draft (published: false) when airDate is omitted", async () => {
    const res = await createEpisode({ number: 1, headline: "H", topic: "T" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.airDate).toBeNull();
    expect(body.published).toBe(false);
  });

  it("is published when airDate is set", async () => {
    const res = await createEpisode({ number: 1, headline: "H", topic: "T", airDate: "2026-01-15" });
    const body = await res.json();
    expect(body.published).toBe(true);
  });

  it("rejects a malformed airDate", async () => {
    const res = await createEpisode({ number: 1, headline: "H", topic: "T", airDate: "15-01-2026" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate episode number", async () => {
    await createEpisode({ number: 1, headline: "H", topic: "T" });
    const res = await createEpisode({ number: 1, headline: "H2", topic: "T2" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/episodes", () => {
  it("lists episodes with the derived published flag", async () => {
    await createEpisode({ number: 1, headline: "Draft", topic: "T" });
    await createEpisode({ number: 2, headline: "Published", topic: "T", airDate: "2026-01-15" });

    const list = await (await app.request("/api/episodes")).json();
    expect(list.find((e: { headline: string }) => e.headline === "Draft").published).toBe(false);
    expect(list.find((e: { headline: string }) => e.headline === "Published").published).toBe(true);
  });

  it("returns 404 for a missing episode", async () => {
    const res = await app.request("/api/episodes/999");
    expect(res.status).toBe(404);
  });

  it("returns a single episode with an empty playlist initially", async () => {
    const created = await (await createEpisode({ number: 1, headline: "H", topic: "T" })).json();

    const res = await app.request(`/api/episodes/${created.id}`);
    const body = await res.json();
    expect(body.playlist).toEqual([]);
  });
});

describe("PUT /api/episodes/:id", () => {
  it("re-derives published status when airDate changes", async () => {
    const created = await (await createEpisode({ number: 1, headline: "H", topic: "T" })).json();

    const res = await app.request(`/api/episodes/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: 1, headline: "H", topic: "T", airDate: "2026-02-01" }),
    });
    expect((await res.json()).published).toBe(true);
  });
});

describe("PUT /api/episodes/:id/playlist", () => {
  async function setup() {
    const [album] = await db.insert(albums).values({ title: "Album" }).returning();
    const [artist] = await db.insert(artists).values({ name: "Artist" }).returning();
    const trackIds: number[] = [];
    for (const title of ["A", "B", "C"]) {
      const res = await app.request("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          albumId: album.id,
          contributors: [{ artistId: artist.id, role: "ORIGINAL", position: 0 }],
        }),
      });
      trackIds.push((await res.json()).id);
    }
    const episode = await (await createEpisode({ number: 1, headline: "H", topic: "T" })).json();
    return { episodeId: episode.id, trackIds };
  }

  async function setPlaylist(episodeId: number, trackIds: number[]) {
    return app.request(`/api/episodes/${episodeId}/playlist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackIds }),
    });
  }

  it("sets the initial manual order", async () => {
    const { episodeId, trackIds } = await setup();

    const res = await setPlaylist(episodeId, [trackIds[2], trackIds[0], trackIds[1]]);
    expect(res.status).toBe(200);
    const { playlist } = await res.json();
    expect(playlist.map((p: { track: { title: string } }) => p.track.title)).toEqual(["C", "A", "B"]);
  });

  it("reorders an existing playlist", async () => {
    const { episodeId, trackIds } = await setup();
    await setPlaylist(episodeId, trackIds);

    const res = await setPlaylist(episodeId, [trackIds[1], trackIds[0], trackIds[2]]);
    const { playlist } = await res.json();
    expect(playlist.map((p: { track: { title: string } }) => p.track.title)).toEqual(["B", "A", "C"]);
  });

  it("removes a track by omitting it from the list", async () => {
    const { episodeId, trackIds } = await setup();
    await setPlaylist(episodeId, trackIds);

    const res = await setPlaylist(episodeId, [trackIds[0], trackIds[2]]);
    const { playlist } = await res.json();
    expect(playlist).toHaveLength(2);
    expect(playlist.map((p: { track: { title: string } }) => p.track.title)).toEqual(["A", "C"]);
  });

  it("rejects a non-existent trackId", async () => {
    const { episodeId } = await setup();
    const res = await setPlaylist(episodeId, [999]);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/episodes/:id/output — against the seed data's compilation example", () => {
  it("produces the expected HTML and per-channel text", async () => {
    await seed(db);

    const res = await app.request("/api/episodes/1/output");
    expect(res.status).toBe(200);
    const body = await res.json();

    // Intro (Solo Artist), Collab Tune (A & B), Feature Track (A feat. C), Remix Track (B vs C), Trio Cut (A, B & C)
    // Artist A has a websiteUrl, and the compilation album has a link, in the seed data —
    // both are expected to be linked in the HTML output.
    const linkedA = '<a href="https://artist-a.example">Artist A</a>';
    const linkedComp = '<a href="https://label.example/comp-1">Compilation Vol. 1</a>';
    expect(body.html).toContain("Solo Artist - Intro (Album One)");
    expect(body.html).toContain(`${linkedA} & Artist B - Collab Tune (Album One)`);
    expect(body.html).toContain(`${linkedA} feat. Artist C - Feature Track (${linkedComp})`);
    expect(body.html).toContain(`Artist B vs Artist C - Remix Track (${linkedComp})`);
    expect(body.html).toContain(`${linkedA}, Artist B & Artist C - Trio Cut (${linkedComp})`);

    // Artist A has a Bluesky reference ("@artist-a") from the seed; the others don't.
    expect(body.text.Bluesky).toContain("@artist-a");
    expect(body.text.Bluesky).toContain("Solo Artist");
    expect(body.text.Facebook).toContain("(Album One)");
    expect(body.text.Threads).not.toContain("(Album One)");
  });

  it("returns an empty bundle for an episode with no playlist entries", async () => {
    await seed(db);

    const res = await app.request("/api/episodes/2/output");
    const body = await res.json();
    expect(body.html).toBe("<ul>\n\n</ul>");
    expect(body.text.Facebook).toBe("");
  });
});

describe("DELETE /api/episodes/:id", () => {
  it("cascades away its playlist entries", async () => {
    await seed(db);

    const res = await app.request("/api/episodes/1", { method: "DELETE" });
    expect(res.status).toBe(204);

    const getRes = await app.request("/api/episodes/1");
    expect(getRes.status).toBe(404);
  });
});
