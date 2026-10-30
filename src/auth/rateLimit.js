/**
 * In-memory limiter for failed login attempts, keyed by email. Good enough for a single
 * process; swap for a shared store if the app ever runs on more than one instance.
 */
export function createLoginLimiter({ maxFailures = 5, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const failures = new Map(); // key -> { count, resetAt }

  const current = (key) => {
    const entry = failures.get(key);
    if (entry && entry.resetAt <= now()) {
      failures.delete(key);
      return null;
    }
    return entry ?? null;
  };

  return {
    isBlocked(key) {
      return (current(key)?.count ?? 0) >= maxFailures;
    },
    recordFailure(key) {
      const entry = current(key);
      if (entry) entry.count += 1;
      else failures.set(key, { count: 1, resetAt: now() + windowMs });
    },
    reset(key) {
      failures.delete(key);
    },
  };
}
