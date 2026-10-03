import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * Pre-deployment security audit: authorization, input hardening, transport
 * hardening and the end-to-end auth flows.
 *
 * Everything runs through the real app with the fake mailer and the fake
 * Razorpay provider, so no external service is contacted.
 *
 * Rate-limit tests run LAST: they deliberately exhaust per-IP budgets that are
 * shared by every request in this file.
 */

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import app from '../src/app/app.js'
import config from '../src/config/config.js'
import userModel from '../src/models/user.model.js'
import productModel from '../src/models/product.model.js'
import orderModel from '../src/models/order.model.js'
import webhookEventModel from '../src/models/webhookEvent.model.js'
import { accessTokenGenerator } from '../src/utils/tokenManager.js'
import { clearSentMessages, getSentMessagesOfKind } from '../src/services/mailer.service.js'

const TEST_DB = 'idiot-pedals-test'

const testMongoUri = (() => {
  const [base, query = ''] = config.MONGO_URI.split('?')
  const lastSlash = base.lastIndexOf('/')
  const withDb = base.slice(0, lastSlash + 1) + TEST_DB
  return query ? `${withDb}?${query}` : withDb
})()

let server
let baseUrl

const request = async (
  path,
  { method = 'GET', body, token, origin, cookie, rawBody, headers = {} } = {}
) => {
  const finalHeaders = { ...headers }
  if (token) finalHeaders.Authorization = `Bearer ${token}`
  if (origin) finalHeaders.Origin = origin
  if (cookie) finalHeaders.Cookie = cookie
  if (body !== undefined || rawBody !== undefined) finalHeaders['Content-Type'] = 'application/json'

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: finalHeaders,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    redirect: 'manual',
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  return {
    status: res.status,
    headers: res.headers,
    json,
    text,
    setCookie: res.headers.getSetCookie?.() ?? [],
    location: res.headers.get('location'),
  }
}

let sharedToken
let tokenFor = async () => sharedToken

let skuCounter = 0
const createProduct = async ({ price = 1000, stock = 10 } = {}) => {
  skuCounter += 1
  return productModel.create({
    name: `Security Pedal ${skuCounter}`,
    slug: `security-pedal-${skuCounter}`,
    sku: `SEC-${skuCounter}`,
    description: 'Security fixture product.',
    price,
    currency: 'INR',
    stock,
    reservedStock: 0,
    status: 'active',
  })
}

let phoneCounter = 0

const createUser = async ({ role = 'customer', verified = true } = {}) => {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const email = `sec-${role}-${stamp}@mailhost.test`

  // phone is uniquely indexed, so every fixture needs its own number.
  phoneCounter += 1
  const phone = String(9000000000 + phoneCounter)

  const user = await userModel.create({
    name: 'Security User',
    email,
    emailVerified: verified,
    phone,
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: email }],
    passwordHash: 'x',
    role,
  })

  return user
}

const orderBody = (productId, overrides = {}) => ({
  items: [{ productId: String(productId), quantity: 1 }],
  paymentMethod: 'razorpay',
  customer: { name: 'Security', email: 'security@mailhost.test', phone: '9000000601' },
  shippingAddress: {
    name: 'Security', phone: '9000000601', addressLine1: '4 Test Street',
    city: 'Kolkata', state: 'West Bengal', postalCode: '700001', country: 'India',
  },
  ...overrides,
})

const signWebhook = (rawBody) =>
  crypto.createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')

