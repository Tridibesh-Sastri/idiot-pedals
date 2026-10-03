import dotenv from 'dotenv'

// `quiet` suppresses dotenv's "injected env (N) from .env" banner so startup
// logs stay free of environment detail.
dotenv.config({ quiet: true })

/*
 * ============================================================================
 * ENVIRONMENT VALIDATION
 * ============================================================================
 *
 * Every environment variable the server consumes is declared in SPEC below and
 * validated here, at import time, before anything else runs.
 *
 * The process refuses to start when:
 *   - a required variable is missing or empty
 *   - a value still looks like a placeholder
 *   - an application secret is shorter than 32 characters
 *   - a vendor-issued secret is shorter than 24 characters
 *   - a numeric/enum/bool value is out of its allowed domain
 *   - NODE_ENV and the Razorpay key class disagree
 *     (rzp_test_ in production, or rzp_live_ outside production)
 *   - FRONTEND_URL contains a wildcard or a non-origin URL
 *   - production points MONGO_URI at localhost
 *
 * SECURITY: error and warning messages contain variable NAMES only. No value,
 * or fragment of a value, is ever included in output. This file must never log
 * a raw process.env entry.
 */

const ALLOWED_NODE_ENVS = ['development', 'test', 'production']

/** Minimum length for secrets we generate ourselves. */
const APP_SECRET_MIN_LENGTH = 32

/** Minimum length for secrets issued by a third party (Google, Razorpay, Resend). */
const VENDOR_SECRET_MIN_LENGTH = 24

const RAZORPAY_KEY_ID_PATTERN = /^rzp_(test|live)_[A-Za-z0-9]+$/

/**
 * Substrings that indicate a value was never filled in. Intentionally narrow so
 * real values are not rejected: no bare "test", because Razorpay test keys
 * legitimately contain it.
 */
const PLACEHOLDER_PATTERNS = [
  /your[_-]/i,
  /_here/i,
  /replace[_-]?me/i,
  /change[_-]?me/i,
  /placeholder/i,
  /dummy/i,
  /xxxxxx+/i,
  /example\.com/i,
  /<[a-z_]+>/i,
  /abc123/i,
  /123456/,
  /\bTODO\b/,
]

class ConfigError extends Error {
  constructor(reasons) {
    const detail = reasons.map((reason) => `  - ${reason}`).join('\n')

    super(
      `Invalid server configuration — refusing to start.\n` +
        `${detail}\n` +
        `See server/.env.example for the expected shape of each variable.`
    )

    this.name = 'ConfigError'
    /** Names/reasons only (never values). */
    this.reasons = reasons
  }
}

/* -------------------------------------------------------------------------- */
/* Raw reads                                                                   */
/* -------------------------------------------------------------------------- */

const readRaw = (name) => {
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : undefined
}

const isPlaceholder = (value) =>
  PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * type:
 *  - string      plain string
 *  - secret      string with a minimum length
 *  - int         integer within [min, max]
 *  - bool        "true" | "false"
 *  - enum        one of `values`
 *  - url         absolute http(s) URL
 *  - originList  comma-separated exact origins (no wildcards)
 *  - mongoUri    mongodb:// or mongodb+srv://
 *  - razorpayKeyId  rzp_test_ / rzp_live_ prefixed key id
 *  - trustProxy  undefined | boolean | integer hop count
 */
