import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { Db } from "./db/client.js";
import { createAlbumsRouter } from "./routes/albums.js";
import { createArtistsRouter } from "./routes/artists.js";
import { createEpisodesRouter } from "./routes/episodes.js";
import { createOutputChannelsRouter } from "./routes/output-channels.js";
import { createSetlistsRouter } from "./routes/setlists.js";
import { createTracksRouter } from "./routes/tracks.js";

export function createApp(db: Db) {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));
  app.route("/api/artists", createArtistsRouter(db));
  app.route("/api/albums", createAlbumsRouter(db));
  app.route("/api/tracks", createTracksRouter(db));
  app.route("/api/episodes", createEpisodesRouter(db));
  app.route("/api/output-channels", createOutputChannelsRouter(db));
  app.route("/api/setlists", createSetlistsRouter(db));

  // In the Docker image, the built client assets are copied to CLIENT_DIST_PATH
  // (relative to this process's working directory). Not required for plain API
  // development/testing, only for serving the full app as in production/Docker.
  const clientDistPath = process.env.CLIENT_DIST_PATH ?? "public";
  app.use("/*", serveStatic({ root: clientDistPath }));
  app.get("*", serveStatic({ path: `${clientDistPath}/index.html` }));

  return app;
}
