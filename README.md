# TripVote
AI Coding Project 2: Full-Stack Application platform that helps groups of friends plan trips together by suggesting activities, voting, and organizing itineraries.

## Run locally

Requires Node.js 24+ and a MongoDB connection string (Atlas dev database).

```bash
npm install
cp server/.env.example server/.env   # then fill in MONGODB_URI and JWT_SECRET
npm run dev                          # API on :4000, web app on http://localhost:5173
```

Other commands: `npm test` (all tests), `npm run lint` (ESLint + Prettier), `npm run format`.

The first `npm test` downloads an in-memory MongoDB binary (~780 MB) for the API tests; later runs reuse it.
