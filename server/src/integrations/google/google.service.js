import crypto from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import config from '../../config/config.js'

const GOOGLE_SCOPES = ['openid', 'email', 'profile']
const STATE_TTL_MS = 10 * 60 * 1000
const MAX_STATES = 10000
const oauthStateStore = new Map()

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_CALLBACK_URL)

const cleanupExpiredStates = () => {
    const now = Date.now()
    for (const [state, expiresAt] of oauthStateStore) if (expiresAt <= now) oauthStateStore.delete(state)
}

export const getGoogleAuthUrl = (state) => {
    cleanupExpiredStates()
    if (oauthStateStore.size >= MAX_STATES) {
        const oldest = oauthStateStore.keys().next().value
        if (oldest) oauthStateStore.delete(oldest)
    }

    oauthStateStore.set(state, Date.now() + STATE_TTL_MS)

    
    return googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        prompt: 'select_account',
        state,
        include_granted_scopes: true,
        redirect_uri: config.GOOGLE_CALLBACK_URL,
    })
}

const consumeOAuthState = (state) => {
    
    if (typeof state !== 'string' || !state.length) return false

    const expiresAt = oauthStateStore.get(state)

    if (!expiresAt) return false

    oauthStateStore.delete(state)

    return expiresAt > Date.now()
}

export const getGoogleUser = async (code, state) => {

    if (!consumeOAuthState(state)) throw new Error('Invalid or expired Google OAuth state')
    if (typeof code !== 'string' || !code.length) throw new Error('Google authorization code is required')

    const { tokens } = await googleClient.getToken(code)
    if (!tokens.id_token) throw new Error('Google did not return an ID token')

    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: config.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload || typeof payload.sub !== 'string' || !payload.sub) throw new Error('Google account identifier is missing')
    if (typeof payload.email !== 'string' || !payload.email) throw new Error('Google account email is missing')
    if (payload.email_verified !== true) throw new Error('Google email is not verified')

    return {
        providerId: payload.sub,
        email: payload.email,
        emailVerified: true,
        name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : payload.email.split('@')[0],
        picture: typeof payload.picture === 'string' ? payload.picture : null,
    }
}
