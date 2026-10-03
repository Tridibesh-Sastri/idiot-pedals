#!/usr/bin/env node
/**
 * Live end-to-end check against a real development server and database.
 *
 *   node scripts/live-check.mjs [--port 5076]
 *
 * The server this script starts ALWAYS runs with
 * EMAIL_NOTIFICATIONS_ENABLED=false (set below, inside the script), so a live
 * check can never deliver mail.
 *
 * The fake Razorpay provider is NOT used here — this runs the real application
 * against the real database. It therefore never creates a Razorpay order: the
 * payment check deliberately exercises the idempotent REUSE path (the order
 * already carries a razorpayOrderId), which makes no outbound API call.
 *
 * Fixtures are created with clearly-marked test identities and deleted again at
 * the end.
 */

import { spawn } from 'node:child_process'

import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

import config from '../src/config/config.js'
import userModel from '../src/models/user.model.js'
import orderModel from '../src/models/order.model.js'
import productModel from '../src/models/product.model.js'
import { accessTokenGenerator } from '../src/utils/tokenManager.js'

const arg = (name, fallback) => {
    const index = process.argv.indexOf(`--${name}`)
    return index > -1 ? process.argv[index + 1] : fallback
}

const PORT = Number(arg('port', 5076))
const BASE = `http://127.0.0.1:${PORT}`

const LIVE_EMAIL = 'live-check@mailhost.test'
const LIVE_PHONE = '9000000300'
const LIVE_SKU = 'LIVE-CHECK-1'
const LIVE_ORDER_NUMBER = 'IP-LIVE-CHECK-0001'

const serverEnv = {
    ...process.env,
    NODE_ENV: 'development',
    // The whole point: a live check must never send real email.
    EMAIL_NOTIFICATIONS_ENABLED: 'false',
    PORT: String(PORT),
}

const results = []
const check = (name, ok, detail = '') => results.push([name, ok, detail])

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

const request = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
    const finalHeaders = { ...headers }
    if (token) finalHeaders.Authorization = `Bearer ${token}`
    if (body !== undefined) finalHeaders['Content-Type'] = 'application/json'

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: finalHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
    })

    const text = await res.text()
    let json = null
    try {
        json = text ? JSON.parse(text) : null
    } catch {
        json = null
    }

    return { status: res.status, json, setCookie: res.headers.getSetCookie?.() ?? [] }
}

