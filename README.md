# TripVote

AI Coding Project 2: Full-Stack Application platform that helps groups of friends plan trips together by suggesting activities, voting, and organizing itineraries.

Rules for contributors and AI agents: see [AGENTS.md](AGENTS.md).

## Requirements

- Node.js 24 or newer
- A MongoDB connection string (optional for now; the API starts without one)

## Run locally

```bash
npm install
cp server/.env.example server/.env   # Windows: copy server\.env.example server\.env
npm run dev                          # API on http://localhost:4000, web app on http://localhost:5173
```

`npm run dev` starts the Express API and the Vite dev server together. Check the API at
http://localhost:4000/api/health (returns `{"status":"ok"}`). The web app proxies `/api` to the API.

## Other commands

| Command | What it does |
| --- | --- |
| `npm test` | Runs all Vitest tests (client and server) |
| `npm run lint` | ESLint + Prettier check |
| `npm run format` | Formats the code with Prettier |

## MongoDB setup

Each developer uses their own dev database; tests never touch it.

1. Create a free account at https://www.mongodb.com/cloud/atlas and create a free **M0** cluster.
2. **Database Access:** add a database user with a username and password.
3. **Network Access:** add your current IP address (or `0.0.0.0/0` for development only).
4. **Connect → Drivers:** copy the connection string and add a database name, for example
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tripvote-dev`.
5. Put it in `server/.env` as `MONGODB_URI=...`. Never commit `.env`.
6. Restart `npm run dev`. The API logs `Connected to MongoDB`.

Without `MONGODB_URI` the API still starts and logs a warning, so the framework can be run before the database
exists. A local MongoDB (`mongodb://localhost:27017/tripvote-dev`) works too.

If the API fails with `querySrv ECONNREFUSED`, Node could not look up the Atlas SRV record with your system DNS.
Add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `server/.env` and restart.

## Folder structure

`client/` is the React + Vite frontend, `server/` is the Express API, `e2e/` holds Playwright specs and `docs/`
holds API docs and diagrams. See AGENTS.md section 1.3 for the full layout.
