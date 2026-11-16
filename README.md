# TripVote

AI Coding Project 2: Full-Stack Application platform that helps groups of friends plan trips together by suggesting activities, voting, and organizing itineraries.

**Live app:** <[TripVote URL](https://tripvote.onrender.com)>

**Youtube Demo Video:** [Watch on Youtube](<https://youtu.be/13jUSShFXzU>)

Docs: [API (OpenAPI)](docs/openapi.yaml) · [Architecture](docs/architecture.md) · [Database schema](docs/database-schema.md) · [PRD](PRD.pdf)

Rules for contributors and AI agents: see [AGENTS.md](AGENTS.md).

## Getting started

You need [Node.js 24](https://nodejs.org) or newer and a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
account.

### 1. Install

```bash
git clone https://github.com/alexanderperkins/TripVote.git
cd TripVote
npm install
```

### 2. Create a MongoDB database

1. In Atlas, create a free **M0** cluster.
2. **Database Access:** add a database user with a password.
3. **Network Access:** add your IP address (or `0.0.0.0/0` for development only).
4. **Connect → Drivers:** copy the connection string and add the database name `tripvote-dev` after `.net/`:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tripvote-dev?retryWrites=true&w=majority`

### 3. Configure

```bash
cp server/.env.example server/.env   # Windows: copy server\.env.example server\.env
```

Open `server/.env` and set:

- `MONGODB_URI`: your connection string.
- `JWT_SECRET`: a random secret of at least 32 characters. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Never commit `.env`.

### 4. Run

```bash
npm run dev
```

The API runs on http://localhost:4000 and the web app on http://localhost:5173. The API logs
`Connected to MongoDB` when the database works.

If it fails with `querySrv ECONNREFUSED`, add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `server/.env` and restart.

## Other commands

| Command | What it does |
| --- | --- |
| `npm test` | Runs all tests on a temporary in-memory MongoDB (the first run downloads it), not your Atlas database |
| `npm run test:e2e` | Runs the Playwright browser tests (they start their own API on a temporary database) |
| `npm run lint` | ESLint + Prettier check |
| `npm run format` | Formats the code with Prettier |

## Deployment

The app runs as one Render web service that serves the API and the built client, with the database on MongoDB Atlas. Render rebuilds and redeploys on every commit to `main`.

| Setting | Value |
| --- | --- |
| Build command | `npm install --include=dev && npm run build` |
| Start command | `npm start` |
| Environment variables | `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (values are set in Render, never in the repo) |

In Atlas, Network Access must allow Render's connections (`0.0.0.0/0` is the simple choice for a class project). Use a different `JWT_SECRET` in production than in development.

CI (`.github/workflows/ci.yml`) runs on every pull request: lint, unit and integration tests, a dependency audit, and the Playwright end-to-end tests in a separate job.

## Folder structure

`client/` is the React + Vite frontend, `server/` is the Express API, `e2e/` holds Playwright specs and `docs/`
holds API docs and diagrams. See AGENTS.md section 1.3 for the full layout.

## Individual reflections

### Yanli Wang

[Yanli Wang's individual reflection (Google Doc)](https://docs.google.com/document/d/1D0S690hxxg0_-m66EObYTMYsnYIhmWSwMXMyDRg2zAs/edit?usp=sharing)

### Alex Perkins
[Alex Perkins' individual reflection (Google Doc)](https://docs.google.com/document/d/1KZov59HFlHtQga99LzePhlFKgNi-pkKEBa5FH3SA9BI/edit?tab=t.0)
