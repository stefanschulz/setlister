import { artistInputSchema } from "@setlister/shared";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { artistSocialReferences, artists, trackContributors } from "../db/schema.js";
import { parseBody, parseIdParam } from "./helpers.js";

export function createArtistsRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const all = await db.query.artists.findMany({ with: { socialReferences: true } });
    return c.json(all);
  });

  router.get("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const artist = await db.query.artists.findFirst({
      where: eq(artists.id, id),
      with: { socialReferences: true },
    });
    if (!artist) return c.json({ error: "Artist not found" }, 404);
    return c.json(artist);
  });

  router.post("/", async (c) => {
    const parsed = await parseBody(c, artistInputSchema);
    if (!parsed.success) return parsed.response;

    const { socialReferences, ...artistData } = parsed.data;
    const [created] = await db.insert(artists).values(artistData).returning();
    if (socialReferences.length > 0) {
      await db
        .insert(artistSocialReferences)
        .values(socialReferences.map((s) => ({ ...s, artistId: created.id })));
    }

    const full = await db.query.artists.findFirst({
      where: eq(artists.id, created.id),
      with: { socialReferences: true },
    });
    return c.json(full, 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.artists.findFirst({ where: eq(artists.id, id) });
    if (!existing) return c.json({ error: "Artist not found" }, 404);

    const parsed = await parseBody(c, artistInputSchema);
    if (!parsed.success) return parsed.response;

    const { socialReferences, ...artistData } = parsed.data;
    await db.update(artists).set(artistData).where(eq(artists.id, id));
    await db.delete(artistSocialReferences).where(eq(artistSocialReferences.artistId, id));
    if (socialReferences.length > 0) {
      await db
        .insert(artistSocialReferences)
        .values(socialReferences.map((s) => ({ ...s, artistId: id })));
    }

    const full = await db.query.artists.findFirst({
      where: eq(artists.id, id),
      with: { socialReferences: true },
    });
    return c.json(full);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.artists.findFirst({ where: eq(artists.id, id) });
    if (!existing) return c.json({ error: "Artist not found" }, 404);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(trackContributors)
      .where(eq(trackContributors.artistId, id));
    if (count > 0) {
      return c.json(
        { error: `Cannot delete artist referenced by ${count} track contribution(s)` },
        409,
      );
    }

    await db.delete(artistSocialReferences).where(eq(artistSocialReferences.artistId, id));
    await db.delete(artists).where(eq(artists.id, id));
    return c.body(null, 204);
  });

  return router;
}
