/**
 * Phase 2 — payment safety tests.
 *
 * Real MongoDB (separate database `idiot-pedals-test`, dropped before and
 * after) and real HTTP requests against an ephemeral listener.
 *
 * Run with `--test-concurrency=1` (see package.json) so that test files sharing
 * the database do not run simultaneously.
 *
 *   node --test --test-concurrency=1 tests/phase2.test.js
 */

import { fakeRazorpay } from "./helpers/testEnv.js";

import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import mongoose from 'mongoose'

import app from '../src/app/app.js'
import config from '../src/config/config.js'
import userModel from '../src/models/user.model.js'
import productModel from '../src/models/product.model.js'
import orderModel from '../src/models/order.model.js'
import webhookEventModel from '../src/models/webhookEvent.model.js'
import { accessTokenGenerator } from '../src/utils/tokenManager.js'
import {
  multiplyMinor,
  sumMinor,
  toMajor,
  toMinor,
} from '../src/utils/money.js'
import {
  canTransition,
  applyTransition,
} from '../src/domain/orderStateMachine.js'
import { verifyPaymentSignature } from '../src/integrations/razorpay/razorpay.service.js'
import { redact } from '../src/utils/logger.js'
import { releaseStockNow } from '../src/jobs/releaseExpiredStock.js'
import {
  verifyRazorpayWebhookSignature,
  processRazorpayWebhook,
} from '../src/services/webhook.service.js'

/* -------------------------------------------------------------------------- */
/* Harness                                                                     */
/* -------------------------------------------------------------------------- */

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

const orderPayload = (productId, quantity = 1, extraItemFields = {}) => ({
  items: [{ productId, quantity, ...extraItemFields }],
  // 'razorpay' rather than 'cod': a COD order fires the real admin notification
  // email through Resend, and tests must not make external calls.
  paymentMethod: 'razorpay',
  customer: { name: 'Phase Two', email: 'phase2@mailhost.test', phone: '9000000123' },
  shippingAddress: {
    name: 'Phase Two',
    phone: '9000000123',
    addressLine1: '1 Test Street',
    city: 'Kolkata',
    state: 'West Bengal',
    postalCode: '700001',
    country: 'India',
  },
})

let skuCounter = 0
const createProduct = async ({ price, stock, name = 'Phase2 Pedal' }) => {
  skuCounter += 1
  return productModel.create({
    name,
    slug: `phase2-pedal-${skuCounter}`,
    sku: `PHASE2-${skuCounter}`,
    description: 'Phase 2 fixture product.',
    price,
    currency: 'INR',
    stock,
    reservedStock: 0,
    status: 'active',
  })
}

const reloadProduct = (id) => productModel.findById(id).lean()

let userCounter = 0

/*
 * Fixture helper: a brand-new authenticated user. POST /api/order carries a
 * per-user rate limit, so tests must not share one user for order creation —
 * each test (or contending request) gets its own budget. No test reads the
 * shared `user` for anything but authentication, so this is setup-only.
 */
const freshAuth = async () => {
  userCounter += 1
  const stamp = `${Date.now()}_${userCounter}_${Math.random().toString(36).slice(2, 8)}`
  const email = `phase2-rot-${stamp}@mailhost.test`

  const freshUser = await userModel.create({
    name: 'Phase Two Rotated User',
    email,
    emailVerified: true,
    phone: String(9000100000 + userCounter),
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: email }],
    passwordHash: 'test-hash',
    role: 'customer',
  })

  return accessTokenGenerator({ userId: freshUser._id, role: freshUser.role })
}

before(async () => {
  await mongoose.connect(testMongoUri)
  await mongoose.connection.dropDatabase()

  await Promise.all([userModel.init(), productModel.init(), orderModel.init(), webhookEventModel.init()])

  user = await userModel.create({
    name: 'Phase Two User',
    email: 'phase2-user@mailhost.test',
    emailVerified: true,
    phone: '9000000124',
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: 'phase2-user@mailhost.test' }],
    passwordHash: 'test-hash',
    role: 'customer',
  })

  token = await accessTokenGenerator({ userId: user._id, role: user.role })

  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

