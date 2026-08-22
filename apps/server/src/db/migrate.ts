import { fileURLToPath } from "node:url";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type Db } from "./client.js";

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

export function runMigrations(db: Db) {
  migrate(db, { migrationsFolder });
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const dbPath = process.env.DB_PATH ?? "./data/setlister.sqlite";
  const { db } = createDb(dbPath);
  runMigrations(db);
  console.log(`Migrations applied to ${dbPath}`);
}
