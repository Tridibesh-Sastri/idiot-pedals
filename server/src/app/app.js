import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRouter from '../routers/auth.routes.js'
import userRouter from '../routers/users.routes.js'
import orderRouter from '../routers/order.routes.js'
import productRouter from '../routers/product.routes.js'
import paymentRouter from '../routers/payment.routes.js'
import webhookRouter from "../routers/webhook.routes.js";
import config from '../config/config.js'

const app = express()

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
const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'Too many requests. Please try again later.',
    },
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

    // Server-side logging.
    // Do not log sensitive request data such as passwords,
    // refresh tokens or verification tokens.
    console.error('Unhandled application error:', {
        message: err.message,
        statusCode,
        method: req.method,
        path: req.originalUrl,
        stack: config.IS_PRODUCTION ? undefined : err.stack,
    })

    /*
     * Never expose internal error details in production.
     */
    if (config.IS_PRODUCTION) {
        return res.status(statusCode).json({
            success: false,
            message:
                statusCode === 500
                    ? 'Internal server error'
                    : err.message,
        })
    }

    return res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        // Omitted unless explicitly opted in via DEBUG_EXPOSE_STACK.
        ...(exposeStack ? { stack: err.stack } : {}),
    })
})

export default app