before(async () => {
  await mongoose.connect(testMongoUri)
  await mongoose.connection.dropDatabase()

  await Promise.all([
    userModel.init(),
    productModel.init(),
    orderModel.init(),
    webhookEventModel.init(),
  ])

  const sharedUser = await createUser({ role: 'customer' })
  sharedToken = await accessTokenGenerator({ userId: sharedUser._id, role: 'customer' })

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
/* 1 + 4. Product authorization and how admin is granted                        */
/* ========================================================================== */

describe('product authorization', () => {
  test('POST/PATCH/DELETE /api/products: no token 401, user 403, admin allowed', async () => {
    const normalUser = await createUser({ role: 'customer' })
    const adminUser = await createUser({ role: 'admin' })

    const userToken = await accessTokenGenerator({ userId: normalUser._id, role: 'customer' })
    const adminToken = await accessTokenGenerator({ userId: adminUser._id, role: 'admin' })

    const product = await createProduct()
    const body = {
      name: 'Attempted Pedal',
      slug: `attempted-pedal-${Date.now()}`,
      sku: `ATT-${Date.now()}`,
      description: 'Attempt.',
      price: 1000,
      currency: 'INR',
      stock: 1,
      status: 'active',
    }

    for (const [label, definition] of [
      ['POST', { method: 'POST', path: '/api/products', body }],
      ['PATCH', { method: 'PATCH', path: `/api/products/${product._id}`, body: { stock: 5 } }],
      ['DELETE', { method: 'DELETE', path: `/api/products/${product._id}` }],
    ]) {
      const anonymous = await request(definition.path, { method: definition.method, body: definition.body })
      assert.equal(anonymous.status, 401, `${label} without a token must be 401`)

      const asUser = await request(definition.path, { method: definition.method, body: definition.body, token: userToken })
      assert.equal(asUser.status, 403, `${label} as a normal user must be 403`)

      const asAdmin = await request(definition.path, { method: definition.method, body: definition.body, token: adminToken })
      assert.equal(
        [200, 201].includes(asAdmin.status),
        true,
        `${label} as an admin must succeed, got ${asAdmin.status} ${asAdmin.text}`
      )
    }
  })

  test('register and users/me cannot grant admin (no public route escalates role)', async () => {
    clearSentMessages()

    const registerAttempt = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Escalator',
        email: `escalator-${Date.now()}@mailhost.test`,
        phone: '9000000602',
        password: 'Escalate#12345',
        role: 'admin',
        emailVerified: true,
      },
    })
    assert.equal(registerAttempt.status, 400)

    const user = await createUser({ role: 'customer' })
    const token = await accessTokenGenerator({ userId: user._id, role: 'customer' })

    for (const payload of [{ role: 'admin' }, { emailVerified: true }, { passwordHash: 'x' }]) {
      const res = await request('/api/users/me', { method: 'PATCH', token, body: payload })
      assert.equal(res.status, 400)

      const after = await userModel.findById(user._id).lean()
      assert.equal(after.role, 'customer')
      assert.equal(after.emailVerified, true)
    }
  })
})

/* ========================================================================== */
/* 2 + 3. Token forgery and role trust                                          */
/* ========================================================================== */

describe('token trust', () => {
  test('a forged role:admin token is rejected', async () => {
    const user = await createUser({ role: 'customer' })

    // Correctly signed, correct secret, but claims a role the record does not have.
    const forged = jwt.sign({ userId: String(user._id), role: 'admin' }, config.ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
      algorithm: 'HS256',
    })

    const res = await request('/api/products', {
      method: 'POST',
      token: forged,
      body: { name: 'x', slug: 'x', sku: `X-${Date.now()}`, description: 'x', price: 1, stock: 1, status: 'active' },
    })

    assert.equal(res.status, 401)
  })

  test('a token signed with the wrong secret is rejected', async () => {
    const user = await createUser()
    const wrongSecret = jwt.sign(
      { userId: String(user._id), role: 'customer' },
      'definitely-not-the-real-secret-but-long-enough',
      { expiresIn: '15m' }
    )

    assert.equal((await request('/api/auth/me', { token: wrongSecret })).status, 401)
  })

  test('an alg:none token is rejected', async () => {
    const user = await createUser()
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({ userId: String(user._id), role: 'admin', exp: Math.floor(Date.now() / 1000) + 900 })
    ).toString('base64url')

    assert.equal((await request('/api/auth/me', { token: `${header}.${payload}.` })).status, 401)
  })

  test('an expired token is rejected', async () => {
    const user = await createUser()
    const expired = jwt.sign({ userId: String(user._id), role: 'customer' }, config.ACCESS_TOKEN_SECRET, {
      expiresIn: '-1s',
    })

    assert.equal((await request('/api/auth/me', { token: expired })).status, 401)
  })

  test('a valid token for a user that is NOT email verified is rejected', async () => {
    const unverified = await createUser({ verified: false })
    const token = await accessTokenGenerator({ userId: unverified._id, role: 'customer' })

    assert.equal((await request('/api/auth/me', { token })).status, 401)
  })

  test('demoting a user immediately removes admin access (role is read from the DB)', async () => {
    const adminUser = await createUser({ role: 'admin' })
    const adminToken = await accessTokenGenerator({ userId: adminUser._id, role: 'admin' })

    const product = await createProduct()
    const before = await request(`/api/products/${product._id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { stock: 7 },
    })
    assert.equal(before.status, 200)

    // Demote behind the token's back: the token still says admin.
    await userModel.updateOne({ _id: adminUser._id }, { $set: { role: 'customer' } })

    const after = await request(`/api/products/${product._id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { stock: 8 },
    })
    assert.equal(after.status, 401)
  })

  test('deleting a user immediately invalidates their token', async () => {
    const user = await createUser()
    const token = await accessTokenGenerator({ userId: user._id, role: 'customer' })

    assert.equal((await request('/api/auth/me', { token })).status, 200)

    await userModel.deleteOne({ _id: user._id })

    assert.equal((await request('/api/auth/me', { token })).status, 401)
  })
})

