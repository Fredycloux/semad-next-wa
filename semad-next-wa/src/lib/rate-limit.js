// src/lib/rate-limit.js
// Rate limiter en memoria por IP. Funciona en un único proceso (Vercel serverless).
// Para producción multi-instancia reemplazar con Redis.

const store = new Map(); // ip -> { count, resetAt }

/**
 * Verifica si la IP puede hacer una request.
 * @param {string} ip
 * @param {object} opts
 * @param {number} opts.maxRequests - Máximo de requests por ventana (default 5)
 * @param {number} opts.windowMs   - Tamaño de la ventana en ms (default 60_000 = 1 min)
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function checkRateLimit(ip, { maxRequests = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const record = store.get(ip);

  if (!record || now > record.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Extrae la IP del request de Next.js.
 */
export function getIP(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