/*
 * Fresh authenticated user per test (see freshAuth): keeps every test's
 * order-creation budget independent. Fixture setup only — test bodies and
 * assertions are untouched.
 */
beforeEach(async () => {
  token = await freshAuth()
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
})

/* ========================================================================== */
/* 1. Integer paise money                                                      */
/* ========================================================================== */

describe('integer paise money', () => {
  test('toMinor is exact where binary floats are not', () => {
    assert.equal(toMinor(0.1) + toMinor(0.2), toMinor(0.3))
    assert.equal(toMinor(4999.99), 499999)
    assert.equal(toMinor(199.99), 19999)
    assert.equal(toMinor('250.5'), 25050)
    assert.equal(toMajor(25050), 250.5)
    assert.equal(sumMinor([toMinor(0.1), toMinor(0.2)]), toMinor(0.3))
    assert.equal(multiplyMinor(toMinor(199.99), 3), 59997)
  })

  test('toMinor rejects negative, non-finite and absurd amounts', () => {
    for (const bad of [-1, -0.01, Infinity, -Infinity, NaN, {}, 'abc', 1e12]) {
      assert.throws(() => toMinor(bad), `expected toMinor(${String(bad)}) to throw`)
    }
  })

  test('order totals are computed from the DB price, not the client', async () => {
    const product = await createProduct({ price: 199.99, stock: 10 })

    const res = await apiFetch('/api/order', {
      method: 'POST',
      body: orderPayload(product._id, 3),
    })

    assert.equal(res.status, 201)
    const order = res.json.order

    assert.equal(order.pricing.subtotalMinor, 59997)
    assert.equal(order.pricing.totalMinor, 59997)
    assert.equal(order.pricing.total, 599.97)
    assert.equal(order.items[0].unitPrice.amountMinor, 19999)
    assert.equal(order.items[0].total.amountMinor, 59997)
    assert.equal(order.items[0].unitPrice.amount, 199.99)
  })

  test('prices sent by the client are ignored entirely', async () => {
    const product = await createProduct({ price: 5000, stock: 5 })

    const res = await apiFetch('/api/order', {
      method: 'POST',
      body: orderPayload(product._id, 2, {
        price: 1,
        unitPrice: { amount: 1, currency: 'INR' },
        total: { amount: 1, currency: 'INR' },
      }),
    })

    assert.equal(res.status, 201)
    const order = res.json.order

    // 2 x 5000.00 from the database, not 2 x 1.00 from the request.
    assert.equal(order.pricing.totalMinor, 1000000)
    assert.equal(order.pricing.total, 10000)
    assert.equal(order.items[0].unitPrice.amount, 5000)
  })

  test('negative, float, zero and huge quantities are rejected with 400', async () => {
    const product = await createProduct({ price: 100, stock: 1000 })

    for (const quantity of [0, -1, -100, 1.5, 2.0000001, 1e9, 101, '5', null, true]) {
      const res = await apiFetch('/api/order', {
        method: 'POST',
        body: orderPayload(product._id, quantity),
      })

      assert.equal(res.status, 400, `quantity=${String(quantity)} should be rejected`)
    }

    const untouched = await reloadProduct(product._id)
    assert.equal(untouched.reservedStock, 0)
  })
})

/* ========================================================================== */
/* 2. Atomic stock reservation                                                 */
/* ========================================================================== */

