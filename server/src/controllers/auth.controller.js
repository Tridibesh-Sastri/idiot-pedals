import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

import userModel from '../models/user.model.js'
import pendingRegistrationModel from '../models/pendingRegistration.js'
import refreshModel from '../models/refreshToken.model.js'
import config from '../config/config.js'

import {
    accessTokenGenerator,
    verifyRefreshToken,
    hashToken,
} from '../utils/tokenManager.js'

import {
    createRefreshSession,
    setRefreshCookie,
    clearRefreshCookie,
} from '../services/auth.service.js'

import { sendVerificationEmail } from '../services/email.service.js'
import { getGoogleUser } from '../integrations/google/google.service.js'
import { PUBLIC_USER_FIELDS, serializeUser as publicUser } from '../utils/serializeUser.js'
import { logger } from '../utils/logger.js'


const INTERNAL_ERROR_MESSAGE = 'Internal Server Error.'

const sendInternalError = (res, message = INTERNAL_ERROR_MESSAGE) =>
    res.status(500).json({
        success: false,
        message,
    })

const normalizeEmail = (email) =>
    typeof email === 'string'
        ? email.trim().toLowerCase()
        : ''

/* ============================================================
   REGISTER
   ============================================================ */

export const registerController = async (req, res) => {
    try {
        // extract from email
        const {
            name,
            email,
            phone,
            addresses,
            password,
        } = req.body

        // normalize email
        const normalizedEmail = normalizeEmail(email)
        
        // check user exist or not
        const existingUser = await userModel
            .findOne({ email: normalizedEmail })
            .select('_id')

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    'An account already exists with this email address.',
            })
        }

        // hash password
        const passwordHash = await bcrypt.hash(
            password,
            config.SALT_ROUND
        )

        // create email verification token
        const verificationToken = crypto
            .randomBytes(32)
            .toString('hex')

        // hash email verification token
        const verificationTokenHash = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex')

        const now = Date.now()
            
        // set expiry time for verification token
        const verificationTokenExpiresAt = new Date(
            now + config.EMAIL_VERIFICATION_TOKEN_TTL_MS
        )

        // set expiry time for temporary registration
        const registrationExpiresAt = new Date(
            now + config.PENDING_REGISTRATION_TTL_MS
        )

        // save the registration data into pending rgistration collection
        const pendingRegistration =
            await pendingRegistrationModel.findOneAndUpdate(
                { email: normalizedEmail },
                {
                    $set: {
                        name: name.trim(),
                        email: normalizedEmail,
                        passwordHash,
                        phone: phone.trim(),
                        addresses,
                        verificationTokenHash,
                        verificationTokenExpiresAt,
                        registrationExpiresAt,
                    },
                },
                {
                    returnDocument: "after",
                    upsert: true,
                    setDefaultsOnInsert: true,
                    runValidators: true,
                }
            )


        try {

        // send verification email
            await sendVerificationEmail({
                name: pendingRegistration.name,
                email: pendingRegistration.email,
                token: verificationToken,
            })
        } catch (emailError) {
            // Log only a stable code: mailer errors can carry recipient
            // addresses and SMTP responses, which must never reach the logs.
            logger.error(
                { code: emailError?.code ?? 'EMAIL_SEND_FAILED' },
                'Verification email failed:'
            )

            await pendingRegistrationModel.deleteOne({
                _id: pendingRegistration._id,
                verificationTokenHash,
            })

            return res.status(503).json({
                success: false,
                message:
                    'Registration could not be completed because the verification email could not be sent.',
            })
        }

        return res.status(200).json({
            success: true,
            message:
                'Registration started successfully. Please check your email to verify your account.',
            data: {
                name: pendingRegistration.name,
                email: pendingRegistration.email,
            },
        })
    } catch (error) {
        logger.error({ err: error }, 'Register controller error:')

        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    'An account already exists with this email address.',
            })
        }

        return sendInternalError(res)
    }
}

/* ============================================================
   EMAIL VERIFICATION
   ============================================================ */

