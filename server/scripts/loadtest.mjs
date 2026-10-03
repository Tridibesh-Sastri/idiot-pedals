#!/usr/bin/env node
/**
 * Load test runner.
 *
 *   node scripts/loadtest.mjs [--port 5075] [--amount 250] [--connections 10]
 *
 * The server it starts ALWAYS runs with EMAIL_NOTIFICATIONS_ENABLED=false, set
 * right here in this script, so a load run can never deliver mail to anyone. A
 * fresh server process is started per measured endpoint, because the in-memory
 * rate limiter would otherwise carry its budget over between measurements.
 *
 * `autocannon` is executed through npx and is deliberately NOT a dependency.
 *
 * Authed endpoints need a token (load-testing order create or payment create):
 *
 *   LOAD_TOKEN=<access token> LOAD_PRODUCT_ID=<product id> node scripts/loadtest.mjs
 */

import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Runs the autocannon CLI through npm's own npx-cli.js with an argument ARRAY.
 *
 * Spawning `npx.cmd` directly is refused by Node on Windows (EINVAL, the
 * .cmd/.bat spawn restriction), and `shell: true` would corrupt the JSON request
 * bodies. Invoking npx-cli.js with node keeps an argument array and no shell, so
 * bodies survive intact on every platform.
 */
const npxCliPath = path.join(
    path.dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npx-cli.js'
)

const runAutocannon = (args) => {
    if (fs.existsSync(npxCliPath)) {
        return execFileAsync(process.execPath, [npxCliPath, '--yes', 'autocannon', ...args], {
            maxBuffer: 20 * 1024 * 1024,
        })
    }

    // Fallback for installs that keep npm elsewhere: plain npx, no shell.
    return execFileAsync('npx', ['--yes', 'autocannon', ...args], {
        maxBuffer: 20 * 1024 * 1024,
    })
}

const arg = (name, fallback) => {
    const index = process.argv.indexOf(`--${name}`)
    return index > -1 ? process.argv[index + 1] : fallback
}

const PORT = Number(arg('port', 5075))
const AMOUNT = Number(arg('amount', 250))
const CONNECTIONS = Number(arg('connections', 10))
const TOKEN = process.env.LOAD_TOKEN ?? ''
const PRODUCT_ID = process.env.LOAD_PRODUCT_ID ?? ''
const BASE = `http://127.0.0.1:${PORT}`

const serverEnv = {
    ...process.env,
    NODE_ENV: 'development',
    // The whole point: no load run may ever send real email.
    EMAIL_NOTIFICATIONS_ENABLED: 'false',
    PORT: String(PORT),
}

let child = null

const startServer = async () => {
    child = spawn(process.execPath, ['src/server.js'], {
        cwd: process.cwd(),
        env: serverEnv,
        stdio: 'ignore',
    })

    for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
            const res = await fetch(`${BASE}/healthz`)
            if (res.ok) return
        } catch {
            /* not up yet */
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
    }

    throw new Error('Server did not become healthy in time')
}

const stopServer = () => {
    if (child && !child.killed) child.kill('SIGTERM')
    child = null
}

const endpoints = [
    { label: 'GET  /api/products', args: [`${BASE}/api/products`] },
    {
        label: 'POST /api/auth/login',
        args: ['-m', 'POST', '-H', 'Content-Type: application/json', '-b', JSON.stringify({
            email: process.env.LOAD_EMAIL ?? '',
            password: process.env.LOAD_PASSWORD ?? '',
        }), `${BASE}/api/auth/login`],
        requiresAuth: false,
        skipUnless: Boolean(process.env.LOAD_EMAIL),
    },
    {
        label: 'POST /api/order',
        args: ['-m', 'POST', '-H', 'Content-Type: application/json', '-H', `Authorization: Bearer ${TOKEN}`, '-b', JSON.stringify({
            items: [{ productId: PRODUCT_ID, quantity: 1 }],
            paymentMethod: 'razorpay',
            customer: { name: 'Load Test', email: 'loadtest@mailhost.test', phone: '9000000999' },
            shippingAddress: {
                name: 'Load Test', phone: '9000000999', addressLine1: '1 Load St',
                city: 'Kolkata', state: 'West Bengal', postalCode: '700001', country: 'India',
            },
        }), `${BASE}/api/order`],
        skipUnless: Boolean(TOKEN && PRODUCT_ID),
    },
]

const run = async () => {
    const rows = []

    for (const endpoint of endpoints) {
        if (endpoint.skipUnless === false) continue

        await startServer()

        try {
            const { stdout } = await runAutocannon([
                '-j',
                '-a', String(AMOUNT),
                '-c', String(CONNECTIONS),
                ...endpoint.args,
            ])

            const result = JSON.parse(stdout)
            const failures = Object.entries(result.statusCodeStats ?? {})
                .filter(([code]) => Number(code) >= 400)
                .map(([code, info]) => `${code}:${info.count}`)
                .join(',') || 'none'

            rows.push({
                endpoint: endpoint.label,
                requests: result.requests.total,
                ok: result['2xx'] ?? 0,
                failures,
                p50: result.latency.p50,
                p97_5: result.latency.p97_5,
                p99: result.latency.p99,
                rps: Math.round(result.requests.average),
            })
        } finally {
            stopServer()
        }
    }

    console.log(`\nEMAIL_NOTIFICATIONS_ENABLED=${serverEnv.EMAIL_NOTIFICATIONS_ENABLED} (no mail can be sent)\n`)
    console.log(
        'endpoint'.padEnd(22),
        'reqs'.padEnd(6), '2xx'.padEnd(6), 'failures'.padEnd(12),
        'p50'.padEnd(6), 'p97.5'.padEnd(7), 'p99'.padEnd(6), 'rps'
    )

    for (const row of rows) {
        console.log(
            row.endpoint.padEnd(22),
            String(row.requests).padEnd(6), String(row.ok).padEnd(6), row.failures.padEnd(12),
            String(row.p50).padEnd(6), String(row.p97_5).padEnd(7), String(row.p99).padEnd(6), String(row.rps)
        )
    }
}

try {
    await run()
} finally {
    stopServer()
}