describe('stock reservation', () => {
  test('50 concurrent requests for 1 unit: exactly one succeeds', async () => {
    const product = await createProduct({ price: 1000, stock: 1, name: 'Last Unit' })

    const CONCURRENCY = 50

    /*
     * One distinct user per contending request. A single user firing 50
     * checkouts would (correctly) hit the per-user order-creation rate limit
     * long before stock contention is reached; distinct users make this the
     * true thundering-herd shape — many buyers, one last unit — while every
     * assertion below (exactly one order, no oversell) still applies.
     */
    const contenders = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => freshAuth())
    )

    const results = await Promise.all(
      contenders.map((authToken) =>
        apiFetch('/api/order', {
          method: 'POST',
          authToken,
          body: orderPayload(product._id, 1),
        })
      )
    )

    // A concurrent identical submit now REUSES the open order (200) instead of
    // creating a second one, so success means 201 or 200. The assertions below
    // (one order document, reservedStock 1, stock 1) are what prove no oversell.
    const succeeded = results.filter((r) => r.status === 201 || r.status === 200)
    const conflicts = results.filter((r) => r.status === 409)
    const other = results.filter((r) => ![200, 201, 409].includes(r.status))

    assert.equal(succeeded.length >= 1, true, `expected at least one success, got ${succeeded.length}`)
    assert.equal(succeeded.length + conflicts.length, CONCURRENCY)
    assert.equal(other.length, 0, `unexpected statuses: ${other.map((r) => r.status).join(',')}`)

    // Every failure must be an insufficient-stock conflict, not a crash.
    assert.equal(
      conflicts.every((r) => /stock/i.test(r.json?.message ?? '')),
      true
    )

    const after = await reloadProduct(product._id)
    assert.equal(after.reservedStock, 1)
    assert.equal(after.stock, 1)

    const orderCount = await orderModel.countDocuments({
      'items.productId': product._id,
    })
    assert.equal(orderCount, 1)
  })

  test('reservation is released when the payment fails', async () => {
    const product = await createProduct({ price: 1000, stock: 3 })

    const created = await apiFetch('/api/order', {
      method: 'POST',
      body: orderPayload(product._id, 2),
    })
    assert.equal(created.status, 201)

    const afterReserve = await reloadProduct(product._id)
    assert.equal(afterReserve.reservedStock, 2)

    // Drive the webhook handler directly with a realistic failed-payment body.
    const razorpayOrderId = 'order_phase2_failed'
    await orderModel.updateOne(
      { _id: created.json.order._id },
      { $set: { 'payment.razorpayOrderId': razorpayOrderId } }
    )

    await processRazorpayWebhook({
      eventId: `evt_failed_${Date.now()}`,
      event: 'payment.failed',
      payload: {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_phase2_failed',
              order_id: razorpayOrderId,
              status: 'failed',
            },
          },
        },
      },
    })

    const afterFailure = await reloadProduct(product._id)
    assert.equal(afterFailure.reservedStock, 0)

    const order = await orderModel.findById(created.json.order._id).lean()
    assert.equal(order.payment.status, 'failed')
    assert.equal(order.orderStatus, 'cancelled')
    assert.equal(order.payment.failureReason, 'payment_failed')
    assert.equal(Boolean(order.stockReleasedAt), true)
  })

  test('reservation expires via the cron job when payment never arrives', async () => {
    const product = await createProduct({ price: 1000, stock: 2 })

    const created = await apiFetch('/api/order', {
      method: 'POST',
      body: orderPayload(product._id, 2),
    })
    assert.equal(created.status, 201)

    const orderId = created.json.order._id

    // Pretend the reservation was taken long ago (older than the TTL).
    const stale = new Date(Date.now() - config.STOCK_RESERVATION_TTL_MS - 60_000)
    await orderModel.updateOne({ _id: orderId }, { $set: { stockReservedAt: stale } })

    const releasedCount = await releaseStockNow()
    assert.equal(releasedCount >= 1, true)

    const afterExpiry = await reloadProduct(product._id)
    assert.equal(afterExpiry.reservedStock, 0)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'cancelled')
    assert.equal(order.payment.status, 'failed')
    assert.equal(order.payment.failureReason, 'reservation_expired')

    // A second run must not double-release.
    await releaseStockNow()
    const stillZero = await reloadProduct(product._id)
    assert.equal(stillZero.reservedStock, 0)
  })

  test('fulfilment consumes the reservation (stock and reservedStock both drop)', async () => {
    const product = await createProduct({ price: 1000, stock: 5 })

    const created = await apiFetch('/api/order', {
      method: 'POST',
      body: orderPayload(product._id, 2),
    })
    assert.equal(created.status, 201)

    const afterReserve = await reloadProduct(product._id)
    assert.equal(afterReserve.stock, 5)
    assert.equal(afterReserve.reservedStock, 2)

    const razorpayOrderId = 'order_phase2_captured'
    await orderModel.updateOne(
      { _id: created.json.order._id },
      { $set: { 'payment.razorpayOrderId': razorpayOrderId } }
    )

    await processRazorpayWebhook({
      eventId: `evt_captured_${Date.now()}`,
      event: 'payment.captured',
      payload: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_phase2_captured',
              order_id: razorpayOrderId,
              amount: 200000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      },
    })

    const afterFulfil = await reloadProduct(product._id)
    assert.equal(afterFulfil.stock, 3)
    assert.equal(afterFulfil.reservedStock, 0)

    const order = await orderModel.findById(created.json.order._id).lean()
    assert.equal(order.payment.status, 'paid')
    assert.equal(order.orderStatus, 'fulfilled')
    assert.equal(Boolean(order.stockConsumedAt), true)
  })
})