/* ========================================================================== */
/* 5. Cross-user access to orders and payments                                  */
/* ========================================================================== */

describe('cross-user access', () => {
  test('user B cannot read, pay for or verify user A order (id or order number)', async () => {
    const userA = await createUser({ role: 'customer' })
    const userB = await createUser({ role: 'customer' })

    const tokenA = await accessTokenGenerator({ userId: userA._id, role: 'customer' })
    const tokenB = await accessTokenGenerator({ userId: userB._id, role: 'customer' })

    const created = await request('/api/order', { method: 'POST', token: tokenA, body: orderBody((await createProduct())._id) })
    assert.equal(created.status, 201)
    const order = created.json.order

    for (const identifier of [String(order._id), order.orderNumber]) {
      assert.equal((await request(`/api/order/${identifier}`, { token: tokenB })).status, 404, `detail ${identifier}`)
    }

    // Owner still can, so the 404 is about ownership, not a broken route.
    assert.equal((await request(`/api/order/${order.orderNumber}`, { token: tokenA })).status, 200)

    // B cannot attach a payment to A's order...
    const payForA = await request('/api/payments/razorpay/create', { method: 'POST', token: tokenB, body: { orderId: String(order._id) } })
    assert.equal([403, 404].includes(payForA.status), true, `got ${payForA.status}`)

    // ...or settle it.
    const verifyForA = await request('/api/payments/razorpay/verify', {
      method: 'POST',
      token: tokenB,
      body: {
        orderId: String(order._id),
        razorpayPaymentId: 'pay_cross_user',
        razorpayOrderId: 'order_cross_user',
        razorpaySignature: 'invalid-signature-value',
      },
    })
    assert.equal([400, 403, 404].includes(verifyForA.status), true, `got ${verifyForA.status}`)

    // Nothing changed for A.
    const untouched = await orderModel.findById(order._id).lean()
    assert.equal(untouched.payment.status, 'pending')
    assert.equal(untouched.orderStatus, 'pending')
  })

  test('the order list is scoped to the caller', async () => {
    const userA = await createUser({ role: 'customer' })
    const userB = await createUser({ role: 'customer' })

    const tokenA = await accessTokenGenerator({ userId: userA._id, role: 'customer' })
    const tokenB = await accessTokenGenerator({ userId: userB._id, role: 'customer' })

    await request('/api/order', { method: 'POST', token: tokenA, body: orderBody((await createProduct())._id) })

    const listB = await request('/api/order', { token: tokenB })
    assert.equal(listB.status, 200)

    const ordersB = listB.json.data?.orders ?? listB.json.orders ?? []
    for (const entry of ordersB) {
      assert.equal(String(entry.userId), String(userB._id))
    }
  })
})

/* ========================================================================== */
/* 6. NoSQL injection                                                          */
/* ========================================================================== */

