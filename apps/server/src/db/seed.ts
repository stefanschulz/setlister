import { fileURLToPath } from "node:url";
import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import {
  albums,
  artists,
  artistSocialReferences,
  episodePlaylistEntries,
  episodes,
  outputChannels,
  trackContributors,
  tracks,
} from "./schema.js";

/**
 * Sample data covering every contributor-role combination described in
 * docs/konzept.md §1.7, including a compilation album whose tracks each
 * have different artists (feat./remix), to exercise the formatting rule.
 */
export async function seed(db: ReturnType<typeof createDb>["db"]) {
  const [facebook, instagram, threads, bluesky] = await db
    .insert(outputChannels)
    .values([
      { name: "Facebook", pattern: "{artists} ({album})" },
      { name: "Instagram", pattern: "{artists} ({album})" },
      { name: "Threads", pattern: "{artists}" },
      { name: "Bluesky", pattern: "{artists}" },
    ])
    .returning();

  const [artistA] = await db
    .insert(artists)
    .values({ name: "Artist A", websiteUrl: "https://artist-a.example" })
    .returning();
  const [artistB] = await db.insert(artists).values({ name: "Artist B" }).returning();
  const [artistC] = await db.insert(artists).values({ name: "Artist C" }).returning();
  const [soloArtist] = await db.insert(artists).values({ name: "Solo Artist" }).returning();

  await db.insert(artistSocialReferences).values([
    { artistId: artistA.id, channelId: bluesky.id, referenceName: "@artist-a" },
    { artistId: artistA.id, channelId: instagram.id, referenceName: "artist.a.official" },
  ]);

  const [albumOne] = await db.insert(albums).values({ title: "Album One" }).returning();
  const [compilation] = await db
    .insert(albums)
    .values({ title: "Compilation Vol. 1", link: "https://label.example/comp-1" })
    .returning();

  const [introTrack] = await db
    .insert(tracks)
    .values({ title: "Intro", albumId: albumOne.id })
    .returning();
  await db.insert(trackContributors).values({
    trackId: introTrack.id,
    artistId: soloArtist.id,
    role: "ORIGINAL",
    position: 0,
  });

  const [collabTrack] = await db
    .insert(tracks)
    .values({ title: "Collab Tune", albumId: albumOne.id })
    .returning();
  await db.insert(trackContributors).values([
    { trackId: collabTrack.id, artistId: artistA.id, role: "ORIGINAL", position: 0 },
    { trackId: collabTrack.id, artistId: artistB.id, role: "ORIGINAL", position: 1 },
  ]);

  // "A feat. C"
  const [featureTrack] = await db
    .insert(tracks)
    .values({ title: "Feature Track", albumId: compilation.id })
    .returning();
  await db.insert(trackContributors).values([
    { trackId: featureTrack.id, artistId: artistA.id, role: "ORIGINAL", position: 0 },
    { trackId: featureTrack.id, artistId: artistC.id, role: "FEATURING", position: 0 },
  ]);

  // "B vs C"
  const [remixTrack] = await db
    .insert(tracks)
    .values({ title: "Remix Track", albumId: compilation.id })
    .returning();
  await db.insert(trackContributors).values([
    { trackId: remixTrack.id, artistId: artistB.id, role: "ORIGINAL", position: 0 },
    { trackId: remixTrack.id, artistId: artistC.id, role: "REMIX", position: 0 },
  ]);

  // "A, B & C"
  const [trioTrack] = await db
    .insert(tracks)
    .values({ title: "Trio Cut", albumId: compilation.id })
    .returning();
  await db.insert(trackContributors).values([
    { trackId: trioTrack.id, artistId: artistA.id, role: "ORIGINAL", position: 0 },
    { trackId: trioTrack.id, artistId: artistB.id, role: "ORIGINAL", position: 1 },
    { trackId: trioTrack.id, artistId: artistC.id, role: "ORIGINAL", position: 2 },
  ]);

  const [publishedEpisode] = await db
    .insert(episodes)
    .values({
      number: 1,
      headline: "Erste Ausgabe",
      topic: "Einstieg ins Programm",
      airDate: "2026-01-15",
    })
    .returning();

  await db.insert(episodePlaylistEntries).values([
    { episodeId: publishedEpisode.id, trackId: introTrack.id, position: 0 },
    { episodeId: publishedEpisode.id, trackId: collabTrack.id, position: 1 },
    { episodeId: publishedEpisode.id, trackId: featureTrack.id, position: 2 },
    { episodeId: publishedEpisode.id, trackId: remixTrack.id, position: 3 },
    { episodeId: publishedEpisode.id, trackId: trioTrack.id, position: 4 },
  ]);

  await db.insert(episodes).values({
    number: 2,
    headline: "Zweite Ausgabe (Entwurf)",
    topic: "Noch in Vorbereitung",
    airDate: null,
  });
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const dbPath = process.env.DB_PATH ?? "./data/setlister.sqlite";
  const { db } = createDb(dbPath);
  runMigrations(db);
  await seed(db);
  console.log(`Seed data inserted into ${dbPath}`);
}
