import { createApp } from './app.js';
import { openDb } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const db = openDb(process.env.DATABASE_PATH ?? 'tripvote.db');
const app = createApp({ db, secureCookies: process.env.NODE_ENV === 'production' });

app.listen(port, () => {
  console.log(`TripVote listening on http://localhost:${port}`);
});