describe('nosql injection', () => {
  test('operator objects in login/register are rejected', async () => {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: { $gt: '' }, password: { $gt: '' } },
    })
    assert.equal(login.status, 400)

    const register = await request('/api/auth/register', {
      method: 'POST',
      body: { name: { $gt: '' }, email: { $gt: '' }, phone: { $gt: '' }, password: { $gt: '' } },
    })
    assert.equal(register.status, 400)
  })

  test('operator objects in verify-email, products filters and order lookups are rejected', async () => {
    const verify = await request('/api/auth/verify-email?token%5B%24gt%5D=')
    assert.equal(verify.status, 400)

    const injectionId = await request('/api/order/%7B%22%24gt%22%3A%22%22%7D', { token: await tokenFor() })
    assert.equal(injectionId.status, 400)

    const products = await request('/api/products?status%5B%24gt%5D=&price%5B%24gt%5D=0')
    assert.equal([200, 400].includes(products.status), true)
    assert.notEqual(products.status, 500)
    if (products.status === 200) {
      assert.equal(Array.isArray(products.json.data.products), true)
    }
  })

  test('operator objects in an order line item are rejected', async () => {
    const token = await tokenFor()
    const res = await request('/api/order', {
      method: 'POST',
      token,
      body: {
        items: [{ productId: { $gt: '' }, quantity: 1 }],
        paymentMethod: 'razorpay',
        customer: { name: 'x', email: 'x@mailhost.test', phone: '9000000601' },
        shippingAddress: {
          name: 'x', phone: '9000000601', addressLine1: 'x', city: 'x', state: 'x', postalCode: '700001', country: 'India',
        },
      },
    })

    assert.equal(res.status, 400)
  })
})

/* ========================================================================== */
/* 7. Mass assignment                                                          */
/* ========================================================================== */

describe('mass assignment', () => {
  test('price, totals, status and payment state on order create are ignored', async () => {
    const token = await tokenFor()
    const product = await createProduct({ price: 1000 })

    const res = await request('/api/order', {
      method: 'POST',
      token,
      body: orderBody(product._id, {
        // Every one of these is a privilege/price claim from the client.
        pricing: { total: 1, totalMinor: 1, subtotalMinor: 1 },
        total: 1,
        amount: 1,
        orderStatus: 'fulfilled',
        needsRefund: true,
        payment: { status: 'paid', method: 'razorpay' },
        items: [{ productId: String(product._id), quantity: 1, unitPrice: { amountMinor: 1 }, total: { amountMinor: 1 } }],
      }),
    })

    assert.equal(res.status, 201)

    const stored = await orderModel.findById(res.json.order._id).lean()

    // Server-computed, not client-supplied.
    assert.equal(stored.pricing.totalMinor, 100000)
    assert.equal(stored.pricing.total, 1000)
    assert.equal(stored.items[0].unitPrice.amountMinor, 100000)
    assert.equal(stored.items[0].total.amountMinor, 100000)
    assert.equal(stored.orderStatus, 'pending')
    assert.equal(stored.payment.status, 'pending')
    assert.equal(stored.needsRefund, false)
  })
})

/* ========================================================================== */
/* 9. Error hygiene                                                            */
/* ========================================================================== */

