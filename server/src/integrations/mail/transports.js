/**
 * The two real mail transports, in one place.
 *
 * Nothing else in the codebase talks to Resend or SMTP. Both refuse to operate
 * while NODE_ENV=test, so an automated run cannot deliver mail even if the
 * mailer gate were bypassed.
 */

import nodemailer from 'nodemailer'

import config from '../../config/config.js'
import { getResendClient } from '../resend/resend.client.js'

const refuseInTest = (transportName) => {
    if (config.NODE_ENV === 'test') {
        const error = new Error(
            `Refusing to use the live ${transportName} transport while NODE_ENV=test`
        )

        error.code = 'LIVE_TRANSPORT_REFUSED'

        throw error
    }
}

let smtpClient = null

/*
 * SMTP timeouts (constants, not env): a hung provider must fail fast instead
 * of holding the awaiting register request open. Nodemailer has no timeouts
 * by default, so all three phases are bounded explicitly.
 */
const SMTP_CONNECTION_TIMEOUT_MS = 10_000
const SMTP_GREETING_TIMEOUT_MS = 10_000
const SMTP_SOCKET_TIMEOUT_MS = 10_000

const getSmtpTransport = () => {
    refuseInTest('SMTP')

    if (!smtpClient) {
        smtpClient = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE,
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASSWORD,
            },
            connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
            greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
            socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
        })
    }

    return smtpClient
}

/** Resend (transactional API). */
export const resendTransport = {
    kind: 'resend',

    send: async (message) => {
        refuseInTest('Resend')

        const client = getResendClient()

        const payload = {
            from: message.from,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
        }

        const options = message.idempotencyKey
            ? { idempotencyKey: message.idempotencyKey }
            : undefined

        const { data, error } = await client.emails.send(payload, options)

        if (error) {
            const failure = new Error(
                `Resend rejected the message: ${error.message ?? 'unknown error'}`
            )

            failure.code = 'MAIL_PROVIDER_ERROR'
            failure.providerErrorName = error.name

            throw failure
        }

        return { id: data?.id ?? null, kind: 'resend' }
    },
}

/** SMTP (nodemailer). */
export const smtpTransport = {
    kind: 'smtp',

    send: async (message) => {
        const transport = getSmtpTransport()

        const info = await transport.sendMail({
            from: message.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
        })

        return { id: info?.messageId ?? null, kind: 'smtp' }
    },
}

/** Channel name -> transport. Unknown channels fall back to Resend. */
export const getTransport = (channel) =>
    channel === 'smtp' ? smtpTransport : resendTransport

export default { resendTransport, smtpTransport, getTransport }
