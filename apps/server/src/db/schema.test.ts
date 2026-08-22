import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "./client.js";
import { runMigrations } from "./migrate.js";
import { seed } from "./seed.js";
import {
  albums,
  artists,
  artistSocialReferences,
  episodePlaylistEntries,
  episodes,
  trackContributors,
  tracks,
} from "./schema.js";
import { eq } from "drizzle-orm";

let db: Db;

beforeEach(() => {
  ({ db } = createDb(":memory:"));
  runMigrations(db);
});

describe("insert/query roundtrip per entity", () => {
  it("artist", async () => {
    const [artist] = await db
      .insert(artists)
      .values({ name: "Test Artist", realName: "Jane Doe", websiteUrl: "https://example.com" })
      .returning();

    const found = await db.query.artists.findFirst({ where: eq(artists.id, artist.id) });
    expect(found).toMatchObject({ name: "Test Artist", realName: "Jane Doe" });
  });

  it("artist social reference, linked to its artist", async () => {
    const [artist] = await db.insert(artists).values({ name: "Test Artist" }).returning();
    await db
      .insert(artistSocialReferences)
      .values({ artistId: artist.id, platform: "Bluesky", referenceName: "@test" });

    const withRefs = await db.query.artists.findFirst({
      where: eq(artists.id, artist.id),
      with: { socialReferences: true },
    });
    expect(withRefs?.socialReferences).toEqual([
      expect.objectContaining({ platform: "Bluesky", referenceName: "@test" }),
    ]);
  });

  it("album", async () => {
    const [album] = await db
      .insert(albums)
      .values({ title: "Test Album", link: "https://label.example" })
      .returning();

    const found = await db.query.albums.findFirst({ where: eq(albums.id, album.id) });
    expect(found).toMatchObject({ title: "Test Album", link: "https://label.example" });
  });

  it("track, uniquely tied to its album by id (not by title)", async () => {
    const [album] = await db.insert(albums).values({ title: "Same Title" }).returning();
    const [otherAlbum] = await db.insert(albums).values({ title: "Same Title" }).returning();
    const [track] = await db
      .insert(tracks)
      .values({ title: "Ambiguous Track Name", albumId: album.id })
      .returning();

    const found = await db.query.tracks.findFirst({
      where: eq(tracks.id, track.id),
      with: { album: true },
    });
    expect(found?.album.id).toBe(album.id);
    expect(found?.album.id).not.toBe(otherAlbum.id);
  });

  it("episode, with nullable air date", async () => {
    const [draft] = await db
      .insert(episodes)
      .values({ number: 1, headline: "H", topic: "T", airDate: null })
      .returning();
    expect(draft.airDate).toBeNull();

    const [published] = await db
      .insert(episodes)
      .values({ number: 2, headline: "H2", topic: "T2", airDate: "2026-01-15" })
      .returning();
    expect(published.airDate).toBe("2026-01-15");
  });

  it("rejects duplicate episode numbers", async () => {
    await db.insert(episodes).values({ number: 1, headline: "H", topic: "T" });
    await expect(
      db.insert(episodes).values({ number: 1, headline: "H2", topic: "T2" }),
    ).rejects.toThrow();
  });
});

describe("relationship behaviour", () => {
  it("a track can have multiple contributors with different roles, in order", async () => {
    const [album] = await db.insert(albums).values({ title: "Album" }).returning();
    const [track] = await db.insert(tracks).values({ title: "Track", albumId: album.id }).returning();
    const [original] = await db.insert(artists).values({ name: "Original" }).returning();
    const [remixer] = await db.insert(artists).values({ name: "Remixer" }).returning();

    await db.insert(trackContributors).values([
      { trackId: track.id, artistId: original.id, role: "ORIGINAL", position: 0 },
      { trackId: track.id, artistId: remixer.id, role: "REMIX", position: 0 },
    ]);

    const found = await db.query.tracks.findFirst({
      where: eq(tracks.id, track.id),
      with: { contributors: { with: { artist: true } } },
    });

    expect(found?.contributors).toHaveLength(2);
    expect(found?.contributors.map((c) => [c.role, c.artist.name])).toEqual(
      expect.arrayContaining([
        ["ORIGINAL", "Original"],
        ["REMIX", "Remixer"],
      ]),
    );
  });

  it("an episode's playlist entries carry the manual sort order", async () => {
    const [album] = await db.insert(albums).values({ title: "Album" }).returning();
    const [trackA] = await db.insert(tracks).values({ title: "A", albumId: album.id }).returning();
    const [trackB] = await db.insert(tracks).values({ title: "B", albumId: album.id }).returning();
    const [episode] = await db
      .insert(episodes)
      .values({ number: 1, headline: "H", topic: "T" })
      .returning();

    // Inserted out of order on purpose; position is what defines play order.
    await db.insert(episodePlaylistEntries).values([
      { episodeId: episode.id, trackId: trackB.id, position: 0 },
      { episodeId: episode.id, trackId: trackA.id, position: 1 },
    ]);

    const entries = await db.query.episodePlaylistEntries.findMany({
      where: eq(episodePlaylistEntries.episodeId, episode.id),
      orderBy: (t, { asc }) => asc(t.position),
      with: { track: true },
    });

    expect(entries.map((e) => e.track.title)).toEqual(["B", "A"]);
  });

  it("the same track can appear in multiple episodes", async () => {
    const [album] = await db.insert(albums).values({ title: "Album" }).returning();
    const [track] = await db.insert(tracks).values({ title: "Track", albumId: album.id }).returning();
    const [ep1] = await db.insert(episodes).values({ number: 1, headline: "H", topic: "T" }).returning();
    const [ep2] = await db.insert(episodes).values({ number: 2, headline: "H2", topic: "T2" }).returning();

    await db.insert(episodePlaylistEntries).values([
      { episodeId: ep1.id, trackId: track.id, position: 0 },
      { episodeId: ep2.id, trackId: track.id, position: 0 },
    ]);

    const found = await db.query.tracks.findFirst({
      where: eq(tracks.id, track.id),
      with: { playlistEntries: true },
    });
    expect(found?.playlistEntries).toHaveLength(2);
  });
});

describe("seed script", () => {
  it("populates the compilation example with all contributor role combinations", async () => {
    await seed(db);

    const allTracks = await db.query.tracks.findMany({
      with: { contributors: { with: { artist: true } } },
    });
    expect(allTracks).toHaveLength(5);

    const featureTrack = allTracks.find((t) => t.title === "Feature Track");
    expect(featureTrack?.contributors.map((c) => c.role).sort()).toEqual(["FEATURING", "ORIGINAL"]);

    const remixTrack = allTracks.find((t) => t.title === "Remix Track");
    expect(remixTrack?.contributors.map((c) => c.role).sort()).toEqual(["ORIGINAL", "REMIX"]);

    const allEpisodes = await db.query.episodes.findMany();
    expect(allEpisodes).toHaveLength(2);
    expect(allEpisodes.filter((e) => e.airDate !== null)).toHaveLength(1);
    expect(allEpisodes.filter((e) => e.airDate === null)).toHaveLength(1);
  });
});
