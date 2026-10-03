/**
 * In-memory Razorpay provider for tests.
 *
 * Records every call and returns fixed, transport-shaped objects, so tests can
 * assert on what the application asked the provider to do without any network
 * access.
 *
 * `payments.fetch` only returns what a test has explicitly staged with
 * `stagePayment`, so a test that forgets to stage a payment fails loudly instead
 * of silently succeeding.
 */

const state = {
    calls: [],
    payments: new Map(),
    orderSequence: 0,
}

const clone = (value) => JSON.parse(JSON.stringify(value))

export const fakeRazorpay = {
    /** Every call, in order: { op, payload | paymentId } */
    getCalls: () => clone(state.calls),

    getCallsOfOperation: (operation) =>
        clone(state.calls.filter((call) => call.op === operation)),

    /** Stages the payment object that `payments.fetch(id)` will return. */
    stagePayment: (paymentId, payment) => {
        state.payments.set(paymentId, clone(payment))
        return payment
    },

    reset: () => {
        state.calls.length = 0
        state.payments.clear()
        state.orderSequence = 0
    },

    orders: {
        create: async (payload) => {
            state.calls.push({ op: 'orders.create', payload: clone(payload) })
            state.orderSequence += 1

            // Mirrors the real API: the returned order echoes the requested
            // amount/currency and gets a server-side id.
            return {
                id: `order_fake_${state.orderSequence}`,
                entity: 'order',
                amount: payload.amount,
                amount_paid: 0,
                amount_due: payload.amount,
                currency: payload.currency,
                receipt: payload.receipt,
                notes: payload.notes ?? {},
                status: 'created',
            }
        },
    },

    payments: {
        fetch: async (paymentId) => {
            state.calls.push({ op: 'payments.fetch', paymentId })

            const payment = state.payments.get(paymentId)

            if (!payment) {
                const error = new Error(
                    `Fake Razorpay: no payment was staged for ${paymentId}`
                )

                error.statusCode = 400
                error.code = 'FAKE_PAYMENT_NOT_STAGED'

                throw error
            }

            return clone(payment)
        },
    },
}

export default fakeRazorpay
