/**
 * Order state machine.
 *
 * The order lifecycle is enforced in one place so no controller, webhook
 * handler or cron job can move an order into an illegal state. Transitions are
 * declared as an explicit adjacency map; anything not listed is rejected with a
 * 409 rather than silently applied.
 *
 *   created(pending) --pay--> confirmed --webhook--> fulfilled --logistics--> ...
 *
 * `pending -> confirmed` happens when a payment is confirmed (verify OR
 * webhook). `confirmed -> fulfilled` may only be driven by the WEBHOOK, which is
 * the payment provider's source of truth — a client-triggered verify can never
 * finalize an order on its own.
 */

export const ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    FULFILLED: 'fulfilled',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RETURNED: 'returned',
    REFUNDED: 'refunded',
}

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS)

/**
 * Allowed transitions. `pending -> confirmed` is payment; `confirmed ->
 * fulfilled` is fulfilment; the rest is logistics.
 */
export const ALLOWED_TRANSITIONS = {
    [ORDER_STATUS.PENDING]: [
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.CANCELLED,
    ],
    [ORDER_STATUS.CONFIRMED]: [
        ORDER_STATUS.FULFILLED,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.CANCELLED,
    ],
    [ORDER_STATUS.FULFILLED]: [
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.DELIVERED,
    ],
    [ORDER_STATUS.PROCESSING]: [
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.CANCELLED,
    ],
    [ORDER_STATUS.SHIPPED]: [
        ORDER_STATUS.DELIVERED,
        ORDER_STATUS.RETURNED,
    ],
    [ORDER_STATUS.DELIVERED]: [
        ORDER_STATUS.RETURNED,
        ORDER_STATUS.REFUNDED,
    ],
    [ORDER_STATUS.RETURNED]: [
        ORDER_STATUS.REFUNDED,
    ],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.REFUNDED]: [],
}

/** Payment statuses that mean "the money is ours". */
export const PAID_PAYMENT_STATUSES = ['paid']

/** Where an order may not move from. */
export const TERMINAL_ORDER_STATUSES = [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED]

export const isTerminal = (status) => TERMINAL_ORDER_STATUSES.includes(status)

export const canTransition = (from, to) => {
    if (!ORDER_STATUS_VALUES.includes(to)) return false
    if (!ORDER_STATUS_VALUES.includes(from)) return false

    // Re-applying the current state is an idempotent no-op, not a violation.
    if (from === to) return true

    return (ALLOWED_TRANSITIONS[from] ?? []).includes(to)
}

const illegalTransitionError = (from, to) => {
    const error = new Error(`Illegal order status transition: ${from} -> ${to}`)
    error.statusCode = 409
    error.code = 'ILLEGAL_ORDER_TRANSITION'
    error.from = from
    error.to = to
    return error
}

/**
 * Applies a transition to an order document in memory.
 * Idempotent when `to === order.orderStatus`.
 * Throws a 409 error for anything not allowed.
 */
export const applyTransition = (order, to) => {
    const from = order.orderStatus

    if (!canTransition(from, to)) {
        throw illegalTransitionError(from, to)
    }

    if (from !== to) {
        order.orderStatus = to
    }

    return order
}

export { illegalTransitionError }
