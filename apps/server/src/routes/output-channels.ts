import { outputChannelInputSchema } from "@setlister/shared";
import { and, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.js";
import { artistSocialReferences, outputChannels } from "../db/schema.js";
import { parseBody, parseIdParam } from "./helpers.js";

export function createOutputChannelsRouter(db: Db) {
  const router = new Hono();

  router.get("/", async (c) => {
    const all = await db.query.outputChannels.findMany();
    return c.json(all);
  });

  router.get("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const channel = await db.query.outputChannels.findFirst({ where: eq(outputChannels.id, id) });
    if (!channel) return c.json({ error: "Output channel not found" }, 404);
    return c.json(channel);
  });

  router.post("/", async (c) => {
    const parsed = await parseBody(c, outputChannelInputSchema);
    if (!parsed.success) return parsed.response;

    const clash = await db.query.outputChannels.findFirst({
      where: eq(outputChannels.name, parsed.data.name),
    });
    if (clash) return c.json({ error: `An output channel named "${parsed.data.name}" already exists` }, 400);

    const [created] = await db.insert(outputChannels).values(parsed.data).returning();
    return c.json(created, 201);
  });

  router.put("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.outputChannels.findFirst({ where: eq(outputChannels.id, id) });
    if (!existing) return c.json({ error: "Output channel not found" }, 404);

    const parsed = await parseBody(c, outputChannelInputSchema);
    if (!parsed.success) return parsed.response;

    const clash = await db.query.outputChannels.findFirst({
      where: and(eq(outputChannels.name, parsed.data.name), ne(outputChannels.id, id)),
    });
    if (clash) return c.json({ error: `An output channel named "${parsed.data.name}" already exists` }, 400);

    const [updated] = await db
      .update(outputChannels)
      .set(parsed.data)
      .where(eq(outputChannels.id, id))
      .returning();
    return c.json(updated);
  });

  router.delete("/:id", async (c) => {
    const id = parseIdParam(c);
    if (id === null) return c.json({ error: "Invalid id" }, 400);

    const existing = await db.query.outputChannels.findFirst({ where: eq(outputChannels.id, id) });
    if (!existing) return c.json({ error: "Output channel not found" }, 404);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(artistSocialReferences)
      .where(eq(artistSocialReferences.channelId, id));
    if (count > 0) {
      return c.json(
        { error: `Cannot delete output channel referenced by ${count} social reference(s)` },
        409,
      );
    }

    await db.delete(outputChannels).where(eq(outputChannels.id, id));
    return c.body(null, 204);
  });

  return router;
}
