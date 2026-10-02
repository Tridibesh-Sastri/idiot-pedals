import crypto from 'node:crypto'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import mongoose from 'mongoose'

import authRouter from '../routers/auth.routes.js'
import userRouter from '../routers/users.routes.js'
import orderRouter from '../routers/order.routes.js'
import productRouter from '../routers/product.routes.js'
import paymentRouter from '../routers/payment.routes.js'
import webhookRouter from "../routers/webhook.routes.js";
import config from '../config/config.js'
import { createRateLimiter } from '../middlewares/rateLimiter.js'
import { logger } from '../utils/logger.js'

const app = express()

/*
 * -------------------------------------------------------
 * REQUEST ID
 * -------------------------------------------------------
 *
 * Every request gets a correlation id that is echoed back in the
 * X-Request-Id response header and attached to error responses and logs, so a
 * client report can be traced to a specific server-side log line.
 *
 * A client-supplied id is reused when present (bounded and sanitised), which
 * keeps a trace intact across services.
 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/

app.use((req, res, next) => {
    const incoming = req.get('x-request-id')
    const requestId =
        typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming)
            ? incoming
            : crypto.randomUUID()

    req.id = requestId
    res.setHeader('X-Request-Id', requestId)

    next()
})

/*
 * -------------------------------------------------------
 * HEALTH ENDPOINTS
 * -------------------------------------------------------
 *
 * Registered BEFORE the global rate limiter: a probe that gets throttled would
 * report the service as unhealthy while it is actually serving traffic.
 *
 *  /healthz — liveness. The process is up and the event loop responds.
 *  /readyz  — readiness. Also requires a usable MongoDB connection.
 */

app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) })
})

app.get('/readyz', (req, res) => {
    // readyState 1 === connected
    const mongoReady = mongoose.connection.readyState === 1

    if (!mongoReady) {
        return res.status(503).json({ status: 'unavailable', mongo: 'disconnected' })
    }

    return res.status(200).json({ status: 'ok', mongo: 'connected' })
})


/*
 * -------------------------------------------------------
 * TRUST PROXY
 * -------------------------------------------------------
 *
 * Enable this when the application is deployed behind a
 * reverse proxy such as Cloudflare/Nginx.
 *
 * This is intentionally kept configurable so local
 * development does not blindly trust proxy headers.
 */
if (config.TRUST_PROXY !== undefined) {
    app.set('trust proxy', config.TRUST_PROXY)
}

/*
 * -------------------------------------------------------
 * SECURITY HEADERS
 * -------------------------------------------------------
 *
 * Helmet sets a collection of HTTP security headers.
 *
 * We are intentionally not defining an aggressive CSP here
 * because the frontend/3D asset requirements should be
 * evaluated before locking down CSP directives.
 */
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
)

/*
 * -------------------------------------------------------
 * CORS
 * -------------------------------------------------------
 *
 * The frontend URL must be explicitly allowed.
 *
 * Credentials are enabled because the refresh token is
 * stored in an HTTP-only cookie.
 */
/*
 * The CORS allow-list comes exclusively from FRONTEND_URL (see config.js),
 * which is validated at boot as a list of exact origins. There is deliberately
 * no implicit development allowance and no wildcard support — to run the SPA
 * locally, set FRONTEND_URL to the real dev origin (e.g. http://localhost:3000).
 */
app.use(
    cors({
        origin(origin, callback) {
            // Allow requests without an Origin header (curl, server-to-server,
            // and Razorpay webhooks do not send one).
            if (!origin) {
                return callback(null, true)
            }

            if (config.CORS_ORIGINS.includes(origin)) {
                return callback(null, true)
            }

            /*
             * Disallowed origin: respond without CORS headers instead of
             * throwing. The browser blocks the response for the caller, and the
             * API does not turn a routine cross-origin request into a 500 with a
             * stack trace in the body.
             */
            return callback(null, false)
        },

        credentials: true,

        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS'
        ],

        allowedHeaders: [
            'Content-Type',
            'Authorization'
        ],
    })
)
/*
 * -------------------------------------------------------
 * RAZORPAY WEBHOOKS
 * -------------------------------------------------------
 *
 * Must be registered BEFORE express.json().
 *
 * Razorpay webhook signature verification requires the
 * exact raw HTTP request body.
 */


