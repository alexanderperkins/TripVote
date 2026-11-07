# TripVote

AI Coding Project 2: Full-Stack Application platform that helps groups of friends plan trips together by suggesting activities, voting, and organizing itineraries.

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
| `npm run lint` | ESLint + Prettier check |
| `npm run format` | Formats the code with Prettier |

## Folder structure

`client/` is the React + Vite frontend, `server/` is the Express API, `e2e/` holds Playwright specs and `docs/`
holds API docs and diagrams. See AGENTS.md section 1.3 for the full layout.
