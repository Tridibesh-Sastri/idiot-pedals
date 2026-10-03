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

export const authorizeAdmin = async (req, res, next ) =>{
    const {role} = req.user

    if(role !== 'admin'){
        return res.status(403).json({
            message : "User is not authorized to perform this action."
        })
    }

    return next()
}

/*
 * NOTE: `verifyOAuthState` was removed in Phase 1.
 *
 * It called `clearOAuthCookie(res)`, which was never defined anywhere in the
 * codebase — so any state mismatch would have thrown a ReferenceError and
 * produced a 500 instead of the intended 403. It also duplicated the OAuth
 * state check against an in-memory Map held by google.service.js, which loses
 * all pending states on restart and across instances.
 *
 * OAuth state validation now lives in `googleCallbackController`, which uses
 * the signed `oauth_state` cookie (stateless, restart-safe) and always answers
 * with a 302 into the SPA rather than JSON.
 */

export default authenticateMiddleware
