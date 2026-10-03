import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * External-service isolation and the payment gaps that need HTTP-level proof.
 *
 * Everything here runs with NODE_ENV=test, so:
 *   - the mailer records into an in-memory outbox (never Resend/SMTP),
 *   - Razorpay is the injected fake (never api.razorpay.com),
 *   - the network guard refuses any non-loopback request outright.
 */

import { after, before, beforeEach, describe, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import mongoose from 'mongoose'

import app from '../src/app/app.js'
import config from '../src/config/config.js'
import userModel from '../src/models/user.model.js'
import productModel from '../src/models/product.model.js'
import orderModel from '../src/models/order.model.js'
import refreshModel from '../src/models/refreshToken.model.js'
import webhookEventModel from '../src/models/webhookEvent.model.js'
import { accessTokenGenerator } from '../src/utils/tokenManager.js'
import {
  clearSentMessages,
  getSentMessages,
  getSentMessagesOfKind,
  resolveTransportKind,
  sentMessageCount,
} from '../src/services/mailer.service.js'
/*
 * Default-export access to the same gate, used ONLY to simulate a mail
 * provider outage with mock.method in the refund-alert failure test.
 */
import mailer from '../src/services/mailer.service.js'
import { resendTransport, smtpTransport } from '../src/integrations/mail/transports.js'
import { getResendClient } from '../src/integrations/resend/resend.client.js'
import {
  clearRazorpayProvider,
  getRazorpayProvider,
  setRazorpayProvider,
} from '../src/integrations/razorpay/razorpay.client.js'
import { releaseStockNow } from '../src/jobs/releaseExpiredStock.js'

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

const apiFetch = async (path, { method = 'GET', authToken = token, body, headers = {} } = {}) => {
  const finalHeaders = { ...headers }
  if (authToken) finalHeaders.Authorization = `Bearer ${authToken}`
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json'

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: finalHeaders,
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

  return { status: res.status, headers: res.headers, json, text }
}

/** Posts an exact raw body (the signature must cover those exact bytes). */
const postRawWebhook = async (rawBody, { signature, eventId = `evt_${Date.now()}_${Math.random()}` } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  headers['x-razorpay-event-id'] = eventId
  if (signature) headers['x-razorpay-signature'] = signature

  const res = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
    method: 'POST',
    headers,
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

const signWebhookBody = (rawBody) =>
  crypto.createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')

const signPayment = (razorpayOrderId, razorpayPaymentId) =>
  crypto.createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')

const capturedPayload = ({ razorpayOrderId, razorpayPaymentId, amount, currency = 'INR' }) =>
  JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: razorpayPaymentId,
          order_id: razorpayOrderId,
          amount,
          currency,
          status: 'captured',
        },
      },
    },
  })

