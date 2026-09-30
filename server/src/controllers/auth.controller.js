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
import { after } from 'node:test'

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

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    addresses: user.addresses,
    role: user.role,
    emailVerified: user.emailVerified,
})

/* ============================================================
   REGISTER
   ============================================================ */

export const registerController = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            addresses,
            password,
        } = req.body

        const normalizedEmail = normalizeEmail(email)

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

        const passwordHash = await bcrypt.hash(
            password,
            config.SALT_ROUND
        )

        const verificationToken = crypto
            .randomBytes(32)
            .toString('hex')

        const verificationTokenHash = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex')

        const now = Date.now()

        const verificationTokenExpiresAt = new Date(
            now + config.EMAIL_VERIFICATION_TOKEN_TTL_MS
        )

        const registrationExpiresAt = new Date(
            now + config.PENDING_REGISTRATION_TTL_MS
        )

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
                    returnDocument: after,
                    upsert: true,
                    setDefaultsOnInsert: true,
                    runValidators: true,
                }
            )

        try {
            await sendVerificationEmail({
                name: pendingRegistration.name,
                email: pendingRegistration.email,
                token: verificationToken,
            })
        } catch (emailError) {
            console.error(
                'Verification email failed:',
                emailError
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
        console.error('Register controller error:', error)

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
        const { token } = req.query

        if (
            typeof token !== 'string' ||
            token.length !== 64 ||
            !/^[a-f0-9]+$/i.test(token)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token.',
            })
        }

        const verificationTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')

        const pendingRegistration =
            await pendingRegistrationModel.findOne({
                verificationTokenHash,
                verificationTokenExpiresAt: {
                    $gt: new Date(),
                },
                registrationExpiresAt: {
                    $gt: new Date(),
                },
            })

        if (!pendingRegistration) {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid or expired verification link.',
            })
        }

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
                message:
                    'An account already exists with this email address.',
            })
        }

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

        await pendingRegistrationModel.deleteOne({
            _id: pendingRegistration._id,
            verificationTokenHash,
        })

        return res.status(200).json({
            success: true,
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
            error
        )

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
   EMAIL/PASSWORD LOGIN
   ============================================================ */

export const loginController = async (req, res) => {
    try {
        const { email, password } = req.body
        const normalizedEmail = normalizeEmail(email)

        const user = await userModel.findOne({
            email: normalizedEmail,
        })

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.',
            })
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                message:
                    'Please verify your email before logging in.',
            })
        }

        if (!user.passwordHash) {
            return res.status(401).json({
                success: false,
                message:
                    'This account does not support password login.',
            })
        }

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

        const accessToken = await accessTokenGenerator({
            userId: user._id,
            role: user.role,
        })

        const session = await createRefreshSession(
            user._id,
            user.role
        )

        setRefreshCookie(
            res,
            session.refreshToken,
            session.expiresAt
        )

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: {
                user: publicUser(user),
                accessToken,
            },
        })
    } catch (error) {
        console.error('Login controller error:', error)
        return sendInternalError(res)
    }
}

/* ============================================================
   REFRESH TOKEN
   ============================================================ */

export const refreshController = async (req, res) => {
    try {
        const oldRefreshToken =
            req.cookies?.refreshToken

        if (
            typeof oldRefreshToken !== 'string' ||
            oldRefreshToken.length === 0
        ) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            })
        }

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

        const { userId, role } = decoded

        if (!userId || !role) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token.',
            })
        }

        const user = await userModel
            .findById(userId)
            .select('_id role emailVerified')

        if (!user || !user.emailVerified) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            })
        }

        if (user.role !== role) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token.',
            })
        }

        const tokenHash = hashToken(oldRefreshToken)

        const matchedRecord = await refreshModel.findOne({
            userId: user._id,
            tokenHash,
        })

        if (!matchedRecord) {
            clearRefreshCookie(res)

            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token.',
            })
        }

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
                    returnDocument: after
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

        const newAccessToken =
            await accessTokenGenerator({
                userId: user._id,
                role: user.role,
            })

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
        console.error(
            'Refresh controller error:',
            error
        )

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
            .select(
                '_id name email phone addresses role emailVerified'
            )

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
        console.error(
            'Get me controller error:',
            error
        )

        return sendInternalError(res)
    }
}

/* ============================================================
   GOOGLE CALLBACK
   ============================================================ */

export const googleCallbackController = async (
    req,
    res
) => {
    try {
        const { code, state } = req.query

        if (
            typeof code !== 'string' ||
            code.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Google authorization code is missing.',
            })
        }

        const googleUser = await getGoogleUser(code, state)

        if (
            !googleUser ||
            typeof googleUser.email !== 'string' ||
            typeof googleUser.providerId !== 'string' ||
            !googleUser.emailVerified
        ) {
            return res.status(403).json({
                success: false,
                message:
                    'Unable to verify Google account.',
            })
        }

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

            const accessToken =
                await accessTokenGenerator({
                    userId: user._id,
                    role: user.role,
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

            return res.status(201).json({
                success: true,
                message:
                    'Google account created and logged in successfully.',
                data: {
                    user: publicUser(user),
                    accessToken,
                },
            })
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
                return res.status(403).json({
                    success: false,
                    message:
                        'This email account has not been verified. Please verify your email before linking Google.',
                })
            }

            const emailProvider =
                user.authProviders?.find(
                    (provider) =>
                        provider.provider === 'email'
                )

            if (!emailProvider) {
                return res.status(409).json({
                    success: false,
                    message:
                        'This account cannot be automatically linked with Google.',
                })
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

        const accessToken =
            await accessTokenGenerator({
                userId: user._id,
                role: user.role,
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

        return res.status(200).json({
            success: true,
            message: googleProvider
                ? 'Google login successful.'
                : 'Google account linked successfully.',
            data: {
                user: publicUser(user),
                accessToken,
            },
        })
    } catch (error) {
        console.error(
            'Google authentication error:',
            error
        )

        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    'This Google account is already linked to another account.',
            })
        }

        return sendInternalError(
            res,
            'Google authentication failed.'
        )
    }
}
