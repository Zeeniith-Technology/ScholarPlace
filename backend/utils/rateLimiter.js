
/**
 * Simple In-Memory Rate Limiter (Token Bucket)
 * Prevents students from spamming execution APIs and draining JDoodle credits.
 * 
 * Logic:
 * - Each student has a bucket of tokens.
 * - Executing code costs 1 token.
 * - Tokens refill over time.
 * - If bucket is empty, request is rejected.
 */

const RATE_LIMITS = {
    // "Run Code" button (Debounce spam clicking)
    'run': {
        maxTokens: 3,           // Burst: Allow 3 quick runs
        refillRate: 20000,      // Refill: 1 token every 20 seconds
        cost: 1
    },
    // "Submit Solution" (Expensive: consumes multiple JDoodle credits)
    'submit': {
        maxTokens: 2,           // Burst: Allow 2 quick submits
        refillRate: 60000,      // Refill: 1 token every 60 seconds
        cost: 1
    }
};

// Storage: Map<studentId, Map<actionType, { tokens, lastRefill }>>
const limits = new Map();

/**
 * Check if user is allowed to perform action
 * @param {string|ObjectId} userId - Student ID
 * @param {string} action - 'run' or 'submit'
 * @returns {object} { allowed: boolean, waitTime: number (seconds) }
 */
export function checkRateLimit(userId, action) {
    if (!userId) return { allowed: true, waitTime: 0 }; // Should not happen if auth middleware works

    userId = userId.toString();
    const config = RATE_LIMITS[action];

    if (!config) return { allowed: true, waitTime: 0 }; // Unknown action, allow it

    // Initialize user limits if not exists
    if (!limits.has(userId)) {
        limits.set(userId, new Map());
    }
    const userLimits = limits.get(userId);

    const now = Date.now();
    let bucket = userLimits.get(action);

    if (!bucket) {
        // First time: Give full bucket
        bucket = { tokens: config.maxTokens, lastRefill: now };
        userLimits.set(action, bucket);
    } else {
        // Refill tokens based on time passed
        const elapsed = now - bucket.lastRefill;
        const tokensToAdd = Math.floor(elapsed / config.refillRate);

        if (tokensToAdd > 0) {
            bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now; // Update timestamp
        }
    }

    // Check if enough tokens
    if (bucket.tokens >= config.cost) {
        bucket.tokens -= config.cost;
        return { allowed: true, waitTime: 0 };
    } else {
        // Calculate wait time
        const timeToNextToken = config.refillRate - (now - bucket.lastRefill);
        return { allowed: false, waitTime: Math.ceil(timeToNextToken / 1000) };
    }
}

// Cleanup old entries every hour to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [userId, userLimits] of limits.entries()) {
        let active = false;
        for (const [action, bucket] of userLimits.entries()) {
            if (now - bucket.lastRefill < 3600000) { // 1 hour
                active = true;
                break;
            }
        }
        if (!active) limits.delete(userId);
    }
}, 3600000);
