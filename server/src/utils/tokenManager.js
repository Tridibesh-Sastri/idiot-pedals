import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import config from '../config/config.js'

const ACCESS_TOKEN_EXPIRES_IN = '15m'
const REFRESH_TOKEN_EXPIRES_IN = '7d'
const JWT_ISSUER = 'idiot-pedals-api'
const JWT_AUDIENCE = 'idiot-pedals-client'
const JWT_ALGORITHM = 'HS256'

const signOptions = (expiresIn) => ({ algorithm: JWT_ALGORITHM, expiresIn, issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
const verifyOptions = { algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER, audience: JWT_AUDIENCE }

export const hashToken = (token) => {
    if (typeof token !== 'string' || !token.length) throw new TypeError('Token must be a non-empty string')
    return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

export const compareToken = (token, storedHash) => {
    if (typeof token !== 'string' || typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/i.test(storedHash)) return false
    const tokenBuffer = Buffer.from(hashToken(token), 'hex')
    const storedBuffer = Buffer.from(storedHash, 'hex')
    if (tokenBuffer.length !== storedBuffer.length) return false
    return crypto.timingSafeEqual(tokenBuffer, storedBuffer)
}

export const refreshTokenGenerator = async ({ userId, role }) => {
    if (!userId || !role) throw new Error('userId and role are required')
    const jti = crypto.randomUUID()
    const token = jwt.sign({ userId: String(userId), role }, config.REFRESH_TOKEN_SECRET, { ...signOptions(REFRESH_TOKEN_EXPIRES_IN), jwtid: jti })
    const decoded = jwt.decode(token)
    if (!decoded || typeof decoded.exp !== 'number') throw new Error('Failed to determine refresh token expiration')
    return { refreshToken: token, expiresAt: new Date(decoded.exp * 1000), jti }
}

export const accessTokenGenerator = async ({ userId, role }) => {
    if (!userId || !role) throw new Error('userId and role are required')
    return jwt.sign({ userId: String(userId), role }, config.ACCESS_TOKEN_SECRET, signOptions(ACCESS_TOKEN_EXPIRES_IN))
}

export const verifyRefreshToken = async (refreshToken) => {
    try {
        if (typeof refreshToken !== 'string' || !refreshToken.length) return { decoded: null, error: new Error('Invalid refresh token') }
        const decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET, verifyOptions)
        return { decoded, error: null }
    } catch (error) {
        return { decoded: null, error }
    }
}

export const verifyAccessToken = async (accessToken) => {
    if (typeof accessToken !== 'string' || !accessToken.length) throw new Error('Invalid access token')
    return jwt.verify(accessToken, config.ACCESS_TOKEN_SECRET, verifyOptions)
}
