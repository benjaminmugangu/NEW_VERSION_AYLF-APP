
/**
 * Simple In-Memory Rate Limiter
 * 
 * Uses a Token Bucket algorithm approximation or simple window counter.
 * For a serverless environment like Vercel, this is not perfect (state is not shared across lambdas),
 * but it handles the "brute-force" or "rapid-fire" scripts comfortably on a single instance or container.
 * 
 * Ideally, use Redis (Upstash) for distributed state.
 * This implementation is a fallback to avoid external dependencies setup.
 */

interface RateLimitConfig {
    uniqueTokenPerInterval: number; // Max users to track (to avoid memory leak)
    interval: number; // Time window in ms
    limit: number; // Max requests per window
}

const trackers = new Map<string, { count: number; expiresAt: number }>();
const MAX_TRACKED_IPS = 5000;

export async function rateLimit(ip: string, config: RateLimitConfig = { uniqueTokenPerInterval: 500, interval: 60000, limit: 10 }) {
    const now = Date.now();
    const record = trackers.get(ip);

    // Clean up if map is too big (naive LRU approximation by clearing old entries rarely)
    // Real LRU is better but complex. Since this is "simple", we just prevent infinite growth.
    if (trackers.size > config.uniqueTokenPerInterval) {
        // If we're tracking too many IPs, clear everything. It's aggressive but safe for memory.
        trackers.clear();
    }

    if (!record || now > record.expiresAt) {
        // New window
        trackers.set(ip, {
            count: 1,
            expiresAt: now + config.interval
        });
        return { success: true };
    }

    // Active window
    if (record.count >= config.limit) {
        return { success: false, limit: config.limit, remaining: 0, reset: record.expiresAt };
    }

    // Increment
    record.count++;
    return { success: true, limit: config.limit, remaining: config.limit - record.count, reset: record.expiresAt };
};