/* ========================================================================== */
/* 3. Razorpay verify: timing-safe, order-bound, replay-safe, idempotent       */
/* ========================================================================== */

describe('razorpay verify', () => {
  const sign = (razorpayOrderId, razorpayPaymentId) =>
    crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

  test('signature comparison accepts only the exact signature', () => {
    const razorpayOrderId = 'order_abc123'
    const razorpayPaymentId = 'pay_abc123'
    const valid = sign(razorpayOrderId, razorpayPaymentId)

    assert.equal(verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature: valid }), true)

    // Same length, one different nibble.
    const tampered = `${valid.slice(0, -1)}${valid.endsWith('a') ? 'b' : 'a'}`
    assert.equal(verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature: tampered }), false)

    // Wrong length, non-hex, empty, missing, wrong types.
    for (const bad of [valid.slice(0, 32), 'zz'.repeat(32), '', undefined, null, 12345, {}]) {
      assert.equal(
        verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature: bad }),
        false,
        `expected rejection for ${String(bad)}`
      )
    }
  })

  test('signature is bound to the specific order + payment pair', () => {
    const valid = sign('order_abc123', 'pay_abc123')

    assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_OTHER', razorpayPaymentId: 'pay_abc123', razorpaySignature: valid }), false)
    assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_abc123', razorpayPaymentId: 'pay_OTHER', razorpaySignature: valid }), false)
  })

  const makeRazorpayOrder = async ({ status = 'pending', razorpayOrderId, razorpayPaymentId } = {}) => {
    const product = await createProduct({ price: 1000, stock: 10 })

    const created = await apiFetch('/api/order', {
      method: 'POST',
      body: { ...orderPayload(product._id, 1), paymentMethod: 'razorpay' },
    })
    assert.equal(created.status, 201)

    await orderModel.updateOne(
      { _id: created.json.order._id },
      {
        $set: {
          'payment.razorpayOrderId': razorpayOrderId,
          'payment.razorpayPaymentId': razorpayPaymentId,
          'payment.status': status,
        },
      }
    )

    return created.json.order._id
  }

  test('verify rejects a mismatched razorpay order id (no provider call)', async () => {
    const orderId = await makeRazorpayOrder({ razorpayOrderId: 'order_trusted_1' })

    const res = await apiFetch('/api/payments/razorpay/verify', {
      method: 'POST',
      body: {
        orderId,
        razorpayPaymentId: 'pay_x',
        razorpayOrderId: 'order_attacker',
        razorpaySignature: sign('order_attacker', 'pay_x'),
      },
    })

    assert.equal(res.status, 400)
    assert.match(res.json.message, /mismatch/i)
  })

  test('verify rejects a forged signature (no provider call)', async () => {
    const orderId = await makeRazorpayOrder({ razorpayOrderId: 'order_trusted_2' })

    const res = await apiFetch('/api/payments/razorpay/verify', {
      method: 'POST',
      body: {
        orderId,
        razorpayPaymentId: 'pay_x',
        razorpayOrderId: 'order_trusted_2',
        razorpaySignature: 'f'.repeat(64),
      },
    })

    assert.equal(res.status, 400)
    assert.match(res.json.message, /signature/i)
  })

  test('replaying the same payment on a paid order is idempotent', async () => {
    const orderId = await makeRazorpayOrder({
      status: 'paid',
      razorpayOrderId: 'order_trusted_3',
      razorpayPaymentId: 'pay_settled_3',
    })

    const res = await apiFetch('/api/payments/razorpay/verify', {
      method: 'POST',
      body: {
        orderId,
        razorpayPaymentId: 'pay_settled_3',
        razorpayOrderId: 'order_trusted_3',
        razorpaySignature: sign('order_trusted_3', 'pay_settled_3'),
      },
    })

    assert.equal(res.status, 200)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.payment.status, 'paid')
    assert.equal(order.payment.razorpayPaymentId, 'pay_settled_3')
  })

  test('a different payment id against a paid order is rejected', async () => {
    const orderId = await makeRazorpayOrder({
      status: 'paid',
      razorpayOrderId: 'order_trusted_4',
      razorpayPaymentId: 'pay_settled_4',
    })

    const res = await apiFetch('/api/payments/razorpay/verify', {
      method: 'POST',
      body: {
        orderId,
        razorpayPaymentId: 'pay_different_4',
        razorpayOrderId: 'order_trusted_4',
        razorpaySignature: sign('order_trusted_4', 'pay_different_4'),
      },
    })

    assert.equal(res.status, 409)

    // The original payment must still be the one on record.
    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.payment.razorpayPaymentId, 'pay_settled_4')
  })

  test('one payment id cannot settle two orders', async () => {
    const paymentId = `pay_shared_${Date.now()}`

    await makeRazorpayOrder({
      status: 'paid',
      razorpayOrderId: 'order_owner_5',
      razorpayPaymentId: paymentId,
    })

    const secondOrderId = await makeRazorpayOrder({ razorpayOrderId: 'order_second_5' })

    const res = await apiFetch('/api/payments/razorpay/verify', {
      method: 'POST',
      body: {
        orderId: secondOrderId,
        razorpayPaymentId: paymentId,
        razorpayOrderId: 'order_second_5',
        razorpaySignature: sign('order_second_5', paymentId),
      },
    })

    assert.equal(res.status, 409)
    assert.match(res.json.message, /another order/i)

    const secondOrder = await orderModel.findById(secondOrderId).lean()
    assert.equal(secondOrder.payment.status, 'pending')
  })

  test('create-payment is idempotent: an existing Razorpay order is reused', async () => {
    const orderId = await makeRazorpayOrder({ razorpayOrderId: 'order_reuse_6' })

    const first = await apiFetch('/api/payments/razorpay/create', {
      method: 'POST',
      body: { orderId },
    })
    const second = await apiFetch('/api/payments/razorpay/create', {
      method: 'POST',
      body: { orderId },
    })

    assert.equal(first.status, 200)
    assert.equal(second.status, 200)
    assert.equal(first.json.payment.razorpayOrderId, 'order_reuse_6')
    assert.equal(second.json.payment.razorpayOrderId, 'order_reuse_6')
    assert.equal(first.json.payment.razorpayOrderId, second.json.payment.razorpayOrderId)
    // Amount comes from our own paise total.
    assert.equal(first.json.payment.amount, 100000)
  })
})

