import refreshModel from '../models/refreshToken.model.js'
import config from '../config/config.js'
import {
    refreshTokenGenerator,
    hashToken,
} from '../utils/tokenManager.js'

const REFRESH_COOKIE_NAME = 'refreshToken'

const getRefreshCookieOptions = (expiresAt) => ({
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
})

const getClearCookieOptions = () => ({
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
})

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