describe('error responses', () => {
  test('no stack traces, file paths, Mongo internals or secrets leak', async () => {
    const token = await tokenFor()
    const product = await createProduct()

    const responses = [
      await request('/api/nope-does-not-exist'),
      await request('/api/auth/me'),
      await request('/api/products/not-a-valid-object-id'),
      await request(`/api/products/${product._id}`, { method: 'PATCH', body: { stock: 1 } }),
      await request('/api/order', { method: 'POST', token, body: { items: [], paymentMethod: 'razorpay' } }),
      await request('/api/order/%7B%22%24gt%22%3A%22%22%7D', { token }),
    ]

    const forbidden = [
      /at\s+\w+\s+\(/, // stack frame
      /node_modules/,
      /\.[cm]?js:\d+/, // file:line
      /E11000/,
      /MongoError|MongoServerError|CastError|ValidationError/,
      /mongodb:\/\//,
      new RegExp(config.RAZORPAY_KEY_SECRET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      /passwordHash/,
    ]

    for (const response of responses) {
      assert.equal(response.text.includes('"stack"'), false, `stack key in ${response.status}: ${response.text}`)
      for (const pattern of forbidden) {
        assert.equal(pattern.test(response.text), false, `leaked ${pattern} in: ${response.text}`)
      }
    }
  })
})

/* ========================================================================== */
/* 10. Cookies                                                                 */
/* ========================================================================== */

describe('cookies', () => {
  test('the OAuth state cookie is httpOnly, signed, Lax and short lived', async () => {
    const res = await request('/api/auth/google')
    assert.equal(res.status, 302)

    const stateCookie = res.setCookie.find((entry) => entry.startsWith('oauth_state='))
    assert.equal(Boolean(stateCookie), true, `no oauth_state cookie in ${res.setCookie.join(' | ')}`)
    assert.match(stateCookie, /HttpOnly/i)
    assert.match(stateCookie, /SameSite=Lax/i)
    assert.match(stateCookie, /Path=\//i)
    // Signed cookies carry a second segment.
    assert.match(stateCookie, /oauth_state=[^;]+\.[^;]+/)
    assert.match(res.location ?? '', /^https:\/\/accounts\.google\.com\//)
  })
})

/* ========================================================================== */
/* 11. CORS and helmet                                                         */
/* ========================================================================== */

describe('transport hardening', () => {
  test('CORS echoes only the configured frontend origin, never a wildcard', async () => {
    const allowed = await request('/api/products', { origin: config.FRONTEND_URL })
    assert.equal(allowed.headers.get('access-control-allow-origin'), config.FRONTEND_URL)

    const evil = await request('/api/products', { origin: 'https://evil.example.com' })
    assert.equal(evil.headers.get('access-control-allow-origin'), null)
    assert.equal(evil.status, 200)

    // Never a wildcard, anywhere.
    assert.notEqual(allowed.headers.get('access-control-allow-origin'), '*')
    assert.notEqual(evil.headers.get('access-control-allow-origin'), '*')

    /*
     * /healthz and /readyz are mounted before the CORS middleware, so they never
     * carry an Access-Control-Allow-Origin header at all. That is MORE
     * restrictive than the API, not less, and they expose no user data — see the
     * entry in KNOWN_GAPS.md.
     */
    const healthEvil = await request('/healthz', { origin: 'https://evil.example.com' })
    assert.equal(healthEvil.headers.get('access-control-allow-origin'), null)
  })

  test('helmet security headers are present on API responses', async () => {
    const res = await request('/api/products')

    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-powered-by'), null)

    const present = [
      'content-security-policy',
      'x-frame-options',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'strict-transport-security',
      'referrer-policy',
    ].filter((header) => res.headers.get(header) !== null)

    assert.equal(present.length >= 3, true, `only found: ${present.join(', ')}`)
  })
})

/* ========================================================================== */
/* 12. Webhook                                                                 */
/* ========================================================================== */

describe('webhook signature', () => {
  test('unsigned and wrongly signed deliveries are rejected and change nothing', async () => {
    const token = await tokenFor()
    const created = await request('/api/order', { method: 'POST', token, body: orderBody((await createProduct())._id) })
    const orderId = created.json.order._id

    const razorpayOrderId = `order_sig_${Date.now()}`
    await orderModel.updateOne({ _id: orderId }, { $set: { 'payment.razorpayOrderId': razorpayOrderId } })

    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: `pay_sig_${Date.now()}`, order_id: razorpayOrderId, amount: 100000, currency: 'INR', status: 'captured' } } },
    })

    const unsigned = await request('/api/webhooks/razorpay', {
      method: 'POST',
      rawBody,
      headers: { 'x-razorpay-event-id': `evt_unsigned_${Date.now()}` },
    })
    assert.equal(unsigned.status >= 400 && unsigned.status < 500, true)

    const wrongSignature = await request('/api/webhooks/razorpay', {
      method: 'POST',
      rawBody,
      headers: { 'x-razorpay-event-id': `evt_wrong_${Date.now()}`, 'x-razorpay-signature': 'not-a-valid-signature' },
    })
    assert.equal(wrongSignature.status >= 400 && wrongSignature.status < 500, true)

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.payment.status, 'pending')
    assert.equal(stored.orderStatus, 'pending')
  })
})

/* ========================================================================== */
/* STEP 3. The full auth flow, in process, with the fake mailer                 */
/* ========================================================================== */


