import cron from 'node-cron'
import refreshModel from '../models/refreshToken.model.js'

export const initCleanupJob = () => {
    /*
     * Run every night at midnight.
     *
     * This cleanup is supplementary to MongoDB's TTL index.
     * It removes revoked tokens that are older than 24 hours
     * while MongoDB's TTL index handles expired tokens.
     */

    const job = cron.schedule('0 0 * * *', async () => {
        try {
            const twentyFourHoursAgo = new Date(
                Date.now() - 24 * 60 * 60 * 1000
            )

            const now = new Date()

            const result = await refreshModel.deleteMany({
                $or: [
                    {
                        expiresAt: {
                            $lt: now,
                        },
                    },
                    {
                        revokedAt: {
                            $ne: null,
                            $lt: twentyFourHoursAgo,
                        },
                    },
                ],
            })

            console.log(
                `[Cron Log] Refresh token cleanup completed. ` +
                `Removed ${result.deletedCount} token(s).`
            )
        } catch (error) {
            console.error(
                '[Cron Error] Failed to run refresh token cleanup:',
                error
            )
        }
    })

    console.log(
        '[Cron Status] Refresh token cleanup job scheduled successfully.'
    )

    return job
}