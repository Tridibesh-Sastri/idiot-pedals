import dotenv from 'dotenv'

dotenv.config()

const isProduction = process.env.NODE_ENV === 'production'

const required = (name) => {
    const value = process.env[name]?.trim()

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }

    return value
}

const positiveNumber = (name, fallback) => {
    const raw = process.env[name]

    if (raw === undefined || raw === '') {
        return fallback
    }

    const value = Number(raw)

    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(
            `Environment variable ${name} must be a positive number`
        )
    }

    return value
}

const integerInRange = (name, fallback, min, max) => {
    const raw = process.env[name]

    if (raw === undefined || raw === '') {
        return fallback
    }

    const value = Number(raw)

    if (
        !Number.isInteger(value) ||
        value < min ||
        value > max
    ) {
        throw new Error(
            `Environment variable ${name} must be an integer between ${min} and ${max}`
        )
    }

    return value
}

const url = (name, value) => {
    try {
        new URL(value)       // validate it
        return value         // ✅ return original string
    } catch {
        throw new Error(
            `Environment variable ${name} must be a valid URL`
        )
    }
}

const nodeEnv = process.env.NODE_ENV?.trim() || 'development'

if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(
        'NODE_ENV must be one of: development, test, production'
    )
}

const frontendUrl = required('FRONTEND_URL')

const config = {
    // ─────────────────────────────────────────────
    // Application
    // ─────────────────────────────────────────────

    NODE_ENV: nodeEnv,

    PORT: integerInRange(
        'PORT',
        5000,
        1,
        65535
    ),

    TRUST_PROXY:
        process.env.TRUST_PROXY === undefined
            ? undefined
            : process.env.TRUST_PROXY === 'true'
              ? true
              : process.env.TRUST_PROXY === 'false'
                ? false
                : integerInRange(
                      'TRUST_PROXY',
                      0,
                      0,
                      100
                  ),

    // ─────────────────────────────────────────────
    // Database
    // ─────────────────────────────────────────────

    MONGO_URI: required('MONGO_URI'),

    // ─────────────────────────────────────────────
    // Authentication
    // ─────────────────────────────────────────────

    SALT_ROUND: integerInRange(
        'SALT_ROUND',
        12,
        8,
        16
    ),

    ACCESS_TOKEN_SECRET: required(
        'ACCESS_TOKEN_SECRET'
    ),

    REFRESH_TOKEN_SECRET: required(
        'REFRESH_TOKEN_SECRET'
    ),

    COOKIE_SECRET : required(
        'COOKIE_SECRET'
    ),

    // ─────────────────────────────────────────────
    // Frontend / Email verification
    // ─────────────────────────────────────────────

    FRONTEND_URL: url(
        'FRONTEND_URL',
        frontendUrl
    ),

    EMAIL_VERIFICATION_TOKEN_TTL_MS:
        positiveNumber(
            'EMAIL_VERIFICATION_TOKEN_TTL_MS',
            15 * 60 * 1000
        ),

    PENDING_REGISTRATION_TTL_MS:
        positiveNumber(
            'PENDING_REGISTRATION_TTL_MS',
            30 * 60 * 1000
        ),

    // ─────────────────────────────────────────────
    // SMTP
    // ─────────────────────────────────────────────

    SMTP_HOST: required('SMTP_HOST'),

    SMTP_PORT: integerInRange(
        'SMTP_PORT',
        587,
        1,
        65535
    ),

    SMTP_SECURE:
        process.env.SMTP_SECURE === 'true',

    SMTP_USER: required('SMTP_USER'),

    SMTP_PASSWORD: required('SMTP_PASSWORD'),

    EMAIL_FROM: required('EMAIL_FROM'),

    // ─────────────────────────────────────────────
    // Google OAuth
    // ─────────────────────────────────────────────

    GOOGLE_CLIENT_ID: required(
        'GOOGLE_CLIENT_ID'
    ),

    GOOGLE_CLIENT_SECRET: required(
        'GOOGLE_CLIENT_SECRET'
    ),

    GOOGLE_CALLBACK_URL: url(
        'GOOGLE_CALLBACK_URL',
        required('GOOGLE_CALLBACK_URL')
    ),

    // ─────────────────────────────────────────────
    // Razorpay
    // ─────────────────────────────────────────────
    
    RAZORPAY_KEY_ID: required(
        'RAZORPAY_KEY_ID'
    ),
    
    RAZORPAY_KEY_SECRET: required(
        'RAZORPAY_KEY_SECRET'
    ),
    
    RAZORPAY_WEBHOOK_SECRET: required(
        'RAZORPAY_WEBHOOK_SECRET'
    ),

    // ─────────────────────────────────────────────
    // Resend / Admin Order Email
    // ─────────────────────────────────────────────
    
    RESEND_API_KEY: required(
        'RESEND_API_KEY'
    ),
    
    RESEND_FROM: required(
        'RESEND_FROM'
    ),
    
    ADMIN_ORDER_EMAIL: required(
        'ADMIN_ORDER_EMAIL'
    ),

}

export default config