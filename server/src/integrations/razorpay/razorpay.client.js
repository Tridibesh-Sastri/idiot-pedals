import Razorpay from 'razorpay'

import config from '../../config/config.js'

let liveClient = null
let injectedProvider = null

const refuseInTest = () => {
    if (config.NODE_ENV === 'test') {
        const error = new Error(
            'Refusing to use the live Razorpay client while NODE_ENV=test. ' +
                'Inject a fake provider with setRazorpayProvider().'
        )

        error.code = 'LIVE_TRANSPORT_REFUSED'

        throw error
    }
}

/**
 * The Razorpay provider used by the application.
 *
 * Injectable so tests never touch the real API: a test (or the shared test
 * bootstrap) installs a fake that records calls and returns fixed objects.
 *
 * In NODE_ENV=test there is no fallback to the live client — if nothing was
 * injected, this throws, which is far better than silently calling Razorpay.
 */
export const getRazorpayProvider = () => {
    if (injectedProvider) return injectedProvider

    refuseInTest()

    if (!liveClient) {
        liveClient = new Razorpay({
            key_id: config.RAZORPAY_KEY_ID,
            key_secret: config.RAZORPAY_KEY_SECRET,
        })
    }

    return liveClient
}

export const setRazorpayProvider = (provider) => {
    injectedProvider = provider
}

export const clearRazorpayProvider = () => {
    injectedProvider = null
}

export default getRazorpayProvider