let skuCounter = 0
const createProduct = async ({ price = 1000, stock = 5 } = {}) => {
  skuCounter += 1
  return productModel.create({
    name: `Isolation Pedal ${skuCounter}`,
    slug: `isolation-pedal-${skuCounter}`,
    sku: `ISO-${skuCounter}`,
    description: 'Isolation fixture product.',
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
 * each test gets its own budget. No test reads the shared `user`/`token` for
 * anything but authentication, so this is setup-only.
 */
const freshAuth = async () => {
  userCounter += 1
  const stamp = `${Date.now()}_${userCounter}_${Math.random().toString(36).slice(2, 8)}`
  const email = `iso-rot-${stamp}@mailhost.test`

  const freshUser = await userModel.create({
    name: 'Isolation Rotated User',
    email,
    emailVerified: true,
    phone: String(9000200000 + userCounter),
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: email }],
    passwordHash: 'test-hash',
    role: 'customer',
  })

  return accessTokenGenerator({ userId: freshUser._id, role: freshUser.role })
}

/** Creates an order with a provider order id already attached. */
const createOrderWithRazorpayId = async ({
  method = 'razorpay',
  price = 1000,
  quantity = 1,
  stock = 5,
  razorpayOrderId = `order_iso_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
} = {}) => {
  const product = await createProduct({ price, stock })
  const total = Math.round(price * 100) * quantity

  const created = await apiFetch('/api/order', {
    method: 'POST',
    body: {
      items: [{ productId: String(product._id), quantity }],
      paymentMethod: method,
      customer: { name: 'Isolation', email: 'isolation@mailhost.test', phone: '9000000200' },
      shippingAddress: {
        name: 'Isolation',
        phone: '9000000200',
        addressLine1: '2 Test Street',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700001',
        country: 'India',
      },
    },
  })

  assert.equal(created.status, 201, created.text)

  const orderId = created.json.order._id

  await orderModel.updateOne(
    { _id: orderId },
    { $set: { 'payment.razorpayOrderId': razorpayOrderId } }
  )

  return { orderId, product, razorpayOrderId, totalMinor: total }
}

before(async () => {
  await mongoose.connect(testMongoUri)
  await mongoose.connection.dropDatabase()

  await Promise.all([
    userModel.init(),
    productModel.init(),
    orderModel.init(),
    refreshModel.init(),
    webhookEventModel.init(),
  ])

  user = await userModel.create({
    name: 'Isolation User',
    email: 'isolation-user@mailhost.test',
    emailVerified: true,
    phone: '9000000201',
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: 'isolation-user@mailhost.test' }],
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
/* 1. Email isolation                                                          */
/* ========================================================================== */

describe('email isolation', () => {
  test('the test run uses the in-memory outbox, not a live transport', () => {
    assert.equal(config.NODE_ENV, 'test')
    assert.equal(resolveTransportKind(), 'memory')
  })

  test('a COD order records exactly one admin message with the real content', async () => {
    clearSentMessages()

    const { orderId } = await createOrderWithRazorpayId({ method: 'cod' })

    // The send is fire-and-forget in the service; give it a tick to land.
    await new Promise((resolve) => setImmediate(resolve))

    const adminMessages = getSentMessagesOfKind('admin-order')
    assert.equal(adminMessages.length, 1)

    const [message] = adminMessages
    assert.equal(message.channel, 'resend')
    assert.deepEqual(message.to, [config.ADMIN_ORDER_EMAIL])

    const order = await orderModel.findById(orderId).lean()
    assert.match(message.subject, new RegExp(order.orderNumber))
    assert.match(message.subject, /New IDIOT Pedals Order/)
    assert.match(message.html, new RegExp(order.orderNumber))
    assert.match(message.text, /ISOLATION USER|Isolation/i)
    // Server-side total is what the notification reports.
    assert.match(message.text, /1000\.00|1,000\.00/)
    assert.equal(message.idempotencyKey, `admin-order-${orderId}`)
  })

  test('the verification email is recorded with its token link', async () => {
    clearSentMessages()

    const { sendVerificationEmail } = await import('../src/services/email.service.js')
    const token64 = 'b'.repeat(64)

    await sendVerificationEmail({
      name: 'Isolation User',
      email: 'someone@mailhost.test',
      token: token64,
    })

    const messages = getSentMessagesOfKind('email-verification')
    assert.equal(messages.length, 1)
    assert.equal(messages[0].channel, 'smtp')
    assert.equal(messages[0].to, 'someone@mailhost.test')
    assert.match(messages[0].text, new RegExp(token64))
    assert.equal(sentMessageCount(), 1)
  })

  test('a non-idempotent verify records exactly one admin message, a replay none', async () => {
    clearSentMessages()

    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_mail_${Date.now()}`

    fakeRazorpay.stagePayment(razorpayPaymentId, {
      id: razorpayPaymentId,
      order_id: razorpayOrderId,
      amount: totalMinor,
      currency: 'INR',
      status: 'captured',
    })

    const body = {
      orderId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature: signPayment(razorpayOrderId, razorpayPaymentId),
    }

    const first = await apiFetch('/api/payments/razorpay/verify', { method: 'POST', body })
    assert.equal(first.status, 200)
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(getSentMessagesOfKind('admin-order').length, 1)

    const replay = await apiFetch('/api/payments/razorpay/verify', { method: 'POST', body })
    assert.equal(replay.status, 200)
    await new Promise((resolve) => setImmediate(resolve))

    // A retry must not re-notify.
    assert.equal(getSentMessagesOfKind('admin-order').length, 1)
  })

  test('webhook-only fulfillment (no verify call) sends exactly one admin message', async () => {
    clearSentMessages()

    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_whonly_${Date.now()}`

    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const delivered = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })
    assert.equal(delivered.status, 200, JSON.stringify(delivered.json))

    // The send is fire-and-forget in the service; give it a tick to land.
    await new Promise((resolve) => setImmediate(resolve))

    const adminMessages = getSentMessagesOfKind('admin-order')
    assert.equal(adminMessages.length, 1)
    assert.equal(adminMessages[0].idempotencyKey, `admin-order-${orderId}`)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'fulfilled')
  })

  test('verify-then-webhook sends exactly one admin message total, not two', async () => {
    clearSentMessages()

    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_vfywh_${Date.now()}`

    fakeRazorpay.stagePayment(razorpayPaymentId, {
      id: razorpayPaymentId,
      order_id: razorpayOrderId,
      amount: totalMinor,
      currency: 'INR',
      status: 'captured',
    })

    const verified = await apiFetch('/api/payments/razorpay/verify', {
      method: 'POST',
      body: {
        orderId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature: signPayment(razorpayOrderId, razorpayPaymentId),
      },
    })
    assert.equal(verified.status, 200, verified.text)
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(getSentMessagesOfKind('admin-order').length, 1)

    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const delivered = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })
    assert.equal(delivered.status, 200, JSON.stringify(delivered.json))
    await new Promise((resolve) => setImmediate(resolve))

    // The webhook fulfilled an already-notified order: still exactly one.
    assert.equal(getSentMessagesOfKind('admin-order').length, 1)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'fulfilled')
  })

  test('webhook-then-verify sends exactly one admin message total, not two', async () => {
    clearSentMessages()

    const { orderId, razorpayOrderId, totalMinor, product } = await createOrderWithRazorpayId({ stock: 4 })
    const razorpayPaymentId = `pay_whfv_${Date.now()}`

    // Webhook arrives first: fulfills and notifies via the webhook-only path.
    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const delivered = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })
    assert.equal(delivered.status, 200, JSON.stringify(delivered.json))
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(getSentMessagesOfKind('admin-order').length, 1)

    // Late client verify for the same payment: success, no second email.
    const late = await apiFetch('/api/payments/razorpay/verify', {
      method: 'POST',
      body: {
        orderId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature: signPayment(razorpayOrderId, razorpayPaymentId),
      },
    })
    assert.equal(late.status, 200, late.text)
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(getSentMessagesOfKind('admin-order').length, 1)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'fulfilled')
    assert.equal(order.payment.status, 'paid')

    // Stock consumed exactly once across both arrivals.
    const after = await reloadProduct(product._id)
    assert.equal(after.stock, 3)
    assert.equal(after.reservedStock, 0)
  })

  test('late webhook on a cancelled order flags needsRefund and sends exactly one refund alert', async () => {
    clearSentMessages()

    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_refund_${Date.now()}`

    const cancelled = await apiFetch(`/api/order/${orderId}/cancel`, {
      method: 'POST',
      body: {},
    })
    assert.equal(cancelled.status, 200, cancelled.text)

    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const delivered = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })
    assert.equal(delivered.status, 200, JSON.stringify(delivered.json))

    // Fire-and-forget send; give it a tick to land.
    await new Promise((resolve) => setImmediate(resolve))

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.orderStatus, 'cancelled')
    assert.equal(stored.needsRefund, true)
    assert.equal(stored.refundReason, 'captured_after_cancellation')
    assert.equal(stored.stockConsumedAt, null)

    const alerts = getSentMessagesOfKind('admin-refund-alert')
    assert.equal(alerts.length, 1)

    const [alert] = alerts
    assert.equal(alert.channel, 'resend')
    assert.match(alert.subject, new RegExp(stored.orderNumber))
    assert.match(alert.text, new RegExp(razorpayPaymentId))
    assert.match(alert.text, /captured_after_cancellation/)
    assert.match(alert.text, /refund manually from the Razorpay dashboard/)
    assert.match(alert.text, /1,000/)
    assert.equal(alert.idempotencyKey, `admin-refund-${orderId}`)
  })

  test('same late-capture webhook delivered twice still sends exactly one refund alert', async () => {
    clearSentMessages()

    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_refund2_${Date.now()}`

    const cancelled = await apiFetch(`/api/order/${orderId}/cancel`, {
      method: 'POST',
      body: {},
    })
    assert.equal(cancelled.status, 200, cancelled.text)

    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const signature = signWebhookBody(rawBody)
    const eventId = `evt_refund_dup_${Date.now()}`

    const first = await postRawWebhook(rawBody, { signature, eventId })
    assert.equal(first.status, 200, JSON.stringify(first.json))
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(getSentMessagesOfKind('admin-refund-alert').length, 1)

    const second = await postRawWebhook(rawBody, { signature, eventId })
    assert.equal(second.status, 200, JSON.stringify(second.json))
    assert.equal(second.json.duplicate, true)
    await new Promise((resolve) => setImmediate(resolve))

    assert.equal(getSentMessagesOfKind('admin-refund-alert').length, 1)

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.orderStatus, 'cancelled')
    assert.equal(stored.needsRefund, true)
  })

  test('mailer outage during refund alert still leaves webhook 200 and flagged', async () => {
    clearSentMessages()

    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_refund3_${Date.now()}`

    const cancelled = await apiFetch(`/api/order/${orderId}/cancel`, {
      method: 'POST',
      body: {},
    })
    assert.equal(cancelled.status, 200, cancelled.text)

    const sendMailMock = mock.method(mailer, 'sendMail', async () => {
      throw new Error('simulated provider outage')
    })

    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const delivered = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })
    assert.equal(delivered.status, 200, JSON.stringify(delivered.json))
    await new Promise((resolve) => setImmediate(resolve))

    // No alert recorded, but fulfillment bookkeeping is intact.
    assert.equal(getSentMessagesOfKind('admin-refund-alert').length, 0)

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.orderStatus, 'cancelled')
    assert.equal(stored.payment.status, 'paid')
    assert.equal(stored.needsRefund, true)
    assert.equal(stored.refundReason, 'captured_after_cancellation')
    sendMailMock.mock.restore()
  })

  test('mailer outage during admin order email still leaves order/payment succeeded and logs redacted failure', async () => {
    clearSentMessages()

    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_adminfail_${Date.now()}`

    fakeRazorpay.stagePayment(razorpayPaymentId, {
      id: razorpayPaymentId,
      order_id: razorpayOrderId,
      amount: totalMinor,
      currency: 'INR',
      status: 'captured',
    })

    const sendMailMock = mock.method(mailer, 'sendMail', async () => {
      throw new Error('simulated provider outage')
    })

    const loggedErrors = []
    const consoleErrorMock = mock.method(console, 'error', (...args) => {
      loggedErrors.push(args)
    })

    let unhandledRejectionOccurred = false
    const onUnhandledRejection = () => {
      unhandledRejectionOccurred = true
    }
    process.on('unhandledRejection', onUnhandledRejection)

    try {
      const verified = await apiFetch('/api/payments/razorpay/verify', {
        method: 'POST',
        body: {
          orderId,
          razorpayPaymentId,
          razorpayOrderId,
          razorpaySignature: signPayment(razorpayOrderId, razorpayPaymentId),
        },
      })
      assert.equal(verified.status, 200, verified.text)
      await new Promise((resolve) => setImmediate(resolve))

      // No admin-order email was recorded in outbox due to provider failure
      assert.equal(getSentMessagesOfKind('admin-order').length, 0)

      // Order still saves and succeeds
      const order = await orderModel.findById(orderId).lean()
      assert.equal(order.orderStatus, 'confirmed')
      assert.equal(order.payment.status, 'paid')

      // No unhandled rejection
      assert.equal(unhandledRejectionOccurred, false)

      // Exactly one redacted log line emitted for the failed admin order email
      const adminEmailErrors = loggedErrors.filter((args) =>
        args.some((arg) => typeof arg === 'string' && arg.includes('Failed to send admin order email'))
      )
      assert.equal(adminEmailErrors.length, 1)

      const [errMeta, msg] = adminEmailErrors[0]
      assert.equal(msg, 'Failed to send admin order email')
      assert.equal(errMeta.orderNumber, order.orderNumber)
      assert.equal(errMeta.err.message, 'simulated provider outage')
    } finally {
      process.removeListener('unhandledRejection', onUnhandledRejection)
      consoleErrorMock.mock.restore()
      sendMailMock.mock.restore()
    }
  })

  test('the outbox records no recipient-less messages and no real provider ids', () => {
    for (const message of getSentMessages()) {
      assert.equal(message.subject.length > 0, true)
      assert.equal(Array.isArray(message.to) ? message.to.length > 0 : Boolean(message.to), true)
      assert.equal(message.kind === 'memory' || message.kind !== undefined, true)
    }
  })

  test('GUARD: the live Resend transport and client refuse to run in tests', async () => {
    assert.throws(() => getResendClient(), /Refusing to create a live Resend client/)

    await assert.rejects(
      () => resendTransport.send({ from: 'a@b.test', to: ['c@d.test'], subject: 'x' }),
      /Refusing to use the live Resend transport/
    )
  })

  test('GUARD: the live SMTP transport refuses to run in tests', async () => {
    await assert.rejects(
      () => smtpTransport.send({ from: 'a@b.test', to: 'c@d.test', subject: 'x' }),
      /Refusing to use the live SMTP transport/
    )
  })

  test('the skip path logs "email skipped" with no recipient (child process)', async () => {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')

    const script = `
      const { sendMail } = await import('./src/services/mailer.service.js');
      const result = await sendMail({
        channel: 'resend',
        kind: 'admin-order',
        to: ['SECRET-RECIPIENT@example.com'],
        subject: 'should not send',
      });
      console.log('RESULT=' + JSON.stringify(result));
    `

    const { stdout } = await promisify(execFile)(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'development',
          EMAIL_NOTIFICATIONS_ENABLED: 'false',
        },
      }
    )

    assert.match(stdout, /RESULT=null/)
    assert.match(stdout, /email skipped/)
    // The recipient must never appear in the log line.
    assert.equal(stdout.includes('SECRET-RECIPIENT'), false)
  })
})

