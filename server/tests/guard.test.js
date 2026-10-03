import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * Network-guard proof and webhook claim recovery.
 *
 * Part 1 proves the guard is what blocks outbound traffic — every assertion
 * checks the guard's own error code, so an ordinary network failure (DNS,
 * offline, refused) cannot make a test pass by accident.
 *
 * Part 2 proves an event is retryable after a failure, which is what makes the
 * atomic claim safe: a handler that throws, or a process that dies mid-claim,
 * must not strand a payment forever.
 */

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import mongoose from 'mongoose'

import app from '../src/app/app.js'
import config from '../src/config/config.js'
import userModel from '../src/models/user.model.js'
import productModel from '../src/models/product.model.js'
import orderModel from '../src/models/order.model.js'
import webhookEventModel from '../src/models/webhookEvent.model.js'
import { accessTokenGenerator } from '../src/utils/tokenManager.js'

void fakeRazorpay

const TEST_DB = 'idiot-pedals-test'

const testMongoUri = (() => {
  const [base, query = ''] = config.MONGO_URI.split('?')
  const lastSlash = base.lastIndexOf('/')
  const withDb = base.slice(0, lastSlash + 1) + TEST_DB
  return query ? `${withDb}?${query}` : withDb
})()

let server
let baseUrl
let user
let token

const apiFetch = async (path, { method = 'GET', authToken = token, body } = {}) => {
  const headers = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  return { status: res.status, json, text }
}

const postRawWebhook = async (rawBody, { signature, eventId }) => {
  const res = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-event-id': eventId,
      'x-razorpay-signature': signature,
    },
    body: rawBody,
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  return { status: res.status, json }
}

const signWebhookBody = async (rawBody) => {
  const { createHmac } = await import('node:crypto')
  return createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')
}

const capturedPayload = ({ razorpayOrderId, razorpayPaymentId, amount, currency = 'INR' }) =>
  JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: { id: razorpayPaymentId, order_id: razorpayOrderId, amount, currency, status: 'captured' },
      },
    },
  })

let skuCounter = 0
const createProduct = async ({ price = 1000, stock = 5 } = {}) => {
  skuCounter += 1
  return productModel.create({
    name: `Guard Pedal ${skuCounter}`,
    slug: `guard-pedal-${skuCounter}`,
    sku: `GUARD-${skuCounter}`,
    description: 'Guard fixture product.',
    price,
    currency: 'INR',
    stock,
    reservedStock: 0,
    status: 'active',
  })
}

const reloadProduct = (id) => productModel.findById(id).lean()

