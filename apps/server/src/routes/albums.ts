import { albumInputSchema } from "@setlister/shared";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { albums, tracks } from "../db/schema.js";
import { parseBody, parseIdParam } from "./helpers.js";

export function createAlbumsRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const all = await db.query.albums.findMany();
    return c.json(all);
  });

  router.get("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const album = await db.query.albums.findFirst({ where: eq(albums.id, id) });
    if (!album) return c.json({ error: "Album not found" }, 404);
    return c.json(album);
  });

  router.post("/", async (c) => {
    const parsed = await parseBody(c, albumInputSchema);
    if (!parsed.success) return parsed.response;

    const [created] = await db.insert(albums).values(parsed.data).returning();
    return c.json(created, 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.albums.findFirst({ where: eq(albums.id, id) });
    if (!existing) return c.json({ error: "Album not found" }, 404);

    const parsed = await parseBody(c, albumInputSchema);
    if (!parsed.success) return parsed.response;

    const [updated] = await db.update(albums).set(parsed.data).where(eq(albums.id, id)).returning();
    return c.json(updated);
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
