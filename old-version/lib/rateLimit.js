const cache = new Map();

// In-memory rate limiting implementation
// limit: number of allowed requests in the window
// windowMs: duration of the rolling window in milliseconds (e.g. 60000ms = 1 minute)
export function rateLimiter(ip, limit = 5, windowMs = 60000) {
  if (!ip) return { isBlocked: false, remaining: limit };

  const now = Date.now();
  const userData = cache.get(ip) || { count: 0, resetTime: now + windowMs };

  // Reset count if window has expired
  if (now > userData.resetTime) {
    userData.count = 0;
    userData.resetTime = now + windowMs;
  }

  userData.count += 1;
  cache.set(ip, userData);

  const remaining = Math.max(0, limit - userData.count);
  const isBlocked = userData.count > limit;

  return {
    isBlocked,
    remaining,
    resetTime: userData.resetTime,
  };
}