const createOrderWithRazorpayId = async ({ price = 1000, quantity = 1, stock = 5 } = {}) => {
  const product = await createProduct({ price, stock })
  const razorpayOrderId = `order_guard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const created = await apiFetch('/api/order', {
    method: 'POST',
    body: {
      items: [{ productId: String(product._id), quantity }],
      paymentMethod: 'razorpay',
      customer: { name: 'Guard', email: 'guard@mailhost.test', phone: '9000000400' },
      shippingAddress: {
        name: 'Guard', phone: '9000000400', addressLine1: '3 Test Street',
        city: 'Kolkata', state: 'West Bengal', postalCode: '700001', country: 'India',
      },
    },
  })

  assert.equal(created.status, 201, created.text)

  const orderId = created.json.order._id

  await orderModel.updateOne({ _id: orderId }, { $set: { 'payment.razorpayOrderId': razorpayOrderId } })

  return { orderId, product, razorpayOrderId, totalMinor: Math.round(price * 100) * quantity }
}

before(async () => {
  await mongoose.connect(testMongoUri)
  await mongoose.connection.dropDatabase()

  await Promise.all([
    userModel.init(),
    productModel.init(),
    orderModel.init(),
    webhookEventModel.init(),
  ])

  user = await userModel.create({
    name: 'Guard User',
    email: 'guard-user@mailhost.test',
    emailVerified: true,
    phone: '9000000401',
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: 'guard-user@mailhost.test' }],
    passwordHash: 'test-hash',
    role: 'customer',
  })

  token = await accessTokenGenerator({ userId: user._id, role: user.role })

  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
})

/* ========================================================================== */
/* 1. Network guard proof                                                      */
/* ========================================================================== */

describe('network guard', () => {
  test('blocks fetch to a host outside the loopback allow-list', async () => {
    await assert.rejects(
      () => fetch('https://example.com'),
      (error) => {
        // The guard's own error code — not a DNS/connectivity failure.
        assert.equal(error.code, 'NETWORK_BLOCKED_IN_TEST')
        assert.match(error.message, /Outbound network is blocked during tests/)
        assert.match(error.message, /example\.com/)
        return true
      }
    )
  })

  test('blocks https.request to a host outside the loopback allow-list', async () => {
    const https = await import('node:https')

    assert.throws(
      () => https.default.request({ hostname: 'example.com', path: '/' }),
      (error) => {
        assert.equal(error.code, 'NETWORK_BLOCKED_IN_TEST')
        assert.match(error.message, /example\.com/)
        return true
      }
    )

    assert.throws(
      () => https.default.get('https://example.com/anything'),
      (error) => error.code === 'NETWORK_BLOCKED_IN_TEST'
    )
  })

  test('blocks plain http to a host outside the loopback allow-list', async () => {
    const httpModule = await import('node:http')

    assert.throws(
      () => httpModule.default.request({ hostname: 'example.com', path: '/' }),
      (error) => error.code === 'NETWORK_BLOCKED_IN_TEST'
    )
  })

  test('still allows loopback, which the tests depend on', async () => {
    const res = await fetch(`${baseUrl}/healthz`)
    assert.equal(res.status, 200)
    await res.text()

    // Constructing a loopback request must not be blocked.
    const https = await import('node:https')
    const req = https.default.request({ hostname: '127.0.0.1', port: 1, path: '/' })
    req.on('error', () => {})
    req.destroy()
  })
})

/* ========================================================================== */
/* 2. Webhook claim recovery                                                   */
/* ========================================================================== */

describe('webhook claim recovery', () => {
  test('a handler that throws leaves the event retryable, and the retry succeeds', async () => {
    const unknownRazorpayOrderId = `order_unknown_${Date.now()}`
    const eventId = `evt_throw_${Date.now()}`

    const rawBody = capturedPayload({
      razorpayOrderId: unknownRazorpayOrderId,
      razorpayPaymentId: `pay_throw_${Date.now()}`,
      amount: 100000,
    })
    const signature = await signWebhookBody(rawBody)

    // No order carries this provider id yet, so processing throws.
    const failed = await postRawWebhook(rawBody, { signature, eventId })
    assert.equal(failed.status >= 400, true)

    const stranded = await webhookEventModel.findOne({ eventId }).lean()
    assert.equal(Boolean(stranded), true)
    assert.equal(stranded.status, 'failed')
    assert.equal(typeof stranded.errorMessage, 'string')
    assert.equal(stranded.errorMessage.length > 0, true)

    // The order now exists, and the provider retries the SAME event id.
    const product = await createProduct({ price: 1000, stock: 2 })

    const created = await apiFetch('/api/order', {
      method: 'POST',
      body: {
        items: [{ productId: String(product._id), quantity: 1 }],
        paymentMethod: 'razorpay',
        customer: { name: 'Guard', email: 'guard@mailhost.test', phone: '9000000400' },
        shippingAddress: {
          name: 'Guard', phone: '9000000400', addressLine1: '3 Test Street',
          city: 'Kolkata', state: 'West Bengal', postalCode: '700001', country: 'India',
        },
      },
    })
    const orderId = created.json.order._id

    await orderModel.updateOne(
      { _id: orderId },
      { $set: { 'payment.razorpayOrderId': unknownRazorpayOrderId } }
    )

    const retry = await postRawWebhook(rawBody, { signature, eventId })
    assert.equal(retry.status, 200)
    assert.equal(retry.json.processed, true)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'fulfilled')

    const event = await webhookEventModel.findOne({ eventId }).lean()
    assert.equal(event.status, 'processed')
  })

  test('a duplicate of an already-processed event still returns 200', async () => {
    const { razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_repeat_${Date.now()}`,
      amount: totalMinor,
    })
    const signature = await signWebhookBody(rawBody)
    const eventId = `evt_repeat_${Date.now()}`

    assert.equal((await postRawWebhook(rawBody, { signature, eventId })).status, 200)

    const again = await postRawWebhook(rawBody, { signature, eventId })
    assert.equal(again.status, 200)
    assert.equal(again.json.duplicate, true)
  })

  test('a claim stuck in processing for over 5 minutes is reclaimable', async () => {
    const { orderId, razorpayOrderId, totalMinor, product } = await createOrderWithRazorpayId()

    const eventId = `evt_stale_${Date.now()}`
    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_stale_${Date.now()}`,
      amount: totalMinor,
    })

    /*
     * Simulate a process that died after claiming: the event sits in
     * 'processing' with an old timestamp. Written with the raw driver so
     * Mongoose does not refresh updatedAt.
     */
    const staleAt = new Date(Date.now() - 10 * 60 * 1000)

    await webhookEventModel.collection.insertOne({
      eventId,
      event: 'payment.captured',
      status: 'processing',
      createdAt: staleAt,
      updatedAt: staleAt,
      __v: 0,
    })

    const res = await postRawWebhook(rawBody, { signature: await signWebhookBody(rawBody), eventId })

    assert.equal(res.status, 200)
    assert.equal(res.json.processed, true)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'fulfilled')
    assert.equal((await reloadProduct(product._id)).stock, 4)
  })

  test('a fresh claim in processing is NOT stolen', async () => {
    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()

    const eventId = `evt_fresh_${Date.now()}`
    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_fresh_${Date.now()}`,
      amount: totalMinor,
    })

    await webhookEventModel.collection.insertOne({
      eventId,
      event: 'payment.captured',
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    })

    const res = await postRawWebhook(rawBody, { signature: await signWebhookBody(rawBody), eventId })

    // Acknowledged, but the other delivery still owns it — and the order is
    // untouched, so a slow but healthy delivery cannot be double-applied.
    assert.equal(res.status, 200)
    assert.equal(res.json.duplicate, true)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'pending')
  })
})