app.use(
    "/api/webhooks",
    webhookRouter
)

/*
 * -------------------------------------------------------
 * REQUEST BODY LIMIT
 * -------------------------------------------------------
 *
 * Prevent unnecessarily large JSON payloads from reaching
 * application code.
 *
 * This is not a substitute for endpoint-specific validation.
 */
app.use(
    express.json({
        limit: '100kb',
    })
)

app.use(
    express.urlencoded({
        extended: false,
        limit: '100kb',
    })
)

/*
 * -------------------------------------------------------
 * COOKIE PARSER
 * -------------------------------------------------------
 */
app.use(cookieParser(config.COOKIE_SECRET));


/*
 * -------------------------------------------------------
 * GLOBAL RATE LIMIT
 * -------------------------------------------------------
 *
 * This is only a baseline application-wide limiter.
 *
 * Sensitive endpoints such as login, registration,
 * verification and refresh should receive stricter
 * route-level limits later.
 */
/*
 * -------------------------------------------------------
 * GLOBAL RATE LIMIT
 * -------------------------------------------------------
 *
 * Baseline application-wide limiter. Sensitive endpoints (login, register,
 * verify-email, payments, google) additionally carry their own stricter
 * route-level limits.
 *
 * The store is in-process, so these limits are per-instance — documented in
 * KNOWN_GAPS.md.
 */
const globalRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    message: 'Too many requests. Please try again later.',
})

app.use(globalRateLimiter)

/*
 * -------------------------------------------------------
 * ROUTES
 * -------------------------------------------------------
 */
app.use('/api/auth', authRouter)

app.use('/api/users', userRouter)

app.use('/api/order', orderRouter)

app.use('/api/products', productRouter)

app.use('/api/payments', paymentRouter)

/*
 * -------------------------------------------------------
 * 404 HANDLER
 * -------------------------------------------------------
 *
 * Must appear after all application routes.
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestId: req.id,
    })
})

/*
 * -------------------------------------------------------
 * GLOBAL ERROR HANDLER
 * -------------------------------------------------------
 *
 * Express error middleware must have four arguments.
 *
 * Do not expose stack traces or internal database/provider
 * errors to clients in production.
 */
app.use((err, req, res, next) => {
    const statusCode =
        Number.isInteger(err.statusCode) &&
        err.statusCode >= 400 &&
        err.statusCode < 600
            ? err.statusCode
            : 500

    /*
     * Stack traces are only ever returned when explicitly opted in via
     * DEBUG_EXPOSE_STACK, and never in production. Default: not exposed.
     */
    const exposeStack =
        config.DEBUG_EXPOSE_STACK === true && !config.IS_PRODUCTION

    // Server-side logging via the redacting logger.
    // It censors credentials, signatures, tokens and whole provider payloads,
    // and omits the stack in production.
    logger.error(
        {
            err,
            requestId: req.id,
            statusCode,
            method: req.method,
            path: req.originalUrl,
        },
        'Unhandled application error'
    )

    /*
     * The request id is always returned so a client report can be correlated
     * with the server-side log line above.
     */
    if (config.IS_PRODUCTION) {
        return res.status(statusCode).json({
            success: false,
            message:
                statusCode === 500
                    ? 'Internal server error'
                    : err.message,
            requestId: req.id,
        })
    }

    return res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        requestId: req.id,
        // Omitted unless explicitly opted in via DEBUG_EXPOSE_STACK.
        ...(exposeStack ? { stack: err.stack } : {}),
    })
})

export default app