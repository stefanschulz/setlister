import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

// Serves a tiny fake client build (index.html + one hashed asset) through the real app.
let dir: string;
let app: ReturnType<typeof createApp>;
let previousPath: string | undefined;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "setlister-client-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), "<!doctype html><title>SetLister</title>");
  writeFileSync(join(dir, "favicon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
  writeFileSync(join(dir, "assets", "index-abc123.js"), "console.log('app')");

  previousPath = process.env.CLIENT_DIST_PATH;
  process.env.CLIENT_DIST_PATH = dir;
  const { db } = createDb(":memory:");
  runMigrations(db);
  app = createApp(db);
});

afterAll(() => {
  if (previousPath === undefined) delete process.env.CLIENT_DIST_PATH;
  else process.env.CLIENT_DIST_PATH = previousPath;
  rmSync(dir, { recursive: true, force: true });
});

describe("Cache-Control for the client files", () => {
  it("lets the browser keep hashed assets forever", async () => {
    const res = await app.request("/assets/index-abc123.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("makes the browser revalidate index.html at the root", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("SetLister");
    expect(res.headers.get("cache-control")).toBe("no-cache");
  });

  it("makes the browser revalidate unhashed files such as the favicon", async () => {
    const res = await app.request("/favicon.svg");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-cache");
  });

  it("serves index.html with no-cache for client-side routes (SPA fallback)", async () => {
    const res = await app.request("/episodes/12");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("SetLister");
    expect(res.headers.get("cache-control")).toBe("no-cache");
  });

  it("does not cache the fallback for a missing asset as if it were immutable", async () => {
    const res = await app.request("/assets/index-doesnotexist.js");
    expect(res.headers.get("cache-control")).toBe("no-cache");
  });

  it("leaves the API responses without a caching policy of their own", async () => {
    const res = await app.request("/api/health");
    expect(res.headers.get("cache-control")).toBeNull();
  });
});
