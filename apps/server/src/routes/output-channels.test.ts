import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { artists, artistSocialReferences } from "../db/schema.js";

let db: Db;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  ({ db } = createDb(":memory:"));
  runMigrations(db);
  app = createApp(db);
});

const HEADLINE_PATTERN = "{headline} at episode {episode} having {artists}";

async function createChannel(body: Record<string, unknown>) {
  return app.request("/api/output-channels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/output-channels", () => {
  it("creates an output channel", async () => {
    const res = await createChannel({
      name: "Facebook",
      pattern: "{artists} ({album})",
      headlinePattern: HEADLINE_PATTERN,
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      name: "Facebook",
      pattern: "{artists} ({album})",
      headlinePattern: HEADLINE_PATTERN,
    });
  });

  it("rejects a missing name", async () => {
    const res = await createChannel({ pattern: "{artists}", headlinePattern: HEADLINE_PATTERN });
    expect(res.status).toBe(400);
  });

  it("rejects a missing pattern", async () => {
    const res = await createChannel({ name: "Facebook", headlinePattern: HEADLINE_PATTERN });
    expect(res.status).toBe(400);
  });

  it("rejects a missing headlinePattern", async () => {
    const res = await createChannel({ name: "Facebook", pattern: "{artists}" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate name", async () => {
    await createChannel({ name: "Facebook", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN });
    const res = await createChannel({
      name: "Facebook",
      pattern: "{artists} ({album})",
      headlinePattern: HEADLINE_PATTERN,
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/output-channels", () => {
  it("lists and fetches channels", async () => {
    const created = await (
      await createChannel({ name: "Facebook", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN })
    ).json();

    const list = await (await app.request("/api/output-channels")).json();
    expect(list).toHaveLength(1);

    const single = await app.request(`/api/output-channels/${created.id}`);
    expect(single.status).toBe(200);
  });

  it("returns 404 for a missing channel", async () => {
    const res = await app.request("/api/output-channels/999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/output-channels/:id", () => {
  it("updates a channel", async () => {
    const created = await (
      await createChannel({ name: "Facebook", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN })
    ).json();

    const res = await app.request(`/api/output-channels/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Facebook",
        pattern: "{artists} ({album})",
        headlinePattern: HEADLINE_PATTERN,
      }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ pattern: "{artists} ({album})" });
  });

  it("rejects renaming to a name already used by another channel", async () => {
    await createChannel({ name: "Facebook", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN });
    const other = await (
      await createChannel({ name: "Instagram", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN })
    ).json();

    const res = await app.request(`/api/output-channels/${other.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Facebook", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a missing channel", async () => {
    const res = await app.request("/api/output-channels/999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/output-channels/:id", () => {
  it("deletes an unreferenced channel", async () => {
    const created = await (
      await createChannel({ name: "Facebook", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN })
    ).json();

    const res = await app.request(`/api/output-channels/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  it("returns 409 when the channel is referenced by a social reference", async () => {
    const created = await (
      await createChannel({ name: "Facebook", pattern: "{artists}", headlinePattern: HEADLINE_PATTERN })
    ).json();
    const [artist] = await db.insert(artists).values({ name: "Artist" }).returning();
    await db
      .insert(artistSocialReferences)
      .values({ artistId: artist.id, channelId: created.id, referenceName: "@artist" });

    const res = await app.request(`/api/output-channels/${created.id}`, { method: "DELETE" });
    expect(res.status).toBe(409);
  });
});