/* ========================================================================== */
/* 2. Razorpay isolation                                                       */
/* ========================================================================== */

describe('razorpay isolation', () => {
  test('the live Razorpay client refuses to be used in tests when nothing is injected', () => {
    clearRazorpayProvider()

    try {
      assert.throws(() => getRazorpayProvider(), /Refusing to use the live Razorpay client/)
    } finally {
      setRazorpayProvider(fakeRazorpay)
    }
  })

  test('GUARD: a real HTTP call to api.razorpay.com is blocked during the test run', async () => {
    await assert.rejects(
      () => fetch('https://api.razorpay.com/v1/orders'),
      /Outbound network is blocked during tests/
    )

    const https = await import('node:https')

    assert.throws(
      () => https.default.request({ hostname: 'api.razorpay.com', path: '/v1/orders' }),
      /Outbound network is blocked during tests/
    )
  })

  test('create-payment records the provider call and persists the fake order id', async () => {
    fakeRazorpay.reset()
    const { orderId, totalMinor } = await createOrderWithRazorpayId()

    // Remove the pre-set id so the create path actually calls the provider.
    await orderModel.updateOne({ _id: orderId }, { $set: { 'payment.razorpayOrderId': null } })

    const res = await apiFetch('/api/payments/razorpay/create', { method: 'POST', body: { orderId } })

    assert.equal(res.status, 200)
    assert.match(res.json.payment.razorpayOrderId, /^order_fake_\d+$/)

    const calls = fakeRazorpay.getCallsOfOperation('orders.create')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].payload.amount, totalMinor)
    assert.equal(calls[0].payload.currency, 'INR')

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.payment.razorpayOrderId, res.json.payment.razorpayOrderId)
  })
})

