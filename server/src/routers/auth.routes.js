import express from 'express'
import rateLimit from 'express-rate-limit'
import crypto from 'node:crypto'

import authenticateMiddleware from '../middlewares/authenticate.js'

import config from '../config/config.js'

import {
    registerController,
    loginController,
    refreshController,
    getMeController,
    verifyEmailController,
    googleCallbackController,
} from '../controllers/auth.controller.js'

import {
    logoutController,
} from '../controllers/logoutController.js'

import {
    getGoogleAuthUrl,
} from '../integrations/google/google.service.js'

import {
    registerValidator,
    loginValidator,
    validateRefreshCookie,
    validateVerifyEmail
} from '../validators/auth.validator.js'

const router = express.Router()

/*
 * ============================================================
 * AUTH-SPECIFIC RATE LIMITERS
 * ============================================================
 *
 * These are intentionally stricter than the global API limiter.
 *
 * The global limiter protects the whole application.
 * These limiters specifically protect authentication endpoints
 * against brute-force and abuse.
 */

/*
 * Registration:
 * Prevent mass account creation / email abuse.
 */
const registerRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message:
            'Too many registration attempts. Please try again later.',
    },
})

/*
 * Login:
 * More restrictive because this endpoint handles credentials.
 */
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message:
            'Too many login attempts. Please try again later.',
    },
})

/*
 * Refresh:
 * Refresh should normally be called automatically by the
 * frontend, so allow more requests than login/register.
 */
const refreshRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message:
            'Too many refresh requests. Please try again later.',
    },
})

/*
 * Email verification:
 * Protect token verification from automated abuse.
 */
const verificationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message:
            'Too many verification attempts. Please try again later.',
    },
})

/*
 * Google OAuth:
 * Protect authorization/callback endpoints from excessive
 * automated requests.
 */
const googleRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        message:
            'Too many authentication requests. Please try again later.',
    },
})

/*
 * Logout is intentionally not heavily restricted.
 * Logout should remain reliable and idempotent.
 */

/*
 * ============================================================
 * REGISTRATION
 * ============================================================
 */

router.post(
    '/register',
    registerRateLimiter,
    registerValidator,
    registerController
)

/*
 * ============================================================
 * LOGIN
 * ============================================================
 */

router.post(
    '/login',
    loginRateLimiter,
    loginValidator,
    loginController
)

/*
 * ============================================================
 * REFRESH TOKEN
 * ============================================================
 *
 * The refresh token is stored in an HTTP-only cookie.
 * No request-body validator is required.
 */

router.post(
    '/refresh',
    validateRefreshCookie,
    refreshController
)

/*
 * ============================================================
 * LOGOUT
 * ============================================================
 *
 * Logout is intentionally idempotent.
 * It can safely be called even when the refresh token is
 * missing or already invalid.
 */

router.post(
    '/logout',
    logoutController
)

/*
 * ============================================================
 * CURRENT USER
 * ============================================================
 */

router.get(
    '/me',
    authenticateMiddleware,
    getMeController
)

/*
 * ============================================================
 * EMAIL VERIFICATION
 * ============================================================
 *
 * GET is appropriate here because the verification link is
 * opened directly from an email.
 *
 * The controller validates the token before changing account
 * state.
 */

router.get(
    '/verify-email',
    verificationRateLimiter,
    validateVerifyEmail,
    verifyEmailController
)

/*
 * ============================================================
 * GOOGLE OAUTH — START
 * ============================================================
 *
 * The state value is minted here and stored ONLY in a signed, httpOnly,
 * SameSite=Lax cookie. SameSite=Lax is required (Strict would not be sent on
 * Google's top-level redirect back to us). The callback validates it; nothing
 * is kept in process memory, so this survives restarts and multiple instances.
 */

router.get(
    '/google',
    googleRateLimiter,
    (req, res) => {

        // 1. Generate a random, cryptographically secure 32-byte token
        const state = crypto.randomBytes(32).toString('base64url');

        // 2. Store it in a secure, signed cookie (valid for 15 minutes)
        res.cookie('oauth_state', state, {
            httpOnly: true,
            secure: config.IS_PRODUCTION,
            sameSite: 'lax', // Mandatory 'lax' or 'none' for cross-site auth redirection paths
            signed: true,    // Cryptographically signed via COOKIE_SECRET to prevent client tampering
            path: '/',
            maxAge: 15 * 60 * 1000 // 15 minutes TTL
        });

        // 3. Inject the state parameter into the Google URL builder service
        const authUrl = getGoogleAuthUrl(state)

        return res.redirect(authUrl)
    }
)

/*
 * ============================================================
 * GOOGLE OAUTH — CALLBACK
 * ============================================================
 *
 * This route always answers with a 302 into the SPA — never JSON. Code/state
 * validation and single-use state clearing are handled inside the controller
 * so every failure path can redirect to FRONTEND_URL/login?error=<code>.
 */

router.get(
    '/google/callback',
    googleRateLimiter,
    googleCallbackController
)

export default router