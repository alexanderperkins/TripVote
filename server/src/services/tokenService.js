import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';

export function signToken(userId, { secret, expiresIn }) {
  return jwt.sign({ sub: userId }, secret, { algorithm: ALGORITHM, expiresIn });
}

// Returns the user id from a valid token, or null for a missing, invalid or expired one.
export function verifyToken(token, { secret }) {
  if (!token) return null;
  try {
    return jwt.verify(token, secret, { algorithms: [ALGORITHM] }).sub;
  } catch {
    return null;
  }
}