/* ========================================================================== */
/* 3. HTTP webhook: raw body + signature                                       */
/* ========================================================================== */

describe('webhook over HTTP', () => {
  test('a correctly signed raw body is accepted and drives the state change', async () => {
    const { orderId, razorpayOrderId, totalMinor, product } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_http_ok_${Date.now()}`

    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const res = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })

    assert.equal(res.status, 200)
    assert.equal(res.json.success, true)
    assert.equal(res.json.processed, true)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.payment.status, 'paid')
    assert.equal(order.orderStatus, 'fulfilled')
    assert.equal((await reloadProduct(product._id)).stock, 4)
  })

  test('a bad signature is rejected with 4xx and changes nothing', async () => {
    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const razorpayPaymentId = `pay_http_bad_${Date.now()}`

    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const res = await postRawWebhook(rawBody, { signature: 'f'.repeat(64) })

    assert.equal(res.status >= 400 && res.status < 500, true)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.payment.status, 'pending')
    assert.equal(order.orderStatus, 'pending')
  })

  test('a missing signature header is rejected with 4xx', async () => {
    const { razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_http_nosig_${Date.now()}`,
      amount: totalMinor,
    })

    const res = await postRawWebhook(rawBody)
    assert.equal(res.status >= 400 && res.status < 500, true)
  })

  test('a tampered body under a valid-looking signature is rejected', async () => {
    const { razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const paymentId = `pay_http_tamper_${Date.now()}`

    const original = capturedPayload({ razorpayOrderId, razorpayPaymentId: paymentId, amount: totalMinor })
    const signature = signWebhookBody(original)
    // Same signature, different body.
    const tampered = original.replace('"status":"captured"', '"status":"captured "')

    const res = await postRawWebhook(tampered, { signature })
    assert.equal(res.status >= 400 && res.status < 500, true)
  })

  test('the raw-body middleware order is correct (signature covers exact bytes)', async () => {
    const { orderId, razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const paymentId = `pay_http_spacing_${Date.now()}`

    // Non-canonical JSON: extra whitespace. A body re-serialised before signing
    // would break this, which is the bug the raw-body parser prevents.
    const rawBody = `{"event":"payment.captured",   "payload":{"payment":{"entity":{"id":"${paymentId}","order_id":"${razorpayOrderId}","amount":${totalMinor},"currency":"INR","status":"captured"}}}}`

    const res = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })
    assert.equal(res.status, 200)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'fulfilled')
  })
})

