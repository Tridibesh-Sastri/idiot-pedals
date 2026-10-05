/**
 * Inventory reservation.
 *
 * A reservation is an atomic, conditional increment of `reservedStock`, so
 * available stock is always `stock - reservedStock`:
 *
 *   reserve  : reservedStock += qty   (conditional on availability)
 *   release  : reservedStock -= qty   (clamped at 0) — payment failed / expired
 *   consume  : stock -= qty AND reservedStock -= qty — order fulfilled
 *
 * The conditional update is a single `findOneAndUpdate`, so concurrent requests
 * for the last unit cannot both succeed — the database serialises them and
 * exactly one matches the filter.
 *
 * NOTE: a standalone mongod has no multi-document transactions, so a partial
 * multi-item failure is undone by compensating updates (releaseReservedStock)
 * rather than a rollback.
 */

import Product from '../models/product.model.js'
import Order from '../models/order.model.js'
import config from '../config/config.js'
import { logger } from '../utils/logger.js'

/** Raised when any line cannot be reserved. */
export class InsufficientStockError extends Error {
    constructor(details = {}) {
        super('One or more items do not have enough stock available.')
        this.name = 'InsufficientStockError'
        this.statusCode = 409
        this.code = 'INSUFFICIENT_STOCK'
        this.details = details
    }
}

/**
 * Atomically reserves `quantity` for one product.
 * Returns the updated product, or null when availability is insufficient.
 */
export const reserveOne = async (productId, quantity) =>
    Product.findOneAndUpdate(
        {
            _id: productId,
            status: 'active',
            $expr: {
                $gte: [
                    { $subtract: ['$stock', '$reservedStock'] },
                    quantity,
                ],
            },
        },
        { $inc: { reservedStock: quantity } },
        { returnDocument: 'after' }
    ).lean()

/**
 * Atomically returns `quantity` to the available pool, clamped at zero so a
 * double release can never push `reservedStock` negative.
 */
export const releaseOne = async (productId, quantity) =>
    Product.findOneAndUpdate(
        { _id: productId },
        [
            {
                $set: {
                    reservedStock: {
                        $max: [
                            0,
                            { $subtract: ['$reservedStock', quantity] },
                        ],
                    },
                },
            },
        ],
        // Mongoose 9 requires this flag to accept an aggregation pipeline.
        { returnDocument: 'after', updatePipeline: true }
    ).lean()

/**
 * Atomically consumes `quantity` of reserved stock (order fulfilled).
 * `stock` is decremented but never below zero.
 */
export const consumeOne = async (productId, quantity) =>
    Product.findOneAndUpdate(
        { _id: productId },
        [
            {
                $set: {
                    stock: { $max: [0, { $subtract: ['$stock', quantity] }] },
                    reservedStock: {
                        $max: [
                            0,
                            { $subtract: ['$reservedStock', quantity] },
                        ],
                    },
                },
            },
        ],
        { returnDocument: 'after', updatePipeline: true }
    ).lean()

/**
 * Reserves every line of an order.
 *
 * Throws `InsufficientStockError` when a line cannot be satisfied, after
 * releasing whatever this call already reserved (compensation).
 */
export const reserveOrderStock = async (items) => {
    const reserved = []

    for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const product = await reserveOne(item.productId, item.quantity)

        if (!product) {
            await releaseReservedStock(reserved)

            throw new InsufficientStockError({
                productId: String(item.productId),
                requested: item.quantity,
            })
        }

        reserved.push({
            productId: item.productId,
            quantity: item.quantity,
        })
    }

    return reserved
}

/** Compensating release for lines already reserved. Never throws. */
export const releaseReservedStock = async (items) => {
    for (const item of items) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await releaseOne(item.productId, item.quantity)
        } catch (error) {
            // A failed release must not mask the original failure; the
            // reservation-expiry job is the backstop.
            logger.error(
                { err: error, productId: String(item.productId) },
                'Failed to release reserved stock'
            )
        }
    }
}

/** Consuming counterpart for lines that were reserved. */
export const consumeReservedStock = async (items) => {
    for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        await consumeOne(item.productId, item.quantity)
    }
}

/**
 * Releases reservations for orders that are still awaiting payment after the
 * reservation TTL. Returns the number of orders expired.
 *
 * This is the "payment never happened" path: the customer closed the checkout
 * without paying, so the reservation must go back on sale.
 */
export const releaseExpiredReservations = async ({ now = new Date() } = {}) => {
    const cutoff = new Date(now.getTime() - config.STOCK_RESERVATION_TTL_MS)

    const expiredOrders = await Order.find({
        'payment.status': 'pending',
        orderStatus: 'pending',
        stockReservedAt: { $ne: null, $lte: cutoff },
        stockReleasedAt: null,
    })
        .select('_id orderNumber items orderStatus payment')
        .limit(500)

    let releasedCount = 0

    for (const order of expiredOrders) {
        /*
         * Claim the order first. If another worker (or a concurrent payment)
         * already moved it, the conditional update matches nothing and we skip
         * the release, which keeps this idempotent under concurrency.
         */
        // eslint-disable-next-line no-await-in-loop
        const claimed = await Order.findOneAndUpdate(
            {
                _id: order._id,
                'payment.status': 'pending',
                orderStatus: 'pending',
                stockReleasedAt: null,
            },
            {
                $set: {
                    stockReleasedAt: now,
                    orderStatus: 'cancelled',
                    'payment.status': 'failed',
                    'payment.failureReason': 'reservation_expired',
                },
            },
            { returnDocument: 'after' }
        )

        if (!claimed) continue

        // eslint-disable-next-line no-await-in-loop
        await releaseReservedStock(
            claimed.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            }))
        )

        releasedCount += 1

        logger.info(
            { orderNumber: claimed.orderNumber, orderId: String(claimed._id) },
            'Released expired stock reservation'
        )
    }

    return releasedCount
}

export default {
    reserveOne,
    releaseOne,
    consumeOne,
    reserveOrderStock,
    releaseReservedStock,
    consumeReservedStock,
    releaseExpiredReservations,
}
