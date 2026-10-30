import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'tripvote_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Only a hash of the token is stored, so a leaked database can't be used to hijack sessions.
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function createSession(db, userId, now = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    userId,
    expiresAt,
  );
  return { token, expiresAt };
}

/** Returns the session's user, or null if the token is unknown or expired. */
export function findSessionUser(db, token, now = Date.now()) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.display_name AS displayName, s.expires_at AS expiresAt
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`,
    )
    .get(hashToken(token));
  if (!row) return null;
  if (row.expiresAt <= now) {
    deleteSession(db, token);
    return null;
  }
  return { id: row.id, email: row.email, displayName: row.displayName };
}

export function deleteSession(db, token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}
