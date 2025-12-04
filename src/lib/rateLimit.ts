/**
 * Simple in-memory rate limiter for API routes
 * For production with multiple instances, use Upstash Redis or similar
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
        if (entry.resetTime < now) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
    /**
     * Maximum number of requests allowed in the window
     */
    limit: number;
    /**
     * Time window in seconds
     */
    windowSeconds: number;
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetIn: number;
}

/**
 * Check if a request is allowed based on rate limiting
 * @param identifier - Unique identifier for the rate limit (e.g., IP, user ID)
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if the request is allowed
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { limit: 60, windowSeconds: 60 }
): RateLimitResult {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const key = `${identifier}`;

    const entry = rateLimitMap.get(key);

    if (!entry || entry.resetTime < now) {
        // First request or window expired
        rateLimitMap.set(key, {
            count: 1,
            resetTime: now + windowMs,
        });
        return {
            success: true,
            remaining: config.limit - 1,
            resetIn: config.windowSeconds,
        };
    }

    if (entry.count >= config.limit) {
        // Rate limit exceeded
        return {
            success: false,
            remaining: 0,
            resetIn: Math.ceil((entry.resetTime - now) / 1000),
        };
    }

    // Increment counter
    entry.count++;
    return {
        success: true,
        remaining: config.limit - entry.count,
        resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
}

/**
 * Rate limit configurations for different API types
 */
export const RATE_LIMITS = {
    // Standard API endpoints
    api: { limit: 60, windowSeconds: 60 },

    // Login/Auth endpoints - stricter to prevent brute force
    auth: { limit: 10, windowSeconds: 60 },

    // File upload endpoints
    upload: { limit: 10, windowSeconds: 300 },

    // Export endpoints (heavy operations)
    export: { limit: 5, windowSeconds: 60 },

    // Admin operations
    admin: { limit: 30, windowSeconds: 60 },
} as const;

/**
 * Get client identifier from request (IP or user ID)
 * @param request - NextRequest object
 * @param userId - Optional user ID for authenticated requests
 */
export function getClientIdentifier(
    request: Request,
    userId?: string
): string {
    if (userId) {
        return `user:${userId}`;
    }

    // Try to get IP from various headers (works with proxies/Vercel)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    if (forwardedFor) {
        return `ip:${forwardedFor.split(',')[0].trim()}`;
    }
    if (realIp) {
        return `ip:${realIp}`;
    }

    return 'ip:unknown';
}

/**
 * Create rate limit response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult) {
    return new Response(
        JSON.stringify({
            error: 'Trop de requêtes. Veuillez réessayer plus tard.',
            retryAfter: result.resetIn,
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': result.resetIn.toString(),
                'Retry-After': result.resetIn.toString(),
            },
        }
    );
}
