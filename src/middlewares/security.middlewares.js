// Simple in-memory rate limiter — replace with Redis when running multiple instances.
const buckets = new Map();

// Purge expired buckets every 10 minutes to prevent unbounded Map growth.
// Without this, every unique IP+route combination accumulates forever in memory.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 10 * 60 * 1000);

// Attaches safe HTTP security headers without requiring an extra npm package.
export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // HSTS only makes sense over HTTPS
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

// Rate limiter: tracks requests per IP+route within a sliding window.
// windowMs — window length in milliseconds
// max      — maximum requests allowed per window
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 300 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.originalUrl.split("?")[0]}`;
    const now = Date.now();

    let current = buckets.get(key);

    // Reset the window if it has expired for this key
    if (!current || current.resetAt <= now) {
      current = { count: 0, resetAt: now + windowMs };
    }

    current.count += 1;
    buckets.set(key, current);

    if (current.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down and try again.",
      });
    }

    next();
  };
}

export default { securityHeaders, createRateLimiter };
