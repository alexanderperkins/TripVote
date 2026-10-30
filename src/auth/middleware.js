import { SESSION_COOKIE, findSessionUser } from './sessions.js';

/** Minimal Cookie header parser; avoids pulling in cookie-parser for one cookie. */
export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** Populates req.user (or null) from the session cookie. */
export function loadUser(db) {
  return (req, _res, next) => {
    req.sessionToken = readCookie(req, SESSION_COOKIE);
    req.user = findSessionUser(db, req.sessionToken);
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
  next();
}
