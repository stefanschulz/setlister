import type { SetlistEntry } from "@setlister/shared";
import { Hono } from "hono";
import type { Db } from "../db/client.js";

export function createSetlistsRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const entries = await db.query.episodePlaylistEntries.findMany({
      with: {
        episode: true,
        track: {
          with: {
            album: true,
            contributors: { with: { artist: { with: { socialReferences: true } } } },
          },
        },
      },
    });

    const result: SetlistEntry[] = entries.map((e) => ({
      id: e.id,
      episodeId: e.episodeId,
      episodeNumber: e.episode.number,
      track: e.track,
    }));
    return c.json(result);
  });

  return router;
}