export const verifyEmailController = async (req, res) => {
    try {
        // extract the token from url query
        const { token } = req.query

        // token validation
        if (
            typeof token !== 'string' ||
            token.length !== 64 ||
            !/^[a-f0-9]+$/i.test(token)
        ) {
            return res.status(400).json({
                success: false,
                code: 'EMAIL_TOKEN_INVALID',
                message: 'Invalid verification token.',
            })
        }

        // make hash of incoming token
        const verificationTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')

        /*
         * Look the token up WITHOUT an expiry filter first, so we can tell
         * "this link expired" apart from "this token is not valid".
         */
        const pendingRegistration =
            await pendingRegistrationModel.findOne({
                verificationTokenHash,
            })

        if (!pendingRegistration) {
            return res.status(400).json({
                success: false,
                code: 'EMAIL_TOKEN_INVALID',
                message:
                    'This verification link is not valid. It may have already been used.',
            })
        }

        const now = new Date()

        if (
            pendingRegistration.verificationTokenExpiresAt <= now ||
            pendingRegistration.registrationExpiresAt <= now
        ) {
            return res.status(410).json({
                success: false,
                code: 'EMAIL_TOKEN_EXPIRED',
                message:
                    'This verification link has expired. Please register again to receive a new one.',
            })
        }

        // check does the any user exist with the pending email in main collection
        const existingUser = await userModel
            .findOne({
                email: pendingRegistration.email,
            })
            .select('_id')

        if (existingUser) {
            await pendingRegistrationModel.deleteOne({
                _id: pendingRegistration._id,
            })

            return res.status(409).json({
                success: false,
                code: 'ACCOUNT_ALREADY_VERIFIED',
                message:
                    'This email address already has a verified account. Please sign in instead.',
            })
        }

        // now create new user in main collection / user collection
        const newUser = await userModel.create({
            name: pendingRegistration.name,
            email: pendingRegistration.email,
            emailVerified: true,
            phone: pendingRegistration.phone,
            phoneVerified: false,
            authProviders: [
                {
                    provider: 'email',
                    providerId: pendingRegistration.email,
                },
            ],
            passwordHash: pendingRegistration.passwordHash,
            addresses: pendingRegistration.addresses,
            role: 'customer',
        })

        // delete the pending regitration record
        await pendingRegistrationModel.deleteOne({
            _id: pendingRegistration._id,
            verificationTokenHash,
        })

        // return with new user id, name, email, email varification status
        return res.status(200).json({
            success: true,
            code: 'EMAIL_VERIFIED',
            message:
                'Email verified successfully. Your account has been created.',
            data: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                emailVerified: newUser.emailVerified,
            },
        })
    } catch (error) {
        console.error(
            'Email verification error:',
            error?.message ?? 'unknown error'
        )

        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                code: 'ACCOUNT_ALREADY_VERIFIED',
                message:
                    'This email address already has a verified account. Please sign in instead.',
            })
        }

        return sendInternalError(res)
    }
}

/* ============================================================
   EMAIL/PASSWORD LOGIN
   ============================================================ */

export const loginController = async (req, res) => {
    try {
        // extract email and password from body and normalize the email
        const { email, password } = req.body
        const normalizedEmail = normalizeEmail(email)

        // try to find user user in the user collection 
        const user = await userModel.findOne({
            email: normalizedEmail,
        })

        // verify user exist or not
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.',
            })
        }

        // now check does the user email is verified or not
        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                message:
                    'Please verify your email before logging in.',
            })
        }

        // check does the user have any passowrd hash or not in db
        if (!user.passwordHash) {
            return res.status(401).json({
                success: false,
                message:
                    'This account does not support password login.',
            })
        }

        // now validate the password
        const isValidPassword = await bcrypt.compare(
            password,
            user.passwordHash
        )

        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.',
            })
        }

        // now create access token
        const accessToken = await accessTokenGenerator({
            userId: user._id,
            role: user.role,
        })

        // launch refresh session to
        const session = await createRefreshSession(
            user._id,
            user.role
        )

        // set the the refreshtoken and expiresat in user cookie
        setRefreshCookie(
            res,
            session.refreshToken,
            session.expiresAt
        )

        // return the user
        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: {
                user: publicUser(user),
                accessToken,
            },
        })
    } catch (error) {
        logger.error({ err: error }, 'Login controller error:')
        return sendInternalError(res)
    }
}

/* ============================================================
   REFRESH TOKEN
   ============================================================ */

