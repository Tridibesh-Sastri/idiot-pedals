/**
 * Outbound network guard for the test run.
 *
 * Any request that is not to loopback is refused with a synchronous error, so a
 * stray call to Razorpay, Resend, SMTP or Google fails the test immediately
 * instead of leaking traffic to a real service.
 *
 * Covers both flavours of client used in this codebase:
 *   - global fetch (Resend SDK, the test harness itself)
 *   - node:http / node:https request+get (axios, which the Razorpay SDK uses)
 */

import http from 'node:http'
import https from 'node:https'

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'])

export const isAllowedHost = (hostname) =>
    ALLOWED_HOSTS.has(String(hostname ?? '').toLowerCase())

export const blockedRequestError = (target) => {
    const error = new Error(
        `Outbound network is blocked during tests (attempted: ${target}). ` +
            'External services must be replaced by an in-memory fake.'
    )

    error.code = 'NETWORK_BLOCKED_IN_TEST'

    return error
}

const hostnameOf = (input) => {
    const raw =
        typeof input === 'string'
            ? input
            : typeof input?.url === 'string'
              ? input.url
              : input?.hostname ?? input?.host ?? null

    try {
        return new URL(raw).hostname
    } catch {
        // Relative URL (same-origin) or a bare hostname.
        return typeof raw === 'string' ? raw.split('/')[0].split(':')[0] : null
    }
}

export const installNetworkGuard = () => {
    if (globalThis.__idiotPedalsNetworkGuardInstalled) return

    globalThis.__idiotPedalsNetworkGuardInstalled = true

    /* ---- fetch (undici) ---- */
    const originalFetch = globalThis.fetch

    globalThis.fetch = (input, init) => {
        const hostname = hostnameOf(input)

        if (hostname && !isAllowedHost(hostname)) {
            // Reject rather than throw: fetch always returns a promise, and
            // callers (including the Resend SDK) expect to catch a rejection.
            return Promise.reject(blockedRequestError(hostname))
        }

        return originalFetch(input, init)
    }

    /* ---- node:http / node:https ---- */
    for (const module of [http, https]) {
        for (const method of ['request', 'get']) {
            const original = module[method]

            module[method] = function guardedRequest(...args) {
                const options = args[0]
                const hostname =
                    typeof options === 'string'
                        ? hostnameOf(options)
                        : options?.hostname ?? options?.host ?? null

                if (hostname && !isAllowedHost(hostname)) {
                    throw blockedRequestError(hostname)
                }

                return original.apply(this, args)
            }
        }
    }
}

export default installNetworkGuard
