import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

const dbPath = process.env.DB_PATH ?? "./data/setlister.sqlite";
const { db } = createDb(dbPath);
runMigrations(db);

const app = createApp(db);
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`SetLister server listening on http://localhost:${info.port}`);
});
