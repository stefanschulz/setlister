import { trackInputSchema } from "@setlister/shared";
import { eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import {
  albums,
  artists,
  episodePlaylistEntries,
  trackContributors,
  tracks,
} from "../db/schema.js";
import { parseBody, parseIdParam } from "./helpers.js";

const trackWithDetails = {
  album: true,
  contributors: { with: { artist: true } },
} as const;

/** Confirms albumId and every contributor's artistId reference an existing row. */
async function validateReferences(
  db: Db,
  input: { albumId: number; contributors: { artistId: number }[] },
): Promise<string | null> {
  const album = await db.query.albums.findFirst({ where: eq(albums.id, input.albumId) });
  if (!album) return `Album ${input.albumId} not found`;

  const artistIds = [...new Set(input.contributors.map((c) => c.artistId))];
  const found = await db.query.artists.findMany({ where: inArray(artists.id, artistIds) });
  if (found.length !== artistIds.length) {
    const foundIds = new Set(found.map((a) => a.id));
    const missing = artistIds.filter((id) => !foundIds.has(id));
    return `Artist(s) not found: ${missing.join(", ")}`;
  }

  return null;
}

export function createTracksRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const all = await db.query.tracks.findMany({ with: trackWithDetails });
    return c.json(all);
  });

  router.get("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const track = await db.query.tracks.findFirst({
      where: eq(tracks.id, id),
      with: trackWithDetails,
    });
    if (!track) return c.json({ error: "Track not found" }, 404);
    return c.json(track);
  });

  router.post("/", async (c) => {
    const parsed = await parseBody(c, trackInputSchema);
    if (!parsed.success) return parsed.response;

    const referenceError = await validateReferences(db, parsed.data);
    if (referenceError) return c.json({ error: referenceError }, 400);

    const { contributors, ...trackData } = parsed.data;
    const [created] = await db.insert(tracks).values(trackData).returning();
    await db
      .insert(trackContributors)
      .values(contributors.map((contributor) => ({ ...contributor, trackId: created.id })));

    const full = await db.query.tracks.findFirst({
      where: eq(tracks.id, created.id),
      with: trackWithDetails,
    });
    return c.json(full, 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.tracks.findFirst({ where: eq(tracks.id, id) });
    if (!existing) return c.json({ error: "Track not found" }, 404);

    const parsed = await parseBody(c, trackInputSchema);
    if (!parsed.success) return parsed.response;

    const referenceError = await validateReferences(db, parsed.data);
    if (referenceError) return c.json({ error: referenceError }, 400);

    const { contributors, ...trackData } = parsed.data;
    await db.update(tracks).set(trackData).where(eq(tracks.id, id));
    await db.delete(trackContributors).where(eq(trackContributors.trackId, id));
    await db
      .insert(trackContributors)
      .values(contributors.map((contributor) => ({ ...contributor, trackId: id })));

    const full = await db.query.tracks.findFirst({
      where: eq(tracks.id, id),
      with: trackWithDetails,
    });
    return c.json(full);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.tracks.findFirst({ where: eq(tracks.id, id) });
    if (!existing) return c.json({ error: "Track not found" }, 404);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(episodePlaylistEntries)
      .where(eq(episodePlaylistEntries.trackId, id));
    if (count > 0) {
      return c.json(
        { error: `Cannot delete track referenced by ${count} playlist entr${count === 1 ? "y" : "ies"}` },
        409,
      );
    }

    await db.delete(trackContributors).where(eq(trackContributors.trackId, id));
    await db.delete(tracks).where(eq(tracks.id, id));
    return c.body(null, 204);
  });

  return router;
}
