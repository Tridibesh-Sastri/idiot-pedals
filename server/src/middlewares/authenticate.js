import jwt from 'jsonwebtoken'
import userModel from '../models/user.model.js'
import { verifyAccessToken } from '../utils/tokenManager.js'

import crypto from 'node:crypto';

const safeEqual = (a, b) => {
    if (
        typeof a !== 'string' ||
        typeof b !== 'string'
    ) {
        return false;
    }

    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(aBuffer, bBuffer);
};

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

export const verifyOAuthState = (req, res, next) => {
    const incomingState = req.query.state;
    const savedCookieState = req.signedCookies?.oauth_state;

    try {

        if (!savedCookieState || !safeEqual(savedCookieState, incomingState)) {
            clearOAuthCookie(res);
            return res.status(403).json({ success: false, message: 'Security contract mismatch.' });
        }

        next();
    } catch (parseError) {
        clearOAuthCookie(res);
        return res.status(400).json({ success: false, message: 'Invalid state string layout sequence.' });
    }
};


export default authenticateMiddleware
