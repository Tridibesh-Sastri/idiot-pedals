import jwt from 'jsonwebtoken'
import userModel from '../models/user.model.js'
import { verifyAccessToken } from '../utils/tokenManager.js'

const unauthorized = (res, message = 'Authentication required.') => res.status(401).json({ success: false, message })

const authenticateMiddleware = async (req, res, next) => {
    const authHeader = req.get('authorization')
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) return unauthorized(res)

    const token = authHeader.slice(7).trim()
    if (!token) return unauthorized(res)

    try {
        const decoded = await verifyAccessToken(token)
        if (!decoded || typeof decoded !== 'object' || typeof decoded.userId !== 'string' || typeof decoded.role !== 'string') return unauthorized(res)

        const user = await userModel.findById(decoded.userId).select('_id role emailVerified').lean()
        if (!user || !user.emailVerified || user.role !== decoded.role) return unauthorized(res)

        req.user = { userId: String(user._id), role: user.role }
        return next()
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) return unauthorized(res, 'Access token has expired.')
        return unauthorized(res)
    }
}

export default authenticateMiddleware