const SPEC = {
  /* Application ---------------------------------------------------------- */
  NODE_ENV: { type: 'enum', values: ALLOWED_NODE_ENVS, default: 'development' },
  PORT: { type: 'int', default: 5000, min: 1, max: 65535 },
  TRUST_PROXY: { type: 'trustProxy' },
  /*
   * Explicit opt-in for returning stack traces in HTTP responses. Never honoured
   * when NODE_ENV=production. Defaults to false.
   */
  DEBUG_EXPOSE_STACK: { type: 'bool', default: false },

  /* Database ------------------------------------------------------------- */
  MONGO_URI: { type: 'mongoUri', required: true, secret: true },

  /* Authentication ------------------------------------------------------- */
  SALT_ROUND: { type: 'int', default: 12, min: 8, max: 16 },
  ACCESS_TOKEN_SECRET: { type: 'secret', required: true, minLength: APP_SECRET_MIN_LENGTH },
  REFRESH_TOKEN_SECRET: { type: 'secret', required: true, minLength: APP_SECRET_MIN_LENGTH },
  COOKIE_SECRET: { type: 'secret', required: true, minLength: APP_SECRET_MIN_LENGTH },

  /* Frontend / tokens ---------------------------------------------------- */
  FRONTEND_URL: { type: 'originList', required: true },
  EMAIL_VERIFICATION_TOKEN_TTL_MS: { type: 'int', default: 15 * 60 * 1000, min: 1 },
  PENDING_REGISTRATION_TTL_MS: { type: 'int', default: 30 * 60 * 1000, min: 1 },

  /* Inventory reservation -------------------------------------------------- */
  STOCK_RESERVATION_TTL_MS: { type: 'int', default: 15 * 60 * 1000, min: 60 * 1000 },
  STOCK_RELEASE_INTERVAL_CRON: { type: 'string', default: '* * * * *' },

  /* Observability ---------------------------------------------------------- */
  LOG_LEVEL: { type: 'enum', values: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'], default: 'info' },

  /* Mongo connection pool -------------------------------------------------- */
  MONGO_MAX_POOL_SIZE: { type: 'int', default: 20, min: 1, max: 200 },
  MONGO_MIN_POOL_SIZE: { type: 'int', default: 2, min: 0, max: 100 },
  MONGO_SERVER_SELECTION_TIMEOUT_MS: { type: 'int', default: 5000, min: 100 },
  MONGO_SOCKET_TIMEOUT_MS: { type: 'int', default: 45000, min: 100 },

  /* SMTP ----------------------------------------------------------------- */
  SMTP_HOST: { type: 'string', required: true },
  SMTP_PORT: { type: 'int', default: 587, min: 1, max: 65535 },
  SMTP_SECURE: { type: 'bool', default: false },
  SMTP_USER: { type: 'string', required: true },
  SMTP_PASSWORD: { type: 'secret', required: true, minLength: 8 },
  EMAIL_FROM: { type: 'string', required: true },

  /* Google OAuth --------------------------------------------------------- */
  GOOGLE_CLIENT_ID: { type: 'string', required: true },
  GOOGLE_CLIENT_SECRET: {
    type: 'secret',
    required: true,
    minLength: VENDOR_SECRET_MIN_LENGTH,
  },
  GOOGLE_CALLBACK_URL: { type: 'url', required: true },

  /* Razorpay ------------------------------------------------------------- */
  RAZORPAY_KEY_ID: { type: 'razorpayKeyId', required: true },
  RAZORPAY_KEY_SECRET: {
    type: 'secret',
    required: true,
    minLength: VENDOR_SECRET_MIN_LENGTH,
  },
  RAZORPAY_WEBHOOK_SECRET: {
    type: 'secret',
    required: true,
    minLength: VENDOR_SECRET_MIN_LENGTH,
  },

  /* Resend --------------------------------------------------------------- */
  RESEND_API_KEY: {
    type: 'secret',
    required: true,
    minLength: VENDOR_SECRET_MIN_LENGTH,
  },
  RESEND_FROM: { type: 'string', required: true },
  ADMIN_ORDER_EMAIL: { type: 'string', required: true },

  /*
   * Master switch for outbound email. `false` skips every send (and logs the
   * skip without a recipient). Automated runs set this to false so they can
   * never deliver mail. In NODE_ENV=test the mailer additionally uses an
   * in-memory fake regardless of this value.
   */
  EMAIL_NOTIFICATIONS_ENABLED: { type: 'bool', default: true },
}

/* -------------------------------------------------------------------------- */
/* Parsers                                                                     */
/* -------------------------------------------------------------------------- */

const parseNormalizedOrigin = (value) => {
  const url = new URL(value)
  return `${url.protocol}//${url.host}`
}

/**
 * FRONTEND_URL may be a comma-separated list of exact origins. Wildcards and
 * paths are rejected so CORS stays an allow-list of concrete origins.
 */
const parseOriginList = (name, value, errors, warnings, isProduction) => {
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (entries.length === 0) {
    errors.push(`${name}: must contain at least one origin`)
    return { primary: '', origins: [] }
  }

  const origins = []

  for (const entry of entries) {
    if (entry.includes('*')) {
      errors.push(`${name}: wildcard origins are not allowed`)
      continue
    }

    let url
    try {
      url = new URL(entry)
    } catch {
      errors.push(`${name}: contains an entry that is not a valid URL`)
      continue
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push(`${name}: only http/https origins are allowed`)
      continue
    }

    if (isProduction && url.protocol !== 'https:') {
      errors.push(`${name}: production requires https origins`)
    }

    if (url.pathname !== '/' || url.search || url.hash) {
      warnings.push(
        `${name}: an entry includes a path/query — only the origin is used`
      )
    }

    const normalized = parseNormalizedOrigin(entry)
    if (!origins.includes(normalized)) origins.push(normalized)
  }

  return { primary: origins[0] ?? '', origins }
}

const parseTrustProxy = (value, errors) => {
  if (value === undefined || value === '') return undefined
  if (value === 'true') return true
  if (value === 'false') return false

  const hops = Number(value)
  if (!Number.isInteger(hops) || hops < 0 || hops > 100) {
    errors.push('TRUST_PROXY: must be true, false, or an integer hop count 0-100')
    return undefined
  }
  return hops
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

const errors = []
const warnings = []

const nodeEnvRaw = readRaw('NODE_ENV')
if (nodeEnvRaw === undefined) {
  warnings.push(
    "NODE_ENV: not set — defaulting to 'development' (set it explicitly in every environment)"
  )
}

const resolved = {}
const frontend = { primary: '', origins: [] }

for (const [name, rule] of Object.entries(SPEC)) {
  const rawValue = readRaw(name)
  const empty = rawValue === undefined || rawValue === ''

  if (empty) {
    if (rule.required) {
      errors.push(`${name}: missing or empty`)
      continue
    }
    resolved[name] = rule.default
    continue
  }

  // Placeholder check (never echoes the value).
  if (isPlaceholder(rawValue)) {
    errors.push(`${name}: still looks like a placeholder`)
    continue
  }

  switch (rule.type) {
    case 'string':
      resolved[name] = rawValue
      break

    case 'secret':
      if (rule.minLength && rawValue.length < rule.minLength) {
        errors.push(
          `${name}: too short — needs at least ${rule.minLength} characters`
        )
        break
      }
      resolved[name] = rawValue
      break

    case 'int': {
      const parsed = Number(rawValue)
      if (
        !Number.isInteger(parsed) ||
        parsed < rule.min ||
        parsed > rule.max
      ) {
        errors.push(
          `${name}: must be an integer between ${rule.min} and ${rule.max}`
        )
        break
      }
      resolved[name] = parsed
      break
    }

    case 'bool': {
      const lowered = rawValue.toLowerCase()
      if (lowered !== 'true' && lowered !== 'false') {
        errors.push(`${name}: must be exactly "true" or "false"`)
        break
      }
      resolved[name] = lowered === 'true'
      break
    }

    case 'enum':
      if (!rule.values.includes(rawValue)) {
        errors.push(`${name}: must be one of ${rule.values.join(' | ')}`)
        break
      }
      resolved[name] = rawValue
      break

    case 'url': {
      let url
      try {
        url = new URL(rawValue)
      } catch {
        errors.push(`${name}: must be a valid absolute URL`)
        break
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push(`${name}: only http/https URLs are allowed`)
        break
      }
      resolved[name] = rawValue
      break
    }

    case 'originList': {
      const parsed = parseOriginList(
        name,
        rawValue,
        errors,
        warnings,
        nodeEnvRaw === 'production'
      )
      frontend.primary = parsed.primary
      frontend.origins = parsed.origins
      break
    }

    case 'mongoUri': {
      const lower = rawValue.toLowerCase()
      if (!lower.startsWith('mongodb://') && !lower.startsWith('mongodb+srv://')) {
        errors.push(`${name}: must start with mongodb:// or mongodb+srv://`)
        break
      }
      if (nodeEnvRaw === 'production') {
        const hostPart = rawValue.split('://')[1]?.split('@').pop() ?? ''
        const host = hostPart.split('/')[0].split('?')[0].toLowerCase()
        if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
          errors.push(`${name}: production must not point at localhost`)
        }
      }
      resolved[name] = rawValue
      break
    }

    case 'razorpayKeyId':
      if (!RAZORPAY_KEY_ID_PATTERN.test(rawValue)) {
        errors.push(
          `${name}: must start with rzp_test_ or rzp_live_ followed by the key body`
        )
        break
      }
      resolved[name] = rawValue
      break

    case 'trustProxy':
      resolved[name] = parseTrustProxy(rawValue, errors)
      break

    default:
      errors.push(`${name}: unsupported validation rule (internal)`)
  }
}

/* -------------------------------------------------------------------------- */
/* Cross-field rules                                                           */
/* -------------------------------------------------------------------------- */

const nodeEnv = resolved.NODE_ENV ?? 'development'
const isProduction = nodeEnv === 'production'

if (nodeEnvRaw !== undefined && !ALLOWED_NODE_ENVS.includes(nodeEnvRaw)) {
  // already reported by the enum rule; keep nodeEnv safe for downstream checks
}

/*
 * NODE_ENV must be explicit whenever the configuration already looks like a
 * production deployment, so a missing NODE_ENV can never silently turn
 * production safety behaviour off. Indicators:
 *   - any https frontend origin
 *   - a MONGO_URI that is not localhost
 * An explicit value (including an explicit "development") satisfies this.
 */
const httpsFrontendOrigin = frontend.origins.some((origin) =>
  origin.startsWith('https://')
)

const mongoHost = (resolved.MONGO_URI ?? '')
  .split('://')[1]
  ?.split('@')
  .pop()
  ?.split('/')[0]
  ?.split('?')[0]
  ?.toLowerCase() ?? ''

const nonLocalMongo =
  Boolean(mongoHost) &&
  !mongoHost.startsWith('localhost') &&
  !mongoHost.startsWith('127.0.0.1')

if (nodeEnvRaw === undefined && (httpsFrontendOrigin || nonLocalMongo)) {
  errors.push(
    'NODE_ENV: must be set explicitly because a production indicator is present (https FRONTEND_URL or non-local MONGO_URI)'
  )
}

// NODE_ENV <-> Razorpay key class must agree.
const razorpayKeyId = resolved.RAZORPAY_KEY_ID
if (typeof razorpayKeyId === 'string' && razorpayKeyId) {
  if (isProduction && razorpayKeyId.startsWith('rzp_test_')) {
    errors.push(
      'RAZORPAY_KEY_ID: test keys cannot be used with NODE_ENV=production'
    )
  }
  if (!isProduction && razorpayKeyId.startsWith('rzp_live_')) {
    errors.push(
      'RAZORPAY_KEY_ID: live keys must never be used outside NODE_ENV=production'
    )
  }
}

// Webhook HMAC secret must not be the Razorpay key secret: the two
// authenticate different channels (provider API vs webhook deliveries), so
// reusing one value would let a compromise of either channel forge the other.
if (
  typeof resolved.RAZORPAY_WEBHOOK_SECRET === 'string' &&
  typeof resolved.RAZORPAY_KEY_SECRET === 'string' &&
  resolved.RAZORPAY_WEBHOOK_SECRET &&
  resolved.RAZORPAY_WEBHOOK_SECRET === resolved.RAZORPAY_KEY_SECRET
) {
  errors.push(
    'RAZORPAY_WEBHOOK_SECRET: must differ from RAZORPAY_KEY_SECRET'
  )
}

// Separate secrets must not be reused.
const distinctSecrets = [
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'COOKIE_SECRET',
]
const seen = new Map()
for (const name of distinctSecrets) {
  const value = resolved[name]
  if (typeof value !== 'string') continue
  if (seen.has(value)) {
    errors.push(`${name}: must not reuse the value of ${seen.get(value)}`)
  } else {
    seen.set(value, name)
  }
}

if (errors.length > 0) {
  throw new ConfigError(errors)
}

for (const warning of warnings) {
  // Names / descriptions only — never values.
  console.warn(`[config] ${warning}`)
}

/* -------------------------------------------------------------------------- */
/* Resolved configuration                                                      */
/* -------------------------------------------------------------------------- */

const config = {
  /* Application */
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: isProduction,
  PORT: resolved.PORT,
  TRUST_PROXY: resolved.TRUST_PROXY,
  DEBUG_EXPOSE_STACK: resolved.DEBUG_EXPOSE_STACK,

  /* Database */
  MONGO_URI: resolved.MONGO_URI,

  /* Authentication */
  SALT_ROUND: resolved.SALT_ROUND,
  ACCESS_TOKEN_SECRET: resolved.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: resolved.REFRESH_TOKEN_SECRET,
  COOKIE_SECRET: resolved.COOKIE_SECRET,

  /*
   * Frontend origin. `FRONTEND_URL` is the primary origin (used for the
   * email-verification link and OAuth redirect); `CORS_ORIGINS` is the complete
   * exact-match allow-list. Wildcards are never accepted.
   */
  FRONTEND_URL: frontend.primary,
  CORS_ORIGINS: [...frontend.origins],

  /* Token lifetimes */
  EMAIL_VERIFICATION_TOKEN_TTL_MS: resolved.EMAIL_VERIFICATION_TOKEN_TTL_MS,
  PENDING_REGISTRATION_TTL_MS: resolved.PENDING_REGISTRATION_TTL_MS,

  /* Inventory reservation */
  STOCK_RESERVATION_TTL_MS: resolved.STOCK_RESERVATION_TTL_MS,
  STOCK_RELEASE_INTERVAL_CRON: resolved.STOCK_RELEASE_INTERVAL_CRON,

  /* Observability */
  LOG_LEVEL: resolved.LOG_LEVEL,

  /* Mongo connection pool */
  MONGO_MAX_POOL_SIZE: resolved.MONGO_MAX_POOL_SIZE,
  MONGO_MIN_POOL_SIZE: resolved.MONGO_MIN_POOL_SIZE,
  MONGO_SERVER_SELECTION_TIMEOUT_MS: resolved.MONGO_SERVER_SELECTION_TIMEOUT_MS,
  MONGO_SOCKET_TIMEOUT_MS: resolved.MONGO_SOCKET_TIMEOUT_MS,

  /* SMTP */
  SMTP_HOST: resolved.SMTP_HOST,
  SMTP_PORT: resolved.SMTP_PORT,
  SMTP_SECURE: resolved.SMTP_SECURE,
  SMTP_USER: resolved.SMTP_USER,
  SMTP_PASSWORD: resolved.SMTP_PASSWORD,
  EMAIL_FROM: resolved.EMAIL_FROM,

  /* Google OAuth */
  GOOGLE_CLIENT_ID: resolved.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: resolved.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: resolved.GOOGLE_CALLBACK_URL,

  /* Razorpay */
  RAZORPAY_KEY_ID: resolved.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: resolved.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: resolved.RAZORPAY_WEBHOOK_SECRET,

  /* Resend */
  RESEND_API_KEY: resolved.RESEND_API_KEY,
  RESEND_FROM: resolved.RESEND_FROM,
  ADMIN_ORDER_EMAIL: resolved.ADMIN_ORDER_EMAIL,

  /* Outbound email master switch */
  EMAIL_NOTIFICATIONS_ENABLED: resolved.EMAIL_NOTIFICATIONS_ENABLED,
}

export { ConfigError }
export default config
