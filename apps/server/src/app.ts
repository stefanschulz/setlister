import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { Db } from "./db/client.js";
import { createAlbumsRouter } from "./routes/albums.js";
import { createArtistsRouter } from "./routes/artists.js";
import { createBackupRouter } from "./routes/backup.js";
import { createEpisodesRouter } from "./routes/episodes.js";
import { createLabelsRouter } from "./routes/labels.js";
import { createOutputChannelsRouter } from "./routes/output-channels.js";
import { createSetlistsRouter } from "./routes/setlists.js";
import { createTracksRouter } from "./routes/tracks.js";

/**
 * Cache headers for the client files. Vite writes content-hashed names into
 * /assets/, so those never change and can be cached for good. Everything else
 * (index.html, favicon) is served with "no-cache" — the browser must revalidate
 * it, otherwise it can keep showing the old version after an update because
 * index.html still points at the previous, differently hashed bundle.
 */
const IMMUTABLE = "public, max-age=31536000, immutable";
const REVALIDATE = "no-cache";

export function createApp(db: Db) {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));
  app.route("/api/artists", createArtistsRouter(db));
  app.route("/api/albums", createAlbumsRouter(db));
  app.route("/api/labels", createLabelsRouter(db));
  app.route("/api/tracks", createTracksRouter(db));
  app.route("/api/episodes", createEpisodesRouter(db));
  app.route("/api/output-channels", createOutputChannelsRouter(db));
  app.route("/api/setlists", createSetlistsRouter(db));
  app.route("/api/backup", createBackupRouter(db));

  // In the Docker image, the built client assets are copied to CLIENT_DIST_PATH
  // (relative to this process's working directory). Not required for plain API
  // development/testing, only for serving the full app as in production/Docker.
  const clientDistPath = process.env.CLIENT_DIST_PATH ?? "public";
  // Sets the caching policy on the finished response (serveStatic's own onFound hook
  // runs after the response is built, so a header set there would not be sent).
  app.use("/*", async (c, next) => {
    await next();
    if (c.req.path.startsWith("/api/") || c.res.status !== 200) return;
    const isHtml = (c.res.headers.get("Content-Type") ?? "").startsWith("text/html");
    // A missing /assets/ file falls through to index.html below — that is HTML, not an asset.
    const hashedAsset = c.req.path.startsWith("/assets/") && !isHtml;
    c.res.headers.set("Cache-Control", hashedAsset ? IMMUTABLE : REVALIDATE);
  });
  app.use("/*", serveStatic({ root: clientDistPath }));
  app.get("*", serveStatic({ path: `${clientDistPath}/index.html` }));

  return app;
}
