import { albumInputSchema } from "@setlister/shared";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { albums, labels, tracks } from "../db/schema.js";
import { parseBody, parseIdParam } from "./helpers.js";

/** Confirms labelId, if given (i.e. not null/undefined, both meaning "no label"), references an existing label. */
async function validateLabelReference(db: Db, labelId: number | null | undefined): Promise<string | null> {
  if (labelId === undefined || labelId === null) return null;
  const label = await db.query.labels.findFirst({ where: eq(labels.id, labelId) });
  return label ? null : `Label ${labelId} not found`;
}

export function createAlbumsRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const all = await db.query.albums.findMany({ with: { label: true } });
    return c.json(all);
  });

  router.get("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const album = await db.query.albums.findFirst({ where: eq(albums.id, id), with: { label: true } });
    if (!album) return c.json({ error: "Album not found" }, 404);
    return c.json(album);
  });

  router.post("/", async (c) => {
    const parsed = await parseBody(c, albumInputSchema);
    if (!parsed.success) return parsed.response;

    const referenceError = await validateLabelReference(db, parsed.data.labelId);
    if (referenceError) return c.json({ error: referenceError }, 400);

    const [created] = await db.insert(albums).values(parsed.data).returning();
    const full = await db.query.albums.findFirst({ where: eq(albums.id, created.id), with: { label: true } });
    return c.json(full, 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.albums.findFirst({ where: eq(albums.id, id) });
    if (!existing) return c.json({ error: "Album not found" }, 404);

    const parsed = await parseBody(c, albumInputSchema);
    if (!parsed.success) return parsed.response;

    const referenceError = await validateLabelReference(db, parsed.data.labelId);
    if (referenceError) return c.json({ error: referenceError }, 400);

    await db
      .update(albums)
      .set({ ...parsed.data, labelId: parsed.data.labelId ?? null })
      .where(eq(albums.id, id));
    const full = await db.query.albums.findFirst({ where: eq(albums.id, id), with: { label: true } });
    return c.json(full);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.albums.findFirst({ where: eq(albums.id, id) });
    if (!existing) return c.json({ error: "Album not found" }, 404);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tracks)
      .where(eq(tracks.albumId, id));
    if (count > 0) {
      return c.json({ error: `Cannot delete album referenced by ${count} track(s)` }, 409);
    }

    await db.delete(albums).where(eq(albums.id, id));
    return c.body(null, 204);
  });

  return router;
}
