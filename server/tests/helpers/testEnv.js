/**
 * Shared test bootstrap. MUST be the first import in every test file that boots
 * the application.
 *
 * ESM evaluates module dependencies in import order, so importing this module
 * first guarantees the environment is prepared before `config.js` (and therefore
 * anything that reads it) is evaluated:
 *
 *   1. NODE_ENV=test  -> the mailer uses its in-memory outbox, and every live
 *                        mail/Razorpay transport refuses to be constructed.
 *   2. The network guard blocks all non-loopback traffic for the whole run.
 *   3. A fake Razorpay provider is injected, so nothing can reach the live API
 *                        even if a test forgets to inject one.
 */

process.env.NODE_ENV = 'test'

/*
 * Pin the values a developer's real .env must never change test behavior
 * through. Cookie posture and the frontend origin feed auth flows (session
 * cookie flags, verification links, OAuth redirects), so a production-like
 * local .env would otherwise silently rewrite what the suite asserts.
 */
process.env.COOKIE_SAMESITE = 'strict'
process.env.FRONTEND_URL = 'http://localhost:3000'

const { installNetworkGuard } = await import('./networkGuard.js')
const { fakeRazorpay } = await import('./fakeRazorpay.js')
const { setRazorpayProvider } = await import('../../src/integrations/razorpay/razorpay.client.js')

installNetworkGuard()
setRazorpayProvider(fakeRazorpay)

export { fakeRazorpay }
