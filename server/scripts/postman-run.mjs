#!/usr/bin/env node
/**
 * Runs the Postman collection's SAFE requests against a real development server.
 *
 *   node scripts/postman-run.mjs [--port 5077]
 *
 * The server it starts ALWAYS runs with EMAIL_NOTIFICATIONS_ENABLED=false, set
 * right here in this script, so this run can never deliver mail.
 *
 * Requests that reach outside the machine, or that need a browser/real
 * credentials, are SKIPPED and listed at the end with the reason. Everything
 * executed here is read-only or touches fixtures this script created and then
 * deletes.
 *
 * Expected status codes come from the collection's own test scripts, so the
 * collection is what is being verified.
 */

import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import mongoose from 'mongoose'

import config from '../src/config/config.js'
import userModel from '../src/models/user.model.js'
import orderModel from '../src/models/order.model.js'
import productModel from '../src/models/product.model.js'
import webhookEventModel from '../src/models/webhookEvent.model.js'
import { accessTokenGenerator } from '../src/utils/tokenManager.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const collection = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'Idiot Pedals.postman_collection.json'), 'utf8')
)

const arg = (name, fallback) => {
    const index = process.argv.indexOf(`--${name}`)
    return index > -1 ? process.argv[index + 1] : fallback
}

const PORT = Number(arg('port', 5077))
const BASE = `http://127.0.0.1:${PORT}`

/** Requests this script deliberately does not execute, with the reason. */
const SKIP = new Map([
    ['POST /api/auth/register', 'sends a real verification email'],
    ['GET /api/auth/verify-email', 'needs a token from a real email'],
    ['POST /api/auth/login', 'needs real credentials (placeholders in the file)'],
    ['POST /api/auth/refresh', 'needs a browser session cookie'],
    ['POST /api/auth/logout', 'needs a browser session cookie'],
    ['GET /api/auth/google (browser only)', 'browser redirect'],
    ['GET /api/auth/google/callback (browser only)', 'browser redirect'],
    ['POST /api/payments/razorpay/verify', 'would call the real Razorpay API for the payment'],
])

const serverEnv = {
    ...process.env,
    NODE_ENV: 'development',
    // The whole point: this run must never send real email.
    EMAIL_NOTIFICATIONS_ENABLED: 'false',
    PORT: String(PORT),
}

const walk = (items, out = []) => {
    for (const item of items) {
        if (item.item) walk(item.item, out)
        else out.push(item)
    }
    return out
}

const requests = walk(collection.item)

const expectedStatus = (item) => {
    const scripts = (item.event ?? [])
        .filter((entry) => entry.listen === 'test')
        .map((entry) => (entry.script.exec ?? []).join('\n'))
        .join('\n')

    const match = scripts.match(/pm\.response\.to\.have\.status\((\d{3})\)/)
    return match ? Number(match[1]) : null
}

const results = []
let child = null

/**
 * The collection deliberately contains PASTE_... placeholders instead of stored
 * credentials. Filling them in is what a tester does in Postman; this script
 * does it with throwaway fixture values.
 */
const placeholderValues = {}

const fillPlaceholders = (text) =>
    String(text)
        // Postman's dynamic {{$timestamp}} variable.
        .replace(/\{\{\$timestamp\}\}/g, () => String(Date.now()))
        .replace(/PASTE_[A-Z_]+/g, (match) =>
            placeholderValues[match] !== undefined ? placeholderValues[match] : match
        )

