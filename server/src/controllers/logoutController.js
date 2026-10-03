import refreshModel from '../models/refreshToken.model.js'
import {
    verifyRefreshToken,
    hashToken,
} from '../utils/tokenManager.js'
import { clearRefreshCookie } from '../services/auth.service.js'
import { logger } from '../utils/logger.js'

export const logoutController = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken

    try {
        if (typeof refreshToken === 'string' && refreshToken.length > 0) {
            const { decoded } = await verifyRefreshToken(refreshToken)

            if (decoded?.userId) {
                const tokenHash = hashToken(refreshToken)

                await refreshModel.updateOne(
                    {
                        userId: decoded.userId,
                        tokenHash,
                        revokedAt: null,
                    },
                    {
                        $set: {
                            revokedAt: new Date(),
                        },
                    }
                )
            }
        }
    } catch (error) {
        // Logout is intentionally idempotent. Never expose token
        // validation/database details to the client. The redacting logger
        // keeps stacks out of production logs (dev keeps them for debugging).
        logger.error({ err: error }, 'Logout error:')
    } finally {
        clearRefreshCookie(res)
    }

    return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    })
}