export const refreshController = async (req, res) => {
    try {
        // take out the refresh token from cookies
        const oldRefreshToken =
            req.cookies?.refreshToken

        // validate the refresh token
        if (
            typeof oldRefreshToken !== 'string' ||
            oldRefreshToken.length === 0
        ) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            })
        }

        // verify refresh token
        const {
            decoded,
            error,
        } = await verifyRefreshToken(oldRefreshToken)

        if (!decoded) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message:
                    error?.name === 'TokenExpiredError'
                        ? 'Refresh token expired. Please login again.'
                        : 'Invalid refresh token.',
            })
        }

        // extract userId an role from verified token
        const { userId, role } = decoded

        // check userId and role both exist
        if (!userId || !role) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token.',
            })
        }

        // extract the user data from db using userId
        const user = await userModel
            .findById(userId)
            .select('_id role emailVerified')

        // check user email is verified or not
        if (!user || !user.emailVerified) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            })
        }

        // check user given role and stored user role is matched or not
        if (user.role !== role) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token.',
            })
        }

        // make hash of user send refresh toekn and serach document from refresh token collection
        const tokenHash = hashToken(oldRefreshToken)

        const matchedRecord = await refreshModel.findOne({
            userId: user._id,
            tokenHash,
        })

        // if user not found with the refresh token clear the user cookie
        if (!matchedRecord) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token.',
            })
        }

        // check for exire validation of the token record
        if (
            matchedRecord.expiresAt &&
            matchedRecord.expiresAt <= new Date()
        ) {
            await refreshModel.deleteOne({
                _id: matchedRecord._id,
            })

            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message:
                    'Refresh token expired. Please login again.',
            })
        }

        // check for revoke record
        if (matchedRecord.revokedAt) {
            await refreshModel.deleteMany({
                userId: user._id,
            })

            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message:
                    'Refresh token reuse detected. Please login again.',
            })
        }

        /*
         * Atomically consume this refresh token.
         *
         * This prevents two concurrent refresh requests from both
         * successfully rotating the same active token.
         */
        const consumedRecord =
            await refreshModel.findOneAndUpdate(
                {
                    _id: matchedRecord._id,
                    revokedAt: null,
                },
                {
                    $set: {
                        revokedAt: new Date(),
                    },
                },
                {
                    returnDocument: "after"
                }
            )

        if (!consumedRecord) {
            await refreshModel.deleteMany({
                userId: user._id,
            })

            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message:
                    'Refresh token reuse detected. Please login again.',
            })
        }

        // create new access token
        const newAccessToken =
            await accessTokenGenerator({
                userId: user._id,
                role: user.role,
            })

        // set new session for refresh token
        const newSession =
            await createRefreshSession(
                user._id,
                user.role
            )

        setRefreshCookie(
            res,
            newSession.refreshToken,
            newSession.expiresAt
        )

        return res.status(200).json({
            success: true,
            message: 'Token refreshed successfully.',
            accessToken: newAccessToken,
        })
    } catch (error) {
        logger.error({ err: error }, 'Refresh controller error:')

        clearRefreshCookie(res)
        return sendInternalError(res)
    }
}

/* ============================================================
   GET CURRENT USER
   ============================================================ */

export const getMeController = async (req, res) => {
    try {
        const { userId } = req.user

        const user = await userModel
            .findById(userId)
            .select(PUBLIC_USER_FIELDS)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            })
        }

        return res.status(200).json({
            success: true,
            message: 'User found successfully.',
            data: {
                user: publicUser(user),
            },
        })
    } catch (error) {
        logger.error({ err: error }, 'Get me controller error:')

        return sendInternalError(res)
    }
}

/* ============================================================
   GOOGLE CALLBACK
   ============================================================
 *
 * This endpoint is reached by a top-level browser navigation from Google, so it
 * must ALWAYS answer with a redirect — never a JSON body. Every failure path
 * redirects to FRONTEND_URL/login?error=<code>.
 *
 * The redirect target is built exclusively from config.FRONTEND_URL (validated
 * at boot) and never from query parameters, so this cannot become an open
 * redirect.
 *
 * On success the refresh cookie is set here and the SPA then calls
 * POST /api/auth/refresh to mint a short-lived access token. No access token is
 * ever placed in the URL, where it would leak via history, referrer headers and
 * server logs.
 */

const OAUTH_STATE_COOKIE = 'oauth_state'

const clearOAuthStateCookie = (res) => {
    res.clearCookie(OAUTH_STATE_COOKIE, {
        httpOnly: true,
        secure: config.IS_PRODUCTION,
        sameSite: 'lax',
        signed: true,
        path: '/',
    })
}

