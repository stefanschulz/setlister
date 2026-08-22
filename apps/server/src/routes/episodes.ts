import { episodeInputSchema, playlistInputSchema } from "@setlister/shared";
import { and, eq, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { episodePlaylistEntries, episodes, tracks } from "../db/schema.js";
import { buildAllOutputs, type PlaylistEntryForOutput } from "../services/playlist-output.js";
import { parseBody, parseIdParam } from "./helpers.js";

function withPublishedFlag<T extends { airDate: string | null }>(episode: T) {
  return { ...episode, published: episode.airDate !== null };
}

async function loadPlaylist(db: Db, episodeId: number): Promise<PlaylistEntryForOutput[]> {
  const entries = await db.query.episodePlaylistEntries.findMany({
    where: eq(episodePlaylistEntries.episodeId, episodeId),
    orderBy: (t, { asc }) => asc(t.position),
    with: {
      track: {
        with: {
          album: true,
          contributors: { with: { artist: { with: { socialReferences: true } } } },
        },
      },
    },
  });
  return entries.map((e) => ({ position: e.position, track: e.track }));
}

export function createEpisodesRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const all = await db.query.episodes.findMany();
    return c.json(all.map(withPublishedFlag));
  });

  router.get("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, id) });
    if (!episode) return c.json({ error: "Episode not found" }, 404);

    const playlist = await loadPlaylist(db, id);
    return c.json({ ...withPublishedFlag(episode), playlist });
  });

  router.post("/", async (c) => {
    const parsed = await parseBody(c, episodeInputSchema);
    if (!parsed.success) return parsed.response;

    const clash = await db.query.episodes.findFirst({ where: eq(episodes.number, parsed.data.number) });
    if (clash) return c.json({ error: `Episode number ${parsed.data.number} is already in use` }, 400);

    const [created] = await db
      .insert(episodes)
      .values({ ...parsed.data, airDate: parsed.data.airDate ?? null })
      .returning();
    return c.json(withPublishedFlag(created), 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.episodes.findFirst({ where: eq(episodes.id, id) });
    if (!existing) return c.json({ error: "Episode not found" }, 404);

    const parsed = await parseBody(c, episodeInputSchema);
    if (!parsed.success) return parsed.response;

    const clash = await db.query.episodes.findFirst({
      where: and(eq(episodes.number, parsed.data.number), ne(episodes.id, id)),
    });
    if (clash) return c.json({ error: `Episode number ${parsed.data.number} is already in use` }, 400);

    const [updated] = await db
      .update(episodes)
      .set({ ...parsed.data, airDate: parsed.data.airDate ?? null })
      .where(eq(episodes.id, id))
      .returning();
    return c.json(withPublishedFlag(updated));
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.episodes.findFirst({ where: eq(episodes.id, id) });
    if (!existing) return c.json({ error: "Episode not found" }, 404);

    await db.delete(episodePlaylistEntries).where(eq(episodePlaylistEntries.episodeId, id));
    await db.delete(episodes).where(eq(episodes.id, id));
    return c.body(null, 204);
  });

  router.put("/:id/playlist", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.episodes.findFirst({ where: eq(episodes.id, id) });
    if (!existing) return c.json({ error: "Episode not found" }, 404);

    const parsed = await parseBody(c, playlistInputSchema);
    if (!parsed.success) return parsed.response;

    const uniqueTrackIds = [...new Set(parsed.data.trackIds)];
    if (uniqueTrackIds.length > 0) {
      const found = await db.query.tracks.findMany({ where: inArray(tracks.id, uniqueTrackIds) });
      if (found.length !== uniqueTrackIds.length) {
        const foundIds = new Set(found.map((t) => t.id));
        const missing = uniqueTrackIds.filter((tid) => !foundIds.has(tid));
        return c.json({ error: `Track(s) not found: ${missing.join(", ")}` }, 400);
      }
    }

    await db.delete(episodePlaylistEntries).where(eq(episodePlaylistEntries.episodeId, id));
    if (parsed.data.trackIds.length > 0) {
      await db.insert(episodePlaylistEntries).values(
        parsed.data.trackIds.map((trackId, position) => ({ episodeId: id, trackId, position })),
      );
    }

    const playlist = await loadPlaylist(db, id);
    return c.json({ playlist });
  });

  router.get("/:id/output", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.episodes.findFirst({ where: eq(episodes.id, id) });
    if (!existing) return c.json({ error: "Episode not found" }, 404);

    const playlist = await loadPlaylist(db, id);
    return c.json(buildAllOutputs(playlist));
  });

  return router;
}
