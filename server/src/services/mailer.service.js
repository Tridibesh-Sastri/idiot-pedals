/**
 * The single gate for all outbound email.
 *
 * Every sender in the application goes through `sendMail`. That means there is
 * exactly one place to look when asking "can this code send mail?", and exactly
 * one place that decides which transport is used:
 *
 *   1. NODE_ENV=test          -> in-memory fake that records messages.
 *                                Mandatory, whatever the flag says, so a test
 *                                can never deliver mail and can still assert on
 *                                exactly what would have been sent.
 *   2. EMAIL_NOTIFICATIONS_ENABLED=false -> every send is skipped and logged
 *                                as "email skipped". The log deliberately omits
 *                                the recipient address.
 *   3. otherwise              -> the live transport (Resend or SMTP), which
 *                                itself refuses to run in NODE_ENV=test.
 *
 * The fake is not a stub in the "does nothing" sense: it validates the message,
 * records it verbatim and returns a transport-shaped result, so callers behave
 * exactly as they do in production.
 */

import config from '../config/config.js'
import { logger } from '../utils/logger.js'
import { getTransport } from '../integrations/mail/transports.js'

/* -------------------------------------------------------------------------- */
/* In-memory fake                                                              */
/* -------------------------------------------------------------------------- */

const memoryOutbox = []

/** Every message the fake recorded, oldest first. */
export const getSentMessages = () =>
    memoryOutbox.map((message) => ({
        ...message,
        to: Array.isArray(message.to) ? [...message.to] : message.to,
    }))

/** Messages recorded so far. */
export const sentMessageCount = () => memoryOutbox.length

/** Messages of a given `kind`, e.g. 'admin-order'. */
export const getSentMessagesOfKind = (kind) =>
    getSentMessages().filter((message) => message.kind === kind)

/** Clears the outbox between tests. */
export const clearSentMessages = () => {
    memoryOutbox.length = 0
}

const memoryTransport = {
    kind: 'memory',

    send: async (message) => {
        if (!message.to || (Array.isArray(message.to) && message.to.length === 0)) {
            throw new Error('Mailer: a message must have at least one recipient.')
        }

        if (!message.subject) {
            throw new Error('Mailer: a message must have a subject.')
        }

        memoryOutbox.push({ ...message, recordedAt: new Date().toISOString() })

        return { id: `memory_${memoryOutbox.length}`, kind: 'memory' }
    },
}

/* -------------------------------------------------------------------------- */
/* Gate                                                                        */
/* -------------------------------------------------------------------------- */

/** Which transport would be used right now. Exposed for tests/diagnostics. */
export const resolveTransportKind = () => {
    if (config.NODE_ENV === 'test') return 'memory'
    if (!config.EMAIL_NOTIFICATIONS_ENABLED) return 'skipped'
    return 'live'
}

/**
 * Sends one message.
 *
 * @param {object} message
 * @param {'resend'|'smtp'} message.channel  which live provider would deliver it
 * @param {string} message.kind              semantic label ('admin-order', ...)
 * @param {string|string[]} message.to
 * @param {string} message.subject
 * @param {string} [message.text]
 * @param {string} [message.html]
 * @param {string} [message.idempotencyKey]
 * @param {string} [message.from]
 */
export const sendMail = async ({
    channel = 'resend',
    kind = 'generic',
    to,
    subject,
    text,
    html,
    idempotencyKey,
    from,
}) => {
    const message = { channel, kind, to, subject, text, html, idempotencyKey, from }

    // 1. Tests: the fake is mandatory and unconditional.
    if (config.NODE_ENV === 'test') {
        return memoryTransport.send(message)
    }

    // 2. Explicitly disabled: skip, and never log who it would have gone to.
    if (!config.EMAIL_NOTIFICATIONS_ENABLED) {
        logger.info({ kind, channel }, 'email skipped')

        return null
    }

    // 3. Live delivery.
    return getTransport(channel).send(message)
}

export default { sendMail, getSentMessages, sentMessageCount, clearSentMessages }
