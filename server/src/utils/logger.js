/**
 * Logging with hand-rolled redaction.
 *
 * The application logs through the console (that is the logger this codebase
 * already has). These helpers wrap it so that credentials, signatures, tokens
 * and whole provider payloads cannot reach a log line, even when a call site
 * passes a complete request or webhook body.
 *
 * Redaction is enforced here rather than at each call site, so a new call site
 * cannot leak a secret by forgetting to strip it.
 *
 * LOG_LEVEL gates the output: debug < info < warn < error.
 */

import config from '../config/config.js'

export const CENSOR = '[REDACTED]'

/** Any key whose name looks like a credential is censored wholesale. */
const SECRET_KEY_PATTERN =
    /(password|passwd|secret|token|signature|authorization|cookie|api[-_]?key|key[-_]?secret|rawbody|payload)/i

const LEVEL_PRIORITY = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 }

const configuredPriority = LEVEL_PRIORITY[config.LOG_LEVEL] ?? LEVEL_PRIORITY.info

const MAX_DEPTH = 6
const MAX_STRING_LENGTH = 2000

const redactError = (error) => ({
    name: error.name,
    message: error.message,
    // Stack traces are only useful in development and are a disclosure risk in
    // production (absolute paths, internal file names).
    stack: config.IS_PRODUCTION ? undefined : error.stack,
    ...(error.code !== undefined ? { code: error.code } : {}),
    ...(error.statusCode !== undefined ? { statusCode: error.statusCode } : {}),
})

/**
 * Returns a copy of `value` with every secret-looking field censored.
 * Handles the shapes that actually appear in this app: Buffers (the webhook
 * raw body), Errors, Dates, arrays and nested provider payloads.
 */
export const redact = (value, depth = 0) => {
    if (value === null || value === undefined) return value

    if (value instanceof Error) return redactError(value)

    if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`

    if (value instanceof Date) return value.toISOString()

    if (typeof value === 'string') {
        return value.length > MAX_STRING_LENGTH
            ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
            : value
    }

    if (typeof value !== 'object') return value

    if (depth >= MAX_DEPTH) return '[MaxDepth]'

    if (Array.isArray(value)) return value.map((entry) => redact(entry, depth + 1))

    const safe = {}

    for (const [key, entry] of Object.entries(value)) {
        safe[key] = SECRET_KEY_PATTERN.test(key) ? CENSOR : redact(entry, depth + 1)
    }

    return safe
}

const emit = (level, priority, args) => {
    if (priority < configuredPriority) return

    const safeArgs = args.map((arg) => redact(arg))

    if (level === 'error' || level === 'fatal') {
        console.error(...safeArgs)
        return
    }

    if (level === 'warn') {
        console.warn(...safeArgs)
        return
    }

    console.log(...safeArgs)
}

export const logger = {
    debug: (...args) => emit('debug', LEVEL_PRIORITY.debug, args),
    info: (...args) => emit('info', LEVEL_PRIORITY.info, args),
    warn: (...args) => emit('warn', LEVEL_PRIORITY.warn, args),
    error: (...args) => emit('error', LEVEL_PRIORITY.error, args),
}

export default logger