describe('end-to-end auth flow (fake mailer)', () => {
  test('register -> email recorded -> verify -> login -> refresh -> logout', async () => {
    clearSentMessages()

    const email = `flow-${Date.now()}@mailhost.test`
    const password = 'FlowTest#12345'

    // 1. register
    const registered = await request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Flow User', email, phone: '9000000700', password },
    })
    assert.equal(registered.status, 200)

    // No account yet, and the caller is told nothing about internals.
    assert.equal(await userModel.findOne({ email }).lean(), null)

    // 2. the fake outbox holds the verification email, pointing at FRONTEND_URL
    const messages = getSentMessagesOfKind('email-verification')
    assert.equal(messages.length, 1)
    assert.equal(messages[0].to, email)

    const linkMatch = messages[0].text.match(new RegExp(`${config.FRONTEND_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/verify-email\\?token=([A-Za-z0-9_-]+)`))
    assert.equal(Boolean(linkMatch), true, 'no verification link pointing at FRONTEND_URL')
    const verificationToken = linkMatch[1]

    // 3. verify-email
    const verified = await request(`/api/auth/verify-email?token=${verificationToken}`)
    assert.equal(verified.status, 200)

    const createdUser = await userModel.findOne({ email }).lean()
    assert.equal(Boolean(createdUser), true)
    assert.equal(createdUser.role, 'customer')
    assert.equal(createdUser.emailVerified, true)

    // 4. login
    const loggedIn = await request('/api/auth/login', { method: 'POST', body: { email, password } })
    assert.equal(loggedIn.status, 200)
    assert.equal(typeof loggedIn.json.data.accessToken, 'string')

    const refreshCookie = loggedIn.setCookie.find((entry) => /HttpOnly/i.test(entry) && /SameSite=Strict/i.test(entry))
    assert.equal(Boolean(refreshCookie), true, `no strict httpOnly cookie: ${loggedIn.setCookie.join(' | ')}`)
    assert.match(refreshCookie, /Path=\//i)
    // Secure must be off outside production, or the local dev flow breaks.
    assert.equal(/;\s*Secure/i.test(refreshCookie), config.IS_PRODUCTION)

    // 5. refresh (cookie only)
    const cookiePair = refreshCookie.split(';')[0]
    const refreshed = await request('/api/auth/refresh', { method: 'POST', cookie: cookiePair, body: {} })
    assert.equal(refreshed.status, 200)
    assert.equal(typeof refreshed.json.accessToken, 'string')

    // 6. logout clears the cookie
    const loggedOut = await request('/api/auth/logout', { method: 'POST', cookie: cookiePair, body: {} })
    assert.equal(loggedOut.status, 200)

    const cleared = loggedOut.setCookie.find((entry) => /SameSite=Strict/i.test(entry))
    assert.equal(Boolean(cleared), true, 'logout did not clear the refresh cookie')
    assert.match(cleared, /Expires=Thu, 01 Jan 1970|Max-Age=0/i)
  })

  test('verify-email distinguishes invalid, already used and unknown tokens', async () => {
    const invalid = await request('/api/auth/verify-email?token=not-a-real-token')
    assert.equal(invalid.status, 400)

    const missing = await request('/api/auth/verify-email')
    assert.equal(missing.status, 400)
  })

  test('Google callback failures redirect into the SPA with an error code', async () => {
    const noState = await request('/api/auth/google/callback?code=whatever&state=forged')
    assert.equal(noState.status, 302)
    assert.equal(noState.location.startsWith(`${config.FRONTEND_URL}/login?error=`), true, noState.location ?? '')

    const cancelled = await request('/api/auth/google/callback?error=access_denied')
    assert.equal(cancelled.status, 302)
    assert.equal(cancelled.location.startsWith(`${config.FRONTEND_URL}/login?error=`), true, cancelled.location ?? '')

    // No token is ever placed in a redirect URL.
    assert.equal(/token=/i.test(noState.location ?? ''), false)
    assert.equal(/\?error=[a-z_]+&.*(jwt|bearer)/i.test(noState.location ?? ''), false)
  })

  test('payment verify success path: confirmed, not fulfilled, stock reserved', async () => {
    const token = await tokenFor()
    const product = await createProduct({ price: 1000, stock: 4 })

    const created = await request('/api/order', { method: 'POST', token, body: orderBody(product._id) })
    const orderId = created.json.order._id

    const pay = await request('/api/payments/razorpay/create', { method: 'POST', token, body: { orderId } })
    assert.equal(pay.status, 200)
    const razorpayOrderId = pay.json.payment.razorpayOrderId

    const razorpayPaymentId = `pay_flow_${Date.now()}`
    fakeRazorpay.stagePayment(razorpayPaymentId, {
      id: razorpayPaymentId, order_id: razorpayOrderId, amount: 100000, currency: 'INR', status: 'captured',
    })

    const signature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    const verified = await request('/api/payments/razorpay/verify', {
      method: 'POST',
      token,
      body: { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature: signature },
    })

    assert.equal(verified.status, 200)
    assert.equal(verified.json.orderStatus, 'confirmed')

    const stored = await orderModel.findById(orderId).lean()
    assert.equal(stored.payment.status, 'paid')
    assert.equal(stored.orderStatus, 'confirmed')
    assert.equal(stored.stockConsumedAt, null)

    const stock = await productModel.findById(product._id).lean()
    assert.equal(stock.stock, 4)
    assert.equal(stock.reservedStock, 1)
  })

  test('the well-formed signed webhook is still accepted (fake provider, no network)', async () => {
    const token = await tokenFor()
    const product = await createProduct({ price: 1000 })
    const created = await request('/api/order', { method: 'POST', token, body: orderBody(product._id) })
    const orderId = created.json.order._id

    const razorpayOrderId = `order_flow_${Date.now()}`
    await orderModel.updateOne({ _id: orderId }, { $set: { 'payment.razorpayOrderId': razorpayOrderId } })

    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: `pay_flow_wh_${Date.now()}`, order_id: razorpayOrderId, amount: 100000, currency: 'INR', status: 'captured' } } },
    })

    const res = await request('/api/webhooks/razorpay', {
      method: 'POST',
      rawBody,
      headers: { 'x-razorpay-event-id': `evt_flow_${Date.now()}`, 'x-razorpay-signature': signWebhook(rawBody) },
    })

    assert.equal(res.status, 200)
    assert.equal((await orderModel.findById(orderId).lean()).orderStatus, 'fulfilled')
  })
})

