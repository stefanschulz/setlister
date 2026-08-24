# SetLister

Simple management tool for playlists or setlists, e.g., for podcast management.

Built for single-user, local/self-hosted use: there's no login or multi-user access control, so anyone who can reach the running instance has full access.

See [docs/konzept.md](docs/konzept.md) for the full requirements, data model, and architecture concept.

## Project layout

```
apps/
  client/   # React + TypeScript + Vite frontend
  server/   # Hono (Node.js) backend: REST API, Drizzle/SQLite data layer, serves the built frontend in Docker
packages/
  shared/   # TS types, Zod validation schemas, and output-formatting logic shared between client and server
```

## Development

Requires Node.js >= 22.

```bash
npm install
npm run dev:server   # migrates the local SQLite DB, then starts the API on http://localhost:3000
npm run dev:client   # starts the Vite dev server on http://localhost:5173 (proxies /api to the server above)
```

The dev server uses a local SQLite file at `apps/server/data/setlister.sqlite` (gitignored). Useful commands from `apps/server`:

```bash
npm run db:generate   # after changing src/db/schema.ts: generate a new migration
npm run db:migrate    # apply pending migrations
npm run db:seed       # populate the DB with example data (a compilation album covering every contributor role)
```

Run tests across all workspaces:

```bash
npm test
```

## Running with Docker

Requires [Docker](https://docs.docker.com/get-docker/) with Compose (included in current Docker Desktop installs). [Podman](https://podman.io/) works too via `podman compose` — the Dockerfile and compose file use nothing Docker-Desktop-specific.

Builds both apps and serves the whole thing (API + frontend) from a single container, with the SQLite database persisted in a named volume across restarts:

```bash
docker compose up --build
```

Then open http://localhost:3000. To reset all data, remove the volume too: `docker compose down -v`.

The Docker image is production-only (no `tsx`/dev tooling), so `db:seed` isn't available there — seed via the running app's UI or its REST API instead.