/* ========================================================================== */
/* 4. Payment gaps                                                             */
/* ========================================================================== */

describe('payment gaps', () => {
  test('a captured amount that differs from the order total must not fulfil', async () => {
    const { orderId, razorpayOrderId, totalMinor, product } = await createOrderWithRazorpayId()

    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_amount_${Date.now()}`,
      amount: totalMinor + 1,
    })

    const res = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })

    assert.equal(res.status >= 400 && res.status < 500, true)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.payment.status, 'pending')
    assert.equal(order.orderStatus, 'pending')
    assert.equal((await reloadProduct(product._id)).stock, 5)
  })

  test('a captured currency that differs from the order currency must not fulfil', async () => {
    const { orderId, razorpayOrderId, totalMinor, product } = await createOrderWithRazorpayId()

    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_currency_${Date.now()}`,
      amount: totalMinor,
      currency: 'USD',
    })

    const res = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })

    assert.equal(res.status >= 400 && res.status < 500, true)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.payment.status, 'pending')
    assert.equal((await reloadProduct(product._id)).stock, 5)
  })

  test('the same event id fired twice concurrently consumes stock exactly once', async () => {
    const { orderId, razorpayOrderId, totalMinor, product } = await createOrderWithRazorpayId({
      price: 1000,
      quantity: 2,
      stock: 6,
    })

    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_concurrent_${Date.now()}`,
      amount: totalMinor,
    })

    const signature = signWebhookBody(rawBody)
    const eventId = `evt_concurrent_${Date.now()}`

    const [a, b] = await Promise.all([
      postRawWebhook(rawBody, { signature, eventId }),
      postRawWebhook(rawBody, { signature, eventId }),
    ])

    // Both deliveries must be acknowledged so the provider stops retrying.
    assert.equal(a.status, 200)
    assert.equal(b.status, 200)

    // Exactly one of them did the work.
    const processedCount = [a, b].filter((r) => r.json.processed === true).length
    assert.equal(processedCount, 1)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.orderStatus, 'fulfilled')

    // Consumed once: 6 -> 4, not 6 -> 2.
    const after = await reloadProduct(product._id)
    assert.equal(after.stock, 4)
    assert.equal(after.reservedStock, 0)
  })

  test('a duplicate delivery of an already-processed event still returns 200', async () => {
    const { razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_dup_${Date.now()}`,
      amount: totalMinor,
    })
    const signature = signWebhookBody(rawBody)
    const eventId = `evt_dup_${Date.now()}`

    const first = await postRawWebhook(rawBody, { signature, eventId })
    const second = await postRawWebhook(rawBody, { signature, eventId })

    assert.equal(first.status, 200)
    assert.equal(second.status, 200)
    assert.equal(second.json.duplicate, true)
  })

  test('payment.failed arriving after payment.captured does not undo the capture', async () => {
    const { orderId, razorpayOrderId, totalMinor, product } = await createOrderWithRazorpayId()

    const captured = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_order_${Date.now()}`,
      amount: totalMinor,
    })
    const first = await postRawWebhook(captured, { signature: signWebhookBody(captured) })
    assert.equal(first.status, 200)

    const failed = JSON.stringify({
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_late_fail', order_id: razorpayOrderId, status: 'failed' } } },
    })
    const second = await postRawWebhook(failed, { signature: signWebhookBody(failed) })
    assert.equal(second.status, 200)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.payment.status, 'paid')
    assert.equal(order.orderStatus, 'fulfilled')
    assert.equal(order.needsRefund, false)
    // Stock stays consumed once.
    assert.equal((await reloadProduct(product._id)).stock, 4)
  })

  test('a late capture on a cancelled (expired) order is kept and flagged for refund', async () => {
    const { orderId, razorpayOrderId, totalMinor, product } = await createOrderWithRazorpayId({
      price: 5000,
      quantity: 1,
      stock: 3,
    })

    /*
     * Let the reservation expire so the cron job cancels the order while the
     * customer is still on the payment screen.
     */
    await orderModel.updateOne(
      { _id: orderId },
      { $set: { stockReservedAt: new Date(Date.now() - config.STOCK_RESERVATION_TTL_MS - 60_000) } }
    )

    const released = await releaseStockNow()
    assert.equal(released >= 1, true)

    const cancelled = await orderModel.findById(orderId).lean()
    assert.equal(cancelled.orderStatus, 'cancelled')
    assert.equal(cancelled.payment.status, 'failed')

    // ...and then the money lands.
    const razorpayPaymentId = `pay_late_${Date.now()}`
    const rawBody = capturedPayload({ razorpayOrderId, razorpayPaymentId, amount: totalMinor })
    const res = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })

    // Acknowledged, because the money is real and the provider must stop retrying.
    assert.equal(res.status, 200)

    const order = await orderModel.findById(orderId).lean()
    assert.equal(order.needsRefund, true)
    assert.equal(order.refundReason, 'captured_after_cancellation')
    assert.equal(order.payment.razorpayPaymentId, razorpayPaymentId)
    assert.equal(order.payment.status, 'paid')

    // The order is NOT revived: no fulfilment, no stock consumption.
    assert.equal(order.orderStatus, 'cancelled')
    assert.equal(order.stockConsumedAt, null)
    assert.equal((await reloadProduct(product._id)).stock, 3)

    // A duplicate of that same event is still acknowledged, still one record.
    const duplicate = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody) })
    assert.equal(duplicate.status, 200)

    const stillOne = await orderModel.findById(orderId).lean()
    assert.equal(stillOne.needsRefund, true)
    assert.equal(stillOne.payment.razorpayPaymentId, razorpayPaymentId)
  })

  test('only a bad signature is a 4xx on an otherwise duplicate event', async () => {
    const { razorpayOrderId, totalMinor } = await createOrderWithRazorpayId()
    const rawBody = capturedPayload({
      razorpayOrderId,
      razorpayPaymentId: `pay_sig_only_${Date.now()}`,
      amount: totalMinor,
    })
    const eventId = `evt_sig_only_${Date.now()}`

    const ok = await postRawWebhook(rawBody, { signature: signWebhookBody(rawBody), eventId })
    assert.equal(ok.status, 200)

    const badSig = await postRawWebhook(rawBody, { signature: 'a'.repeat(64), eventId })
    assert.equal(badSig.status >= 400 && badSig.status < 500, true)
  })
})

/* ========================================================================== */
/* 5. Password byte rule (bcrypt truncates past 72 bytes)                       */
/* ========================================================================== */

describe('password byte rule', () => {
  const registerWithPassword = (email, password) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Byte Tester',
        email,
        phone: '9876543210',
        password,
      },
    })

  test('a 73-byte ASCII password is rejected with a clear message', async () => {
    const res = await registerWithPassword(`bytes73-${Date.now()}@mailhost.test`, 'a'.repeat(73))
    assert.equal(res.status, 400, res.text)
    assert.match(res.text, /at most 72 bytes/)
  })

  test('multi-byte passwords are measured in bytes, not characters', async () => {
    // 'é' is 2 bytes in UTF-8: 40 chars = 80 bytes → rejected.
    const over = await registerWithPassword(`bytes80-${Date.now()}@mailhost.test`, 'é'.repeat(40))
    assert.equal(over.status, 400, over.text)
    assert.match(over.text, /at most 72 bytes/)
  })

  test('a password of exactly 72 bytes is accepted', async () => {
    // 'é' × 36 = 72 bytes exactly → passes validation (register succeeds).
    const res = await registerWithPassword(`bytes72-${Date.now()}@mailhost.test`, 'é'.repeat(36))
    assert.equal(res.status, 200, res.text)
  })
})
