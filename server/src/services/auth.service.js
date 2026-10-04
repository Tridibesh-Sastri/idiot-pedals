import refreshModel from '../models/refreshToken.model.js'
import config from '../config/config.js'
import {
    refreshTokenGenerator,
    hashToken,
} from '../utils/tokenManager.js'

const REFRESH_COOKIE_NAME = 'refreshToken'

/*
 * Session-cookie flags. sameSite comes from COOKIE_SAMESITE (default
 * 'strict' = same-origin / same-parent-domain layouts; 'none' = split
 * domains, e.g. app on one host and API on another). Browsers reject
 * SameSite=None without Secure, so 'none' forces secure=true even outside
 * production (localhost is a secure context, so local dev keeps working).
 * Exported for tests; every set/clear site must go through it so the flags
 * can never drift apart (a mismatched clear silently fails to delete).
 */
export const buildRefreshCookieOptions = (sameSite = config.COOKIE_SAMESITE) => {
    const resolved = sameSite === 'none' ? 'none' : 'strict'

    return {
        httpOnly: true,
        secure: resolved === 'none' ? true : config.NODE_ENV === 'production',
        sameSite: resolved,
        path: '/',
    }
}

const getRefreshCookieOptions = (expiresAt) => ({
    ...buildRefreshCookieOptions(),
    expires: expiresAt,
})

const getClearCookieOptions = () => buildRefreshCookieOptions()

export const setRefreshCookie = (
    res,
    refreshToken,
    expiresAt
) => {
    res.cookie(
        REFRESH_COOKIE_NAME,
        refreshToken,
        getRefreshCookieOptions(expiresAt)
    )
}

export const clearRefreshCookie = (res) => {
    res.clearCookie(
        REFRESH_COOKIE_NAME,
        getClearCookieOptions()
    )
}

export const createRefreshSession = async (
    userId,
    role
) => {

    
    const {
        refreshToken,
        expiresAt,
    } = await refreshTokenGenerator({
        userId,
        role,
    })

    const tokenHash = hashToken(refreshToken)

    const refreshRecord = await refreshModel.create({
        userId,
        tokenHash,
        expiresAt,
        revokedAt: null,
    })

    return {
        refreshToken,
        expiresAt,
        refreshRecord,
    }
}
