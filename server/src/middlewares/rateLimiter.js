import rateLimit from 'express-rate-limit'

/**
 * Shared rate-limiter factory (express-rate-limit, already a dependency).
 *
 * The store is express-rate-limit's default in-process MemoryStore. That means
 * limits are enforced PER NODE PROCESS, not across a cluster: running N
 * instances multiplies the effective allowance by N. See KNOWN_GAPS.md.
 *
 * `store` is accepted so a shared store can be supplied in exactly one place
 * (here) without touching any route if the deployment ever needs one.
 */
export const createRateLimiter = ({
    windowMs,
    limit,
    message,
    store,
    keyGenerator,
}) => {
    const options = {
        windowMs,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
            success: false,
            message,
        },
    }

    if (store) options.store = store
    if (keyGenerator) options.keyGenerator = keyGenerator

    return rateLimit(options)
}

export default createRateLimiter
