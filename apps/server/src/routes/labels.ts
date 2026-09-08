import { labelInputSchema } from "@setlister/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { labels } from "../db/schema.js";
import { parseBody, parseIdParam } from "./helpers.js";

export function createLabelsRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const all = await db.query.labels.findMany();
    return c.json(all);
  });

  router.get("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const label = await db.query.labels.findFirst({ where: eq(labels.id, id) });
    if (!label) return c.json({ error: "Label not found" }, 404);
    return c.json(label);
  });

  router.post("/", async (c) => {
    const parsed = await parseBody(c, labelInputSchema);
    if (!parsed.success) return parsed.response;

    const [created] = await db.insert(labels).values(parsed.data).returning();
    return c.json(created, 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.labels.findFirst({ where: eq(labels.id, id) });
    if (!existing) return c.json({ error: "Label not found" }, 404);

    const parsed = await parseBody(c, labelInputSchema);
    if (!parsed.success) return parsed.response;

    const [updated] = await db.update(labels).set(parsed.data).where(eq(labels.id, id)).returning();
    return c.json(updated);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.labels.findFirst({ where: eq(labels.id, id) });
    if (!existing) return c.json({ error: "Label not found" }, 404);

    await db.delete(labels).where(eq(labels.id, id));
    return c.body(null, 204);
  });

  return router;
}
