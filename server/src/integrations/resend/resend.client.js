import { Resend } from 'resend'

import config from '../../config/config.js'

let client = null

/**
 * Lazily creates the live Resend client.
 *
 * This is the ONLY place the Resend SDK is constructed. It refuses to create a
 * client at all in NODE_ENV=test, so a test can never reach the live API even by
 * accident — the failure is immediate and local rather than a network call.
 */
export const getResendClient = () => {
    if (config.NODE_ENV === 'test') {
        const error = new Error(
            'Refusing to create a live Resend client while NODE_ENV=test'
        )

        error.code = 'LIVE_TRANSPORT_REFUSED'

        throw error
    }

    if (!client) {
        client = new Resend(config.RESEND_API_KEY)
    }

    return client
}

export default getResendClient
