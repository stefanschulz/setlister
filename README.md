# SetLister

Simple management tool for playlists or setlists, e.g., for podcast management.

See [docs/konzept.md](docs/konzept.md) for the full requirements, data model, and architecture concept.

## Project layout

```
apps/
  client/   # React + TypeScript + Vite frontend
  server/   # Hono (Node.js) backend, serves the API and (in Docker) the built frontend
packages/
  shared/   # TS types/schemas shared between client and server
```

## Development

Requires Node.js >= 22.

```bash
npm install
npm run dev:server   # starts the API on http://localhost:3000
npm run dev:client   # starts the Vite dev server (proxies /api to the server above)
```

Run tests across all workspaces:

```bash
npm test
```

## Running with Docker

Builds both apps and serves the whole thing (API + frontend) from a single container:

```bash
docker compose up --build
```

Then open http://localhost:3000 — it shows the SetLister placeholder page and confirms the API is reachable (`/api/health`).
