import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "../db/client.js";
import {
  albums,
  artists,
  artistSocialReferences,
  CONTRIBUTOR_ROLES,
  episodePlaylistEntries,
  episodes,
  outputChannels,
  tracks,
  trackContributors,
} from "../db/schema.js";
import { parseBody } from "./helpers.js";

const FORMAT_VERSION = 1;

const backupSchema = z.object({
  formatVersion: z.literal(FORMAT_VERSION),
  exportedAt: z.string(),
  data: z.object({
    artists: z.array(
      z.object({ id: z.number(), name: z.string(), realName: z.string().nullable(), websiteUrl: z.string().nullable() }),
    ),
    outputChannels: z.array(z.object({ id: z.number(), name: z.string(), pattern: z.string() })),
    artistSocialReferences: z.array(
      z.object({ id: z.number(), artistId: z.number(), channelId: z.number(), referenceName: z.string() }),
    ),
    albums: z.array(z.object({ id: z.number(), title: z.string(), link: z.string().nullable() })),
    tracks: z.array(z.object({ id: z.number(), title: z.string(), albumId: z.number() })),
    trackContributors: z.array(
      z.object({
        id: z.number(),
        trackId: z.number(),
        artistId: z.number(),
        role: z.enum(CONTRIBUTOR_ROLES),
        position: z.number(),
      }),
    ),
    episodes: z.array(
      z.object({
        id: z.number(),
        number: z.number(),
        suffix: z.string(),
        headline: z.string(),
        topic: z.string(),
        airDate: z.string().nullable(),
      }),
    ),
    episodePlaylistEntries: z.array(
      z.object({ id: z.number(), episodeId: z.number(), trackId: z.number(), position: z.number() }),
    ),
  }),
});

/** Minimal shape shared by `Db` and the sync transaction handle drizzle passes into `db.transaction()`. */
interface Inserter {
  insert(table: any): { values(rows: unknown[]): { run(): unknown } };
}

/** Inserts rows in chunks to stay under SQLite's bound-parameter limit. */
function insertChunked(db: Inserter, table: any, rows: unknown[], chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (chunk.length > 0) db.insert(table).values(chunk).run();
  }
}

export function createBackupRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const data = {
      artists: await db.select().from(artists),
      outputChannels: await db.select().from(outputChannels),
      artistSocialReferences: await db.select().from(artistSocialReferences),
      albums: await db.select().from(albums),
      tracks: await db.select().from(tracks),
      trackContributors: await db.select().from(trackContributors),
      episodes: await db.select().from(episodes),
      episodePlaylistEntries: await db.select().from(episodePlaylistEntries),
    };

    const body = { formatVersion: FORMAT_VERSION, exportedAt: new Date().toISOString(), data };
    // Filename (with a client-local timestamp) is set by the browser when it triggers the
    // download; this default only applies to direct/non-browser API access (e.g. curl).
    c.header("Content-Disposition", `attachment; filename="setlister-backup.json"`);
    c.header("Content-Type", "application/json");
    return c.body(JSON.stringify(body, null, 2));
  });

  router.post("/restore", async (c) => {
    const parsed = await parseBody(c, backupSchema);
    if (!parsed.success) return parsed.response;
    const { data } = parsed.data;

    db.transaction((tx) => {
      // Delete children before parents.
      tx.delete(episodePlaylistEntries).run();
      tx.delete(trackContributors).run();
      tx.delete(artistSocialReferences).run();
      tx.delete(tracks).run();
      tx.delete(episodes).run();
      tx.delete(albums).run();
      tx.delete(artists).run();
      tx.delete(outputChannels).run();

      // Insert parents before children, preserving original ids.
      insertChunked(tx, outputChannels, data.outputChannels);
      insertChunked(tx, artists, data.artists);
      insertChunked(tx, albums, data.albums);
      insertChunked(tx, episodes, data.episodes);
      insertChunked(tx, tracks, data.tracks);
      insertChunked(tx, artistSocialReferences, data.artistSocialReferences);
      insertChunked(tx, trackContributors, data.trackContributors);
      insertChunked(tx, episodePlaylistEntries, data.episodePlaylistEntries);
    });

    return c.json({ restored: true });
  });

  return router;
}
