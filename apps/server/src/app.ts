import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

export function createApp() {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  // In the Docker image, the built client assets are copied to CLIENT_DIST_PATH
  // (relative to this process's working directory). Not required for plain API
  // development/testing, only for serving the full app as in production/Docker.
  const clientDistPath = process.env.CLIENT_DIST_PATH ?? "public";
  app.use("/*", serveStatic({ root: clientDistPath }));
  app.get("*", serveStatic({ path: `${clientDistPath}/index.html` }));

  return app;
}