const startServer = async () => {
    child = spawn(process.execPath, ['src/server.js'], {
        cwd: path.resolve(here, '..'),
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

/**
 * Executes one collection item, substituting the variables a Postman env would
 * hold. `bodyOverride` is used by the signed webhook, where the exact bytes that
 * are signed must also be the bytes that are sent.
 */
const execute = async (item, variables, extraHeaders = {}, bodyOverride = undefined) => {
    const { method, url, body } = item.request

    const substitute = (value) =>
        fillPlaceholders(
            String(value).replace(/\{\{([^}]+)\}\}/g, (match, key) =>
                variables[key.trim()] !== undefined ? variables[key.trim()] : match
            )
        )

    const segments = (url.path || []).map(substitute)
    const query = (url.query || [])
        .filter((entry) => entry.value !== undefined && entry.value !== '')
        .map((entry) => `${entry.key}=${encodeURIComponent(substitute(entry.value))}`)
        .join('&')

    const target = `${BASE}/${segments.join('/')}${query ? `?${query}` : ''}`

    const headers = { ...extraHeaders }
    for (const header of item.request.header ?? []) {
        const key = header.key.toLowerCase()
        if (key === 'content-length' || key === 'host') continue
        headers[header.key] = substitute(header.value)
    }

    /*
     * extraHeaders wins. The collection keeps a placeholder signature header so a
     * human can see where it comes from, and its pre-request script replaces it;
     * here the computed signature must override that placeholder, not the reverse.
     */
    Object.assign(headers, extraHeaders)

    const hasBody = ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase())

    const res = await fetch(target, {
        method: method.toUpperCase(),
        headers,
        body: hasBody ? (bodyOverride !== undefined ? bodyOverride : (body?.raw !== undefined ? substitute(body.raw) : undefined)) : undefined,
        redirect: 'manual',
    })

    const text = await res.text()
    let json = null
    try {
        json = text ? JSON.parse(text) : null
    } catch {
        json = null
    }

    return { status: res.status, json, text, target }
}

const run = async () => {
    await mongoose.connect(config.MONGO_URI)
    console.log(`database: ${mongoose.connection.name}`)
    console.log(`EMAIL_NOTIFICATIONS_ENABLED=${serverEnv.EMAIL_NOTIFICATIONS_ENABLED} (no mail can be sent)\n`)

    const stamp = Date.now()
    const customerEmail = `postman-run-${stamp}@mailhost.test`

    await startServer()

    const variables = { baseUrl: BASE, accessToken: '', orderId: '', productId: '' }

    let product = null
    let customer = null
    let admin = null
    let otherCustomer = null

    try {
        // ---- fixtures -------------------------------------------------------
        product = await productModel.create({
            name: 'Postman Run Pedal',
            slug: `postman-run-pedal-${stamp}`,
            sku: `PMRUN-${stamp}`,
            description: 'Fixture for the Postman collection run.',
            price: 4999,
            currency: 'INR',
            stock: 1000,
            reservedStock: 0,
            status: 'active',
        })

        customer = await userModel.create({
            name: 'Postman Runner',
            email: customerEmail,
            emailVerified: true,
            phone: '9000000500',
            phoneVerified: false,
            authProviders: [{ provider: 'email', providerId: customerEmail }],
            passwordHash: 'x',
            role: 'customer',
        })

        admin = await userModel.create({
            name: 'Postman Admin',
            email: `postman-admin-${stamp}@mailhost.test`,
            emailVerified: true,
            phone: '9000000501',
            phoneVerified: false,
            authProviders: [{ provider: 'email', providerId: `postman-admin-${stamp}@mailhost.test` }],
            passwordHash: 'x',
            role: 'admin',
        })

        otherCustomer = await userModel.create({
            name: 'Postman Other',
            email: `postman-other-${stamp}@mailhost.test`,
            emailVerified: true,
            phone: '9000000502',
            phoneVerified: false,
            authProviders: [{ provider: 'email', providerId: `postman-other-${stamp}@mailhost.test` }],
            passwordHash: 'x',
            role: 'customer',
        })

        const customerToken = await accessTokenGenerator({ userId: customer._id, role: customer.role })
        const adminToken = await accessTokenGenerator({ userId: admin._id, role: admin.role })

        variables.productId = String(product._id)

        // Stand-ins for the collection's PASTE_... placeholders.
        placeholderValues.PASTE_TEST_ACCOUNT_EMAIL = customerEmail
        placeholderValues.PASTE_TEST_ACCOUNT_PASSWORD = 'NotARealPassword123!'
        placeholderValues.PASTE_VERIFICATION_TOKEN_FROM_EMAIL = 'not-a-real-verification-token'

        const razorpayOrderId = `order_postmanrun_${stamp}`

        /*
         * The collection's webhook body hardcodes an amount, which only matches
         * if the catalogue happens to contain a pedal at that price. The runner
         * rewrites it to the real order total before signing, because a mismatched
         * amount is correctly rejected with 400.
         */
        let webhookAmount = null

        // ---- run every safe request ----------------------------------------
        for (const item of requests) {
            const expected = expectedStatus(item)

            const skipReason = [...SKIP.entries()].find(([name]) => item.name.startsWith(name))?.[1]
            if (skipReason) {
                results.push({ name: item.name, skipped: true, reason: skipReason })
                continue
            }

            // Admin-only product routes need the admin token.
            const isAdminRoute = /\((admin)\)/.test(item.name)
            variables.accessToken = isAdminRoute ? adminToken : customerToken

            const extraHeaders = {}
            let bodyOverride

            const isSignedWebhook = item.name.startsWith('POST /api/webhooks/razorpay — signed')
            if (isSignedWebhook) {
                variables.razorpayOrderId = razorpayOrderId
                variables.razorpayPaymentId = `pay_postmanrun_${stamp}`

                /*
                 * Re-create the collection's pre-request signing in Node. The
                 * signature must cover the exact raw bytes, which is the point
                 * of the check.
                 */
                const secret = process.env.POSTMAN_WEBHOOK_SECRET
                if (!secret) {
                    results.push({
                        name: item.name,
                        skipped: true,
                        reason: 'POSTMAN_WEBHOOK_SECRET not provided to this script',
                    })
                    continue
                }

                if (!webhookAmount) {
                    results.push({
                        name: item.name,
                        skipped: true,
                        reason: 'no order was created, so the amount cannot match',
                    })
                    continue
                }

                const rawBody = fillPlaceholders(
                    String(item.request.body.raw).replace(
                        /\{\{([^}]+)\}\}/g,
                        (match, key) => (variables[key.trim()] !== undefined ? variables[key.trim()] : match)
                    )
                    // Line the capture up with the order's real paise total.
                ).replace(/"amount":\s*\d+/, `"amount": ${webhookAmount}`)

                bodyOverride = rawBody
                extraHeaders['x-razorpay-signature'] = crypto
                    .createHmac('sha256', secret)
                    .update(rawBody)
                    .digest('hex')
            }

            try {
                const res = await execute(item, variables, extraHeaders, bodyOverride)

                /*
                 * Honour the collection's own variable-saving side effects, so
                 * this run exercises exactly what a tester running the folder
                 * top-to-bottom would get.
                 */
                if (item.name.startsWith('POST /api/products (admin)') && res.json?.data?.product?._id) {
                    variables.productId = String(res.json.data.product._id)
                }

                // The re-seed request points {{productId}} back at a live product
                // (the DELETE above destroyed the one it pointed at).
                if (item.name.includes('re-seed') && res.json?.data?.products?.length) {
                    variables.productId = String(res.json.data.products[0]._id)
                }

                if (item.name.startsWith('POST /api/order — create order') && res.json?.order?._id) {
                    variables.orderId = String(res.json.order._id)
                    webhookAmount = res.json.order.pricing?.totalMinor ?? null

                    // Keep the payment request on its idempotent REUSE path so the
                    // live server makes no outbound Razorpay call.
                    await orderModel.updateOne(
                        { _id: res.json.order._id },
                        { $set: { 'payment.razorpayOrderId': razorpayOrderId } }
                    )
                }

                if (item.name.includes('create payment') && res.json?.payment?.razorpayOrderId) {
                    variables.razorpayOrderId = res.json.payment.razorpayOrderId
                }

                results.push({
                    name: item.name,
                    expected,
                    actual: res.status,
                    pass: expected === null ? false : res.status === expected,
                })
            } catch (error) {
                results.push({ name: item.name, expected, actual: `threw: ${error.message}`, pass: false })
            }
        }
    } finally {
        stopServer()

        const removedOrders = await orderModel.deleteMany({
            userId: { $in: [customer._id, otherCustomer._id, admin._id] },
        })
        await webhookEventModel.deleteMany({ event: 'payment.captured' })
        /*
         * The seeded product plus any product the collection created (its sku is
         * fixed in the file, so it must not be left behind or the next run gets
         * a 409 from the duplicate-key index).
         */
        const removedProducts = await productModel.deleteMany({
            sku: { $in: [`PMRUN-${stamp}`, 'IDIOT-NFB-001'] },
        })
        await userModel.deleteMany({ _id: { $in: [customer._id, otherCustomer._id, admin._id] } })

        console.log(
            `cleanup: ${removedOrders.deletedCount} order(s), ${removedProducts.deletedCount} product(s), 3 users, webhook events cleared\n`
        )

        await mongoose.disconnect()
    }

    let passed = 0
    let failed = 0
    let skipped = 0

    for (const result of results) {
        if (result.skipped) {
            skipped += 1
            console.log(`SKIP  ${result.name.padEnd(52)}${result.reason}`)
            continue
        }

        if (result.pass) passed += 1
        else failed += 1

        console.log(
            `${result.pass ? 'PASS  ' : 'FAIL  '}${result.name.padEnd(52)}expected ${result.expected}, got ${result.actual}`
        )
    }

    console.log(`\ntotal ${results.length}, passed ${passed}, failed ${failed}, skipped ${skipped}`)

    if (failed > 0) process.exitCode = 1
}

await run()