const redirectToFrontend = (res, path) =>
    res.redirect(302, `${config.FRONTEND_URL}${path}`)

const redirectWithError = (res, errorCode) => {
    clearOAuthStateCookie(res)
    return redirectToFrontend(
        res,
        `/login?error=${encodeURIComponent(errorCode)}`
    )
}

const timingSafeStringEqual = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false

    const left = Buffer.from(a, 'utf8')
    const right = Buffer.from(b, 'utf8')

    if (left.length !== right.length) return false

    return crypto.timingSafeEqual(left, right)
}

export const googleCallbackController = async (req, res) => {
    const { code, state } = req.query
    const savedState = req.signedCookies?.[OAUTH_STATE_COOKIE]

    // 1. Google surfaced an error (for example the user cancelled consent).
    if (typeof code !== 'string' || code.length === 0) {
        return redirectWithError(res, 'google_cancelled')
    }

    // 2. CSRF defence: the state must exist on both sides and match, compared
    //    in constant time.
    if (
        typeof state !== 'string' ||
        state.length === 0 ||
        !timingSafeStringEqual(savedState ?? '', state)
    ) {
        return redirectWithError(res, 'google_state_invalid')
    }

    // State is single-use — drop it before doing anything else.
    clearOAuthStateCookie(res)

    // 3. Exchange the authorization code for a verified Google identity.
    let googleUser
    try {
        googleUser = await getGoogleUser(code)
    } catch (error) {
        console.error(
            'Google token exchange failed:',
            error?.message ?? 'unknown error'
        )
        return redirectToFrontend(res, '/login?error=google_exchange_failed')
    }

    if (
        !googleUser ||
        typeof googleUser.email !== 'string' ||
        typeof googleUser.providerId !== 'string' ||
        !googleUser.emailVerified
    ) {
        return redirectToFrontend(
            res,
            '/login?error=google_account_unverified'
        )
    }

    try {

        const normalizedEmail =
            normalizeEmail(googleUser.email)

        let user = await userModel.findOne({
            email: normalizedEmail,
        })

        if (!user) {
            user = await userModel.create({
                name: googleUser.name,
                email: normalizedEmail,
                emailVerified: true,
                authProviders: [
                    {
                        provider: 'google',
                        providerId:
                            googleUser.providerId,
                    },
                ],
                role: 'customer',
            })

            const session =
                await createRefreshSession(
                    user._id,
                    user.role
                )

            setRefreshCookie(
                res,
                session.refreshToken,
                session.expiresAt
            )

            // New Google account: session established, hand back to the SPA.
            return redirectToFrontend(res, '/auth/callback')
        }

        const googleProvider =
            user.authProviders?.find(
                (provider) =>
                    provider.provider === 'google' &&
                    provider.providerId ===
                        googleUser.providerId
            )

        if (!googleProvider) {
            if (!user.emailVerified) {
                return redirectToFrontend(
                    res,
                    '/login?error=google_account_unverified'
                )
            }

            const emailProvider =
                user.authProviders?.find(
                    (provider) =>
                        provider.provider === 'email'
                )

            if (!emailProvider) {
                return redirectToFrontend(
                    res,
                    '/login?error=google_link_conflict'
                )
            }

            const providerAlreadyLinked =
                user.authProviders?.some(
                    (provider) =>
                        provider.provider === 'google' &&
                        provider.providerId ===
                            googleUser.providerId
                )

            if (!providerAlreadyLinked) {
                user.authProviders.push({
                    provider: 'google',
                    providerId:
                        googleUser.providerId,
                })

                await user.save()
            }
        }

        const session =
            await createRefreshSession(
                user._id,
                user.role
            )

        setRefreshCookie(
            res,
            session.refreshToken,
            session.expiresAt
        )

        // Session established (login or account link) — hand back to the SPA.
        // `googleProvider` distinguishes "signed in" from "linked"; the SPA only
        // needs the session at this point.
        void googleProvider

        return redirectToFrontend(res, '/auth/callback')
    } catch (error) {
        console.error(
            'Google authentication error:',
            error?.message ?? 'unknown error'
        )

        if (error?.code === 11000) {
            return redirectToFrontend(
                res,
                '/login?error=google_link_conflict'
            )
        }

        return redirectToFrontend(res, '/login?error=google_failed')
    }
}
