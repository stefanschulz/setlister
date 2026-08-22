import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

describe("health endpoint", () => {
  it("responds with ok status", async () => {
    const { db } = createDb(":memory:");
    runMigrations(db);
    const app = createApp(db);

    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