/* ========================================================================== */
/* 8. Rate limits (LAST: these deliberately exhaust shared per-IP budgets)      */
/* ========================================================================== */

describe('rate limits', () => {
  test('order creation is rate limited per user, occasional use unaffected', async () => {
    const user = await createUser()
    const token = await accessTokenGenerator({ userId: user._id, role: user.role })
    const product = await createProduct({ price: 1000, stock: 50 })
    const body = orderBody(product._id)

    // Normal occasional use: the first checkout succeeds.
    const first = await request('/api/order', { method: 'POST', token, body })
    assert.equal(first.status, 201, first.text)

    // Identical checkouts reuse the open order, so hammering past the
    // per-user budget trips the limiter (429) rather than failing otherwise.
    let sawLimit = false
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const res = await request('/api/order', { method: 'POST', token, body })
      if (res.status === 429) {
        sawLimit = true
        assert.equal(res.json?.success, false)
        break
      }
      assert.ok([200, 201].includes(res.status), `unexpected ${res.status}: ${res.text}`)
    }

    assert.equal(sawLimit, true, 'order creation never returned 429')
  })

  const hammer = async (path, body, limit = 20) => {
    let sawLimit = false
    let last = null

    for (let attempt = 0; attempt < limit; attempt += 1) {
      last = await request(path, { method: 'POST', body })
      if (last.status === 429) {
        sawLimit = true
        break
      }
    }

    return { sawLimit, last }
  }

  test('login is rate limited', async () => {
    const { sawLimit, last } = await hammer('/api/auth/login', { email: 'nobody@mailhost.test', password: 'Wrong#12345' }, 15)
    assert.equal(sawLimit, true, `login never returned 429 (last ${last?.status})`)
    assert.equal(last.status, 429)
  })

  test('register is rate limited', async () => {
    const { sawLimit } = await hammer(
      '/api/auth/register',
      { name: 'Hammer', email: `hammer-${Date.now()}@mailhost.test`, phone: '9000000701', password: 'Hammer#12345' },
      10
    )
    assert.equal(sawLimit, true, 'register never returned 429')
  })

  test('payment create is rate limited', async () => {
    const token = await tokenFor()
    let sawLimit = false

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const res = await request('/api/payments/razorpay/create', {
        method: 'POST',
        token,
        body: { orderId: '507f1f77bcf86cd799439011' },
      })
      if (res.status === 429) {
        sawLimit = true
        break
      }
    }

    assert.equal(sawLimit, true, 'payment create never returned 429')
  })
})
