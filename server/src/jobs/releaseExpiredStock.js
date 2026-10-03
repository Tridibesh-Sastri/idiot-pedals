import cron from 'node-cron'

import config from '../config/config.js'
import { releaseExpiredReservations } from '../services/stock.service.js'
import { logger } from '../utils/logger.js'

/**
 * Releases inventory held by orders whose payment never arrived.
 *
 * When an order is created the stock is reserved immediately, so an abandoned
 * checkout would otherwise hold a unit forever. Any order still awaiting
 * payment after STOCK_RESERVATION_TTL_MS is cancelled and its reservation
 * returned to the available pool.
 *
 * The job is safe to run concurrently (each order is claimed with a conditional
 * update) and safe to overlap with itself, so a slow run cannot double-release.
 */
export const releaseStockNow = async ({ now = new Date() } = {}) => {
    const released = await releaseExpiredReservations({ now })

    if (released > 0) {
        logger.info(
            { releasedOrders: released },
            '[Cron Log] Released expired stock reservations.'
        )
    }

    return released
}

export const initStockReleaseJob = () => {
    const schedule = config.STOCK_RELEASE_INTERVAL_CRON

    if (!cron.validate(schedule)) {
        throw new Error(
            `STOCK_RELEASE_INTERVAL_CRON is not a valid cron expression: ${schedule}`
        )
    }

    const job = cron.schedule(schedule, async () => {
        try {
            await releaseStockNow()
        } catch (error) {
            logger.error(
                { err: error },
                '[Cron Error] Failed to release expired stock reservations:'
            )
        }
    })

    logger.info(
        { schedule, ttlMs: config.STOCK_RESERVATION_TTL_MS },
        '[Cron Status] Stock reservation release job scheduled.'
    )

    return job
}

export default initStockReleaseJob
