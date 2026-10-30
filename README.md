# TripVote
AI Coding Project 2: Full-Stack Application platform that helps groups of friends plan trips together by suggesting activities, voting, and organizing itineraries.

## Getting started

Requires Node.js 22.13+ (uses the built-in `node:sqlite`).

```sh
npm install
npm start        # http://localhost:3000  (sign up at /signup, log in at /login)
npm test
```

Environment variables: `PORT` (default `3000`), `DATABASE_PATH` (default `tripvote.db`),
`NODE_ENV=production` to mark the session cookie `Secure` (requires HTTPS).

## Auth API

| Method | Path               | Body                                   | Result                              |
| ------ | ------------------ | -------------------------------------- | ----------------------------------- |
| POST   | `/api/auth/signup` | `{ email, password, displayName }`     | `201 { user }` + session cookie     |
| POST   | `/api/auth/login`  | `{ email, password }`                  | `200 { user }` + session cookie     |
| POST   | `/api/auth/logout` | —                                      | `204`, session revoked              |
| GET    | `/api/auth/me`     | —                                      | `200 { user }` or `401`             |

Validation errors return `400 { error, fields }`; a taken email returns `409`; bad credentials
return `401`; repeated failed logins for one email return `429` for 15 minutes.