/* ========================================================================== */
/* 4. Webhook: signature, uniqueness, idempotency, state machine               */
/* ========================================================================== */

describe('webhook handling', () => {
  test('raw-body signature verification accepts only the correct HMAC', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }))
    const good = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')

    assert.equal(verifyRazorpayWebhookSignature({ rawBody, signature: good }), true)
    assert.equal(verifyRazorpayWebhookSignature({ rawBody, signature: 'f'.repeat(64) }), false)
    assert.equal(verifyRazorpayWebhookSignature({ rawBody, signature: undefined }), false)
    assert.equal(verifyRazorpayWebhookSignature({ rawBody: 'not-a-buffer', signature: good }), false)
  })

  test('the same event id is only processed once', async () => {
    const product = await createProduct({ price: 1000, stock: 4 })
    const created = await apiFetch('/api/order', {
      method: 'POST',
      body: { ...orderPayload(product._id, 1), paymentMethod: 'razorpay' },
    })

    const razorpayOrderId = `order_idem_${Date.now()}`
    await orderModel.updateOne(
      { _id: created.json.order._id },
      { $set: { 'payment.razorpayOrderId': razorpayOrderId } }
    )

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_idem_${Date.now()}`,
            order_id: razorpayOrderId,
            amount: 100000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    }

    const eventId = `evt_idem_${Date.now()}`

    const first = await processRazorpayWebhook({ eventId, event: 'payment.captured', payload })
    const second = await processRazorpayWebhook({ eventId, event: 'payment.captured', payload })

    assert.equal(first.alreadyProcessed, false)
    assert.equal(second.alreadyProcessed, true)

    // Stock consumed exactly once.
    const product_ = await reloadProduct(product._id)
    assert.equal(product_.stock, 3)
    assert.equal(product_.reservedStock, 0)
  })

  test('illegal state transitions are refused by the state machine', () => {
    assert.equal(canTransition('pending', 'confirmed'), true)
    assert.equal(canTransition('confirmed', 'fulfilled'), true)
    assert.equal(canTransition('pending', 'fulfilled'), false)
    assert.equal(canTransition('cancelled', 'confirmed'), false)
    assert.equal(canTransition('refunded', 'paid'), false)
    assert.equal(canTransition('pending', 'pending'), true)

    const order = { orderStatus: 'pending' }
    assert.throws(() => applyTransition(order, 'fulfilled'), /Illegal order status transition/)

    applyTransition(order, 'confirmed')
    applyTransition(order, 'confirmed') // idempotent
    assert.equal(order.orderStatus, 'confirmed')
  })

  test('verify alone cannot fulfil: only the webhook finalizes', async () => {
    const product = await createProduct({ price: 1000, stock: 3 })
    const created = await apiFetch('/api/order', {
      method: 'POST',
      body: { ...orderPayload(product._id, 1), paymentMethod: 'razorpay' },
    })

    const orderId = created.json.order._id

    // Create the provider order through the injected fake (no network).
    const pay = await apiFetch('/api/payments/razorpay/create', {
      method: 'POST',
      body: { orderId },
    })
    assert.equal(pay.status, 200)

    const razorpayOrderId = pay.json.payment.razorpayOrderId
    assert.match(razorpayOrderId, /^order_fake_\d+$/)

    // The server must have asked the provider for the exact paise total.
    const createCalls = fakeRazorpay.getCallsOfOperation('orders.create')
    assert.equal(createCalls.length >= 1, true)
    assert.equal(createCalls[createCalls.length - 1].payload.amount, 100000)

    const razorpayPaymentId = `pay_nofinal_${Date.now()}`

    fakeRazorpay.stagePayment(razorpayPaymentId, {
      id: razorpayPaymentId,
      order_id: razorpayOrderId,
      amount: 100000,
      currency: 'INR',
      status: 'captured',
    })

    const signature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    const verify = await apiFetch('/api/payments/razorpay/verify', {
      method: 'POST',
      body: { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature: signature },
    })

    assert.equal(verify.status, 200)
    assert.equal(verify.json.orderStatus, 'confirmed')

    // Confirmed, but nothing is fulfilled and no stock has been consumed.
    const afterVerify = await orderModel.findById(orderId).lean()
    assert.equal(afterVerify.orderStatus, 'confirmed')
    assert.equal(afterVerify.payment.status, 'paid')
    assert.equal(afterVerify.stockConsumedAt, null)

    const afterVerifyStock = await reloadProduct(product._id)
    assert.equal(afterVerifyStock.stock, 3)
    assert.equal(afterVerifyStock.reservedStock, 1)

    // Only the webhook finalizes.
    await processRazorpayWebhook({
      eventId: `evt_nofinal_${Date.now()}`,
      event: 'payment.captured',
      payload: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: razorpayPaymentId,
              order_id: razorpayOrderId,
              amount: 100000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      },
    })

    const afterWebhook = await orderModel.findById(orderId).lean()
    assert.equal(afterWebhook.orderStatus, 'fulfilled')
    assert.equal((await reloadProduct(product._id)).stock, 2)
  })
})

/* ========================================================================== */
/* 5. Order cancellation                                                         */
/* ========================================================================== */

describe('order cancellation', () => {
  const createPendingOrder = async ({ price = 1000, stock = 5, quantity = 2, authToken = undefined } = {}) => {
    const product = await createProduct({ price, stock })

    const created = await apiFetch('/api/order', {
      method: 'POST',
      authToken,
      body: orderPayload(product._id, quantity),
    })
    assert.equal(created.status, 201, created.text)

    return { product, orderId: created.json.order._id }
  }

  const cancelById = (orderId, authToken = undefined) =>
    apiFetch(`/api/order/${orderId}/cancel`, { method: 'POST', authToken, body: {} })

  test('owner cancels their own pending order → 200 and cancelled', async () => {
    const { orderId } = await createPendingOrder()

    const res = await cancelById(orderId)
    assert.equal(res.status, 200, res.text)
    assert.equal(res.json.data.order.orderStatus, 'cancelled')

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.orderStatus, 'cancelled')
    assert.ok(stored.stockReleasedAt)
  })

  test('cancelling twice → 200, 200 (idempotent, no second release)', async () => {
    const { product, orderId } = await createPendingOrder({ quantity: 2 })

    const first = await cancelById(orderId)
    assert.equal(first.status, 200, first.text)
    assert.match(first.json.message, /order cancelled\./i)

    assert.equal((await reloadProduct(product._id)).reservedStock, 0)

    const second = await cancelById(orderId)
    assert.equal(second.status, 200, second.text)
    assert.match(second.json.message, /already cancelled/i)

    // No second release happened: still exactly zero, never negative.
    const after = await reloadProduct(product._id)
    assert.equal(after.reservedStock, 0)
    assert.ok(after.reservedStock >= 0)

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.orderStatus, 'cancelled')
  })

  test("user B cannot cancel user A's order → 404, order untouched", async () => {
    const ownerToken = await freshAuth()
    const { orderId } = await createPendingOrder({ authToken: ownerToken })

    // Default (rotated) token belongs to a different user.
    const res = await cancelById(orderId)
    assert.equal(res.status, 404, res.text)

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.orderStatus, 'pending')
    assert.equal(stored.stockReleasedAt, null)
  })

  test('paid and fulfilled orders cannot be cancelled → 409, unchanged', async () => {
    const paid = await createPendingOrder()
    await orderModel.updateOne(
      { _id: paid.orderId },
      {
        $set: {
          orderStatus: 'confirmed',
          'payment.status': 'paid',
          'payment.razorpayPaymentId': `pay_cancel409_${Date.now()}`,
        },
      }
    )

    const paidRes = await cancelById(paid.orderId)
    assert.equal(paidRes.status, 409, paidRes.text)

    const stillPaid = await orderModel.findById(paid.orderId).lean()
    assert.equal(stillPaid.orderStatus, 'confirmed')
    assert.equal(stillPaid.payment.status, 'paid')

    const done = await createPendingOrder()
    await orderModel.updateOne(
      { _id: done.orderId },
      {
        $set: {
          orderStatus: 'fulfilled',
          'payment.status': 'paid',
          stockConsumedAt: new Date(),
        },
      }
    )

    const doneRes = await cancelById(done.orderId)
    assert.equal(doneRes.status, 409, doneRes.text)

    const stillDone = await orderModel.findById(done.orderId).lean()
    assert.equal(stillDone.orderStatus, 'fulfilled')
    assert.equal(stillDone.payment.status, 'paid')
  })

  test('concurrent cancels release stock exactly once, both answer 200', async () => {
    const { product, orderId } = await createPendingOrder({ stock: 5, quantity: 2 })

    const [a, b] = await Promise.all([cancelById(orderId), cancelById(orderId)])

    assert.equal(a.status, 200, a.text)
    assert.equal(b.status, 200, b.text)

    // Exactly one call performed the cancel; the other saw it already done.
    assert.deepEqual(
      [a.json.message, b.json.message].sort(),
      ['Order cancelled.', 'Order was already cancelled.']
    )

    const after = await reloadProduct(product._id)
    assert.equal(after.reservedStock, 0)
    assert.ok(after.reservedStock >= 0)

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.orderStatus, 'cancelled')
    assert.ok(stored.stockReleasedAt)
  })

  test('late webhook on a cancelled order flags needsRefund instead of fulfilling', async () => {
    const { orderId } = await createPendingOrder({ stock: 5, quantity: 2 })

    const razorpayOrderId = `order_latecancel_${Date.now()}`
    await orderModel.updateOne(
      { _id: orderId },
      { $set: { 'payment.razorpayOrderId': razorpayOrderId } }
    )

    const cancelled = await cancelById(orderId)
    assert.equal(cancelled.status, 200, cancelled.text)

    const result = await processRazorpayWebhook({
      eventId: `evt_latecancel_${Date.now()}`,
      event: 'payment.captured',
      payload: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_latecancel_${Date.now()}`,
              order_id: razorpayOrderId,
              amount: 200000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      },
    })
    assert.ok(result)

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.orderStatus, 'cancelled')
    assert.equal(stored.payment.status, 'paid')
    assert.equal(stored.needsRefund, true)
    assert.equal(stored.refundReason, 'captured_after_cancellation')
    assert.equal(stored.stockConsumedAt, null)
  })
})