const run = async () => {
    await mongoose.connect(config.MONGO_URI)

    console.log(`running against database: ${mongoose.connection.name}`)
    console.log(`EMAIL_NOTIFICATIONS_ENABLED=${serverEnv.EMAIL_NOTIFICATIONS_ENABLED} (no mail can be sent)\n`)

    // ---- fixtures -----------------------------------------------------------
    await orderModel.deleteMany({ orderNumber: LIVE_ORDER_NUMBER })
    await productModel.deleteOne({ sku: LIVE_SKU })
    await userModel.deleteOne({ email: LIVE_EMAIL })

    const product = await productModel.create({
        name: 'Live Check Pedal',
        slug: 'live-check-pedal',
        sku: LIVE_SKU,
        description: 'Live check fixture.',
        price: 4999,
        currency: 'INR',
        stock: 100000,
        reservedStock: 0,
        status: 'active',
    })

    const user = await userModel.create({
        name: 'Live Check',
        email: LIVE_EMAIL,
        emailVerified: true,
        phone: LIVE_PHONE,
        phoneVerified: false,
        authProviders: [{ provider: 'email', providerId: LIVE_EMAIL }],
        passwordHash: 'x',
        role: 'customer',
    })

    const otherUser = await userModel.create({
        name: 'Live Check Other',
        email: `live-check-other-${Date.now()}@mailhost.test`,
        emailVerified: true,
        phone: '9000000301',
        phoneVerified: false,
        authProviders: [{ provider: 'email', providerId: 'other@mailhost.test' }],
        passwordHash: 'x',
        role: 'customer',
    })

    const token = await accessTokenGenerator({ userId: user._id, role: user.role })

    const otherOrder = await orderModel.create({
        orderNumber: `IP-LIVE-OTHER-${Date.now()}`,
        userId: otherUser._id,
        items: [{
            productId: product._id, name: 'x', sku: 'x', quantity: 1,
            unitPrice: { amount: 100, amountMinor: 10000, currency: 'INR' },
            total: { amount: 100, amountMinor: 10000, currency: 'INR' },
        }],
        pricing: {
            subtotal: 100, shipping: 0, discount: 0, total: 100, currency: 'INR',
            subtotalMinor: 10000, shippingMinor: 0, discountMinor: 0, totalMinor: 10000,
        },
        customer: { name: 'Other', email: 'other@mailhost.test', phone: '9000000301' },
        shippingAddress: {
            name: 'Other', phone: '9000000301', addressLine1: 'x',
            city: 'x', state: 'x', postalCode: '700001', country: 'India',
        },
        payment: { method: 'razorpay', status: 'pending' },
        orderStatus: 'pending',
    })

    await startServer()

    try {
        // ---- health ---------------------------------------------------------
        const health = await request('/healthz')
        const ready = await request('/readyz')
        check('healthz', health.status === 200, `status=${health.status}`)
        check('readyz', ready.status === 200 && ready.json?.mongo === 'connected', `status=${ready.status}`)

        // ---- catalogue ------------------------------------------------------
        const products = await request('/api/products?limit=5')
        check('products list', products.status === 200 && Array.isArray(products.json?.data?.products), `status=${products.status}`)

        // ---- authenticated flow --------------------------------------------
        const me = await request('/api/auth/me', { token })
        check('me (bearer token)', me.status === 200, `status=${me.status}`)

        const order = await request('/api/order', {
            method: 'POST',
            token,
            body: {
                items: [{ productId: String(product._id), quantity: 1 }],
                paymentMethod: 'razorpay',
                customer: { name: 'Live Check', email: LIVE_EMAIL, phone: LIVE_PHONE },
                shippingAddress: {
                    name: 'Live Check', phone: LIVE_PHONE, addressLine1: '1 Live St',
                    city: 'Kolkata', state: 'West Bengal', postalCode: '700001', country: 'India',
                },
            },
        })
        const orderId = order.json?.order?._id
        check(
            'create order (201, paise total)',
            order.status === 201 && order.json?.order?.pricing?.totalMinor === 499900,
            `status=${order.status} totalMinor=${order.json?.order?.pricing?.totalMinor}`
        )

        // ---- payment: REUSE path only (no outbound provider call) ----------
        await orderModel.updateOne(
            { _id: orderId },
            { $set: { 'payment.razorpayOrderId': `order_live_fixture_${Date.now()}` } }
        )

        const [pay1, pay2] = await Promise.all([
            request('/api/payments/razorpay/create', { method: 'POST', token, body: { orderId } }),
            request('/api/payments/razorpay/create', { method: 'POST', token, body: { orderId } }),
        ])
        const id1 = pay1.json?.payment?.razorpayOrderId
        const id2 = pay2.json?.payment?.razorpayOrderId
        check('create payment (reuse)', pay1.status === 200 && Boolean(id1), `status=${pay1.status}`)
        check('double-click pay returns the same provider order', Boolean(id1) && id1 === id2, `${id1} vs ${id2}`)

        // ---- order detail + IDOR -------------------------------------------
        const detail = await request(`/api/order/${orderId}`, { token })
        check('order detail by id', detail.status === 200 && String(detail.json?.data?.order?._id) === String(orderId), `status=${detail.status}`)

        const byNumber = await request(`/api/order/${order.json.order.orderNumber}`, { token })
        check('order detail by order number', byNumber.status === 200, `status=${byNumber.status}`)

        const idorById = await request(`/api/order/${otherOrder._id}`, { token })
        const idorByNumber = await request(`/api/order/${otherOrder.orderNumber}`, { token })
        check('IDOR: another user order by id -> 404', idorById.status === 404, `status=${idorById.status}`)
        check('IDOR: another user order by number -> 404', idorByNumber.status === 404, `status=${idorByNumber.status}`)

        // ---- forged token ---------------------------------------------------
        const forged = jwt.sign({ userId: String(user._id), role: 'customer' }, 'not-the-real-secret', { expiresIn: '15m' })
        const forgedResult = await request('/api/auth/me', { token: forged })
        check('forged token -> 401', forgedResult.status === 401, `status=${forgedResult.status}`)
    } finally {
        stopServer()

        // ---- cleanup --------------------------------------------------------
        const removedOrders = await orderModel.deleteMany({
            $or: [{ userId: user._id }, { userId: otherUser._id }],
        })
        await productModel.deleteMany({ sku: LIVE_SKU })
        await userModel.deleteMany({ _id: { $in: [user._id, otherUser._id] } })

        console.log(`cleanup: removed ${removedOrders.deletedCount} order(s), 1 product, 2 users`)
        await mongoose.disconnect()
    }

    console.log('')
    for (const [name, ok, detail] of results) {
        console.log(`${ok ? 'PASS  ' : 'FAIL  '}${name.padEnd(46)}${detail}`)
    }

    const failed = results.filter(([, ok]) => !ok).length
    console.log(`\ntotal ${results.length}, passed ${results.length - failed}, failed ${failed}`)

    if (failed > 0) process.exitCode = 1
}

await run()
