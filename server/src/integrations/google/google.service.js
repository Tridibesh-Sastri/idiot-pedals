import { OAuth2Client } from 'google-auth-library'
import config from '../../config/config.js'

const GOOGLE_SCOPES = ['openid', 'email', 'profile']

const googleClient = new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_CALLBACK_URL
)

/*
 * ============================================================
 * STATE HANDLING
 * ============================================================
 *
 * The OAuth `state` value is minted by the route handler and persisted ONLY in
 * a signed, httpOnly, SameSite=Lax cookie. It is deliberately not kept in
 * process memory:
 *
 *   - it survives a server restart (an in-memory Map did not)
 *   - it works across multiple instances / horizontal scaling
 *   - the signature makes it tamper-evident without server-side storage
 *
 * Validation and single-use clearing live in `googleCallbackController`.
 */

/**
 * Builds the Google consent URL for a given state value.
 */
export const getGoogleAuthUrl = (state) =>
    googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        prompt: 'select_account',
        state,
        include_granted_scopes: true,
        redirect_uri: config.GOOGLE_CALLBACK_URL,
    })

/**
 * Exchanges the authorization code and returns the verified Google identity.
 *
 * State validation is NOT performed here (see above) — it belongs to the
 * callback controller, which must still run it before calling this.
 */
export const getGoogleUser = async (code) => {
    if (typeof code !== 'string' || !code.length) {
        throw new Error('Google authorization code is required')
    }

    const { tokens } = await googleClient.getToken({
        code,
        redirect_uri: config.GOOGLE_CALLBACK_URL,
    })

    if (!tokens.id_token) throw new Error('Google did not return an ID token')

    const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: config.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()

    if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
        throw new Error('Google account identifier is missing')
    }
    if (typeof payload.email !== 'string' || !payload.email) {
        throw new Error('Google account email is missing')
    }
    if (payload.email_verified !== true) {
        throw new Error('Google email is not verified')
    }

    return {
        providerId: payload.sub,
        email: payload.email,
        emailVerified: true,
        name:
            typeof payload.name === 'string' && payload.name.trim()
                ? payload.name.trim()
                : payload.email.split('@')[0],
        picture: typeof payload.picture === 'string' ? payload.picture : null,
    }
}