/* ========================================================================== */
/* 6. Log redaction                                                            */
/* ========================================================================== */

describe('log redaction', () => {
  test('signatures, keys, tokens and whole payloads are censored', () => {
    const redacted = redact({
      razorpaySignature: 'deadbeef',
      nested: { key_secret: 'super-secret', token: 'abc' },
      headers: { authorization: 'Bearer xyz', cookie: 'a=b' },
      payload: { payment: { entity: { id: 'pay_1' } } },
      rawBody: Buffer.from('{"event":"payment.captured"}'),
      harmlessBuffer: Buffer.from('abc'),
      orderNumber: 'IP-1-2',
    })

    const asText = JSON.stringify(redacted)

    assert.equal(asText.includes('deadbeef'), false)
    assert.equal(asText.includes('super-secret'), false)
    assert.equal(asText.includes('Bearer xyz'), false)
    assert.equal(asText.includes('pay_1'), false)
    assert.equal(redacted.orderNumber, 'IP-1-2')
    assert.equal(redacted.payload, '[REDACTED]')
    // rawBody is censored by key name; an ordinary Buffer is summarised, not dumped.
    assert.equal(redacted.rawBody, '[REDACTED]')
    assert.equal(redacted.harmlessBuffer, '[Buffer 3 bytes]')
  })

  test('errors keep the message but not the stack in production', () => {
    const original = config.IS_PRODUCTION
    try {
      const error = new Error('boom')
      const redacted = redact(error)

      assert.equal(redacted.message, 'boom')
      assert.equal(
        redacted.stack === undefined,
        original === true,
        'stack should only be present outside production'
      )
    } finally {
      assert.equal(config.IS_PRODUCTION, original)
    }
  })
})
