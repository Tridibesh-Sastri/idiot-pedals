/**
 * Phase 1 API tests.
 *
 * Runs against a REAL MongoDB (the instance configured in server/.env) but a
 * SEPARATE database (`idiot-pedal-phase1-test`), which is dropped before and
 * after the run. Nothing is written to the development database.
 *
 *   node --test tests/phase1.test.js
 */

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import crypto from 'node:crypto'
import mongoose from 'mongoose'

import app from '../src/app/app.js'
import config from '../src/config/config.js'
import userModel from '../src/models/user.model.js'
import productModel from '../src/models/product.model.js'
import orderModel from '../src/models/order.model.js'
import pendingRegistrationModel from '../src/models/pendingRegistration.js'
import { accessTokenGenerator, hashToken } from '../src/utils/tokenManager.js'

/* -------------------------------------------------------------------------- */
/* Test database (derived, never the dev database)                             */
/* -------------------------------------------------------------------------- */

const TEST_DB_SUFFIX = '-phase1-test'

const testMongoUri = (() => {
  const [base, query = ''] = config.MONGO_URI.split('?')
  const lastSlash = base.lastIndexOf('/')
  const withDb = base.slice(0, lastSlash + 1) + 'idiot-pedal' + TEST_DB_SUFFIX
  return query ? `${withDb}?${query}` : withDb
})()

/* -------------------------------------------------------------------------- */
/* Harness                                                                     */
/* -------------------------------------------------------------------------- */

let server
let baseUrl

const apiFetch = async (path, { method = 'GET', token, body, headers = {} } = {}) => {
  const finalHeaders = { ...headers }
  if (token) finalHeaders.Authorization = `Bearer ${token}`
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json'

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
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

const describeBodyKeys = (body) => Object.keys(body ?? {}).sort().join(',')

let userA
let userB
let tokenA
let tokenB
let product
let orderA

before(async () => {
  await mongoose.connect(testMongoUri)
  await mongoose.connection.dropDatabase()

  await Promise.all([
    userModel.init(),
    productModel.init(),
    orderModel.init(),
    pendingRegistrationModel.init(),
  ])

  userA = await userModel.create({
    name: 'Alpha Player',
    email: 'alpha@mailhost.test',
    emailVerified: true,
    phone: '9000000001',
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: 'alpha@mailhost.test' }],
    passwordHash: 'test-hash',
    role: 'customer',
  })

  userB = await userModel.create({
    name: 'Bravo Player',
    email: 'bravo@mailhost.test',
    emailVerified: true,
    phone: '9000000002',
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: 'bravo@mailhost.test' }],
    passwordHash: 'test-hash',
    role: 'customer',
  })

  tokenA = await accessTokenGenerator({ userId: userA._id, role: userA.role })
  tokenB = await accessTokenGenerator({ userId: userB._id, role: userB.role })

  product = await productModel.create({
    name: 'Test Fuzz',
    slug: 'test-fuzz',
    sku: 'TEST-FUZZ-001',
    description: 'Fixture product for Phase 1 tests.',
    price: 1000,
    currency: 'INR',
    stock: 5,
    reservedStock: 0,
    status: 'active',
  })

  orderA = await orderModel.create({
    orderNumber: 'IP-TEST-A-0001',
    userId: userA._id,
    items: [
      {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: { amount: 1000, currency: 'INR' },
        total: { amount: 1000, currency: 'INR' },
      },
    ],
    pricing: { subtotal: 1000, shipping: 0, discount: 0, total: 1000, currency: 'INR' },
    customer: { name: 'Alpha Player', email: 'alpha@mailhost.test', phone: '9000000001' },
    shippingAddress: {
      name: 'Alpha Player',
      phone: '9000000001',
      addressLine1: '1 Test Street',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700001',
      country: 'India',
    },
    payment: { method: 'razorpay', status: 'pending' },
    orderStatus: 'pending',
  })

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
/* 1. GET /api/order/:id — owner only, 404 (not 403) for other users           */
/* ========================================================================== */

describe('GET /api/order/:orderId', () => {
  test('owner reads their own order, with line items and payment status', async () => {
    const res = await apiFetch(`/api/order/${orderA._id}`, { token: tokenA })

    assert.equal(res.status, 200)
    assert.equal(res.json.success, true)
    assert.equal(res.json.data.order._id, String(orderA._id))
    assert.equal(res.json.data.order.items.length, 1)
    assert.equal(res.json.data.order.items[0].quantity, 1)
    assert.equal(res.json.data.order.payment.status, 'pending')
    assert.equal(res.json.data.order.payment.method, 'razorpay')
  })

  test("user B gets 404 (never 403) for user A's order", async () => {
    const res = await apiFetch(`/api/order/${orderA._id}`, { token: tokenB })

    assert.equal(res.status, 404)
    assert.equal(res.json.success, false)
    assert.equal(res.json.message, 'Order not found.')
  })

  test('unknown-but-valid ObjectId also returns 404', async () => {
    const res = await apiFetch(`/api/order/${new mongoose.Types.ObjectId()}`, { token: tokenA })
    assert.equal(res.status, 404)
  })

  test('malformed id is rejected with 400', async () => {
    const res = await apiFetch('/api/order/not-an-object-id', { token: tokenA })
    assert.equal(res.status, 400)
  })

  test('missing token is 401', async () => {
    const res = await apiFetch(`/api/order/${orderA._id}`)
    assert.equal(res.status, 401)
  })

  test("list endpoint stays scoped to the caller (B cannot see A's order)", async () => {
    const res = await apiFetch('/api/order', { token: tokenB })
    assert.equal(res.status, 200)
    const ids = (res.json.data.orders ?? []).map((order) => String(order._id))
    assert.equal(ids.includes(String(orderA._id)), false)
  })
})

/* ========================================================================== */
/* 2. GET/PATCH /api/users/me                                                  */
/* ========================================================================== */

describe('/api/users/me', () => {
  test('GET returns the caller with phone + phoneVerified and no secrets', async () => {
    const res = await apiFetch('/api/users/me', { token: tokenA })

    assert.equal(res.status, 200)
    assert.equal(res.json.data.user.id, String(userA._id))
    assert.equal(res.json.data.user.email, 'alpha@mailhost.test')
    assert.equal(res.json.data.user.phone, '9000000001')
    assert.equal(typeof res.json.data.user.phoneVerified, 'boolean')
    assert.equal('passwordHash' in res.json.data.user, false)
    assert.equal('authProviders' in res.json.data.user, false)
    assert.equal('__v' in res.json.data.user, false)
  })

  test('GET does not leak another user (only the token subject is returned)', async () => {
    const res = await apiFetch('/api/users/me', { token: tokenB })
    assert.equal(res.json.data.user.id, String(userB._id))
  })

  test('PATCH name + phone updates and persists', async () => {
    const res = await apiFetch('/api/users/me', {
      method: 'PATCH',
      token: tokenA,
      body: { name: 'Alpha Renamed', phone: '9000000009' },
    })

    assert.equal(res.status, 200)
    assert.equal(res.json.data.user.name, 'Alpha Renamed')
    assert.equal(res.json.data.user.phone, '9000000009')

    const persisted = await userModel.findById(userA._id).lean()
    assert.equal(persisted.name, 'Alpha Renamed')
    assert.equal(persisted.phone, '9000000009')
  })

  test('PATCH rejects every privileged field (role, emailVerified, passwordHash, email, authProviders)', async () => {
    for (const forbidden of [
      { role: 'admin' },
      { emailVerified: true },
      { phoneVerified: true },
      { passwordHash: 'injected' },
      { email: 'attacker@mailhost.test' },
      { authProviders: [{ provider: 'google', providerId: 'evil' }] },
      { _id: new mongoose.Types.ObjectId().toString() },
    ]) {
      const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        token: tokenA,
        body: forbidden,
      })

      assert.equal(res.status, 400, `expected 400 for ${describeBodyKeys(forbidden)}`)
    }

    const persisted = await userModel.findById(userA._id).lean()
    assert.equal(persisted.role, 'customer')
    assert.equal(persisted.email, 'alpha@mailhost.test')
    assert.equal(persisted.passwordHash, 'test-hash')
  })

  test('PATCH mixing an allowed and a forbidden field is rejected wholesale', async () => {
    const res = await apiFetch('/api/users/me', {
      method: 'PATCH',
      token: tokenA,
      body: { name: 'Should Not Apply', role: 'admin' },
    })

    assert.equal(res.status, 400)

    const persisted = await userModel.findById(userA._id).lean()
    assert.equal(persisted.name, 'Alpha Renamed')
    assert.equal(persisted.role, 'customer')
  })

  test('PATCH with an empty body is rejected', async () => {
    const res = await apiFetch('/api/users/me', { method: 'PATCH', token: tokenA, body: {} })
    assert.equal(res.status, 400)
    assert.equal(res.json.code, 'NO_UPDATABLE_FIELDS')
  })

  test('PATCH to a phone already used by another account returns 409', async () => {
    const res = await apiFetch('/api/users/me', {
      method: 'PATCH',
      token: tokenA,
      body: { phone: '9000000002' },
    })

    assert.equal(res.status, 409)
    assert.equal(res.json.code, 'PHONE_IN_USE')
  })

  test('PATCH rejects an invalid phone format', async () => {
    const res = await apiFetch('/api/users/me', {
      method: 'PATCH',
      token: tokenA,
      body: { phone: '123' },
    })
    assert.equal(res.status, 400)
  })

  test('PATCH without a token is 401', async () => {
    const res = await apiFetch('/api/users/me', { method: 'PATCH', body: { name: 'Nope' } })
    assert.equal(res.status, 401)
  })
})

/* ========================================================================== */
/* 3. verify-email distinct codes                                              */
/* ========================================================================== */

describe('GET /api/auth/verify-email', () => {
  const makePending = async ({ email, token, tokenExpiry, registrationExpiry, phone }) => {
    await pendingRegistrationModel.create({
      name: 'Pending Player',
      email,
      passwordHash: 'test-hash',
      phone,
      addresses: [],
      verificationTokenHash: hashToken(token),
      verificationTokenExpiresAt: tokenExpiry,
      registrationExpiresAt: registrationExpiry,
    })
  }

  const newToken = () => crypto.randomBytes(32).toString('hex')
  const inFuture = (ms = 10 * 60 * 1000) => new Date(Date.now() + ms)
  const inPast = (ms = 10 * 60 * 1000) => new Date(Date.now() - ms)

  test('valid token: 200 EMAIL_VERIFIED and the account is created', async () => {
    const token = newToken()
    await makePending({
      email: 'verify-ok@mailhost.test',
      token,
      tokenExpiry: inFuture(),
      registrationExpiry: inFuture(30 * 60 * 1000),
      phone: '9000000011',
    })

    const res = await apiFetch(`/api/auth/verify-email?token=${token}`)

    assert.equal(res.status, 200)
    assert.equal(res.json.code, 'EMAIL_VERIFIED')

    const created = await userModel.findOne({ email: 'verify-ok@mailhost.test' }).lean()
    assert.equal(Boolean(created), true)
    assert.equal(created.emailVerified, true)
  })

  test('reused token: 400 EMAIL_TOKEN_INVALID', async () => {
    const token = newToken()
    await makePending({
      email: 'verify-reuse@mailhost.test',
      token,
      tokenExpiry: inFuture(),
      registrationExpiry: inFuture(30 * 60 * 1000),
      phone: '9000000012',
    })

    const first = await apiFetch(`/api/auth/verify-email?token=${token}`)
    assert.equal(first.status, 200)

    const second = await apiFetch(`/api/auth/verify-email?token=${token}`)
    assert.equal(second.status, 400)
    assert.equal(second.json.code, 'EMAIL_TOKEN_INVALID')
  })

  test('expired token: 410 EMAIL_TOKEN_EXPIRED', async () => {
    const token = newToken()
    await makePending({
      email: 'verify-expired@mailhost.test',
      token,
      tokenExpiry: inPast(),
      registrationExpiry: inFuture(30 * 60 * 1000),
      phone: '9000000013',
    })

    const res = await apiFetch(`/api/auth/verify-email?token=${token}`)

    assert.equal(res.status, 410)
    assert.equal(res.json.code, 'EMAIL_TOKEN_EXPIRED')
  })

  test('unknown token: 400 EMAIL_TOKEN_INVALID', async () => {
    const res = await apiFetch(`/api/auth/verify-email?token=${newToken()}`)
    assert.equal(res.status, 400)
    assert.equal(res.json.code, 'EMAIL_TOKEN_INVALID')
  })

  test('malformed token: 400 EMAIL_TOKEN_INVALID', async () => {
    const res = await apiFetch('/api/auth/verify-email?token=abcd')
    assert.equal(res.status, 400)
    assert.equal(res.json.code, 'EMAIL_TOKEN_INVALID')
  })

  test('email already has a verified account: 409 ACCOUNT_ALREADY_VERIFIED', async () => {
    const token = newToken()
    await makePending({
      email: 'alpha@mailhost.test',
      token,
      tokenExpiry: inFuture(),
      registrationExpiry: inFuture(30 * 60 * 1000),
      phone: '9000000014',
    })

    const res = await apiFetch(`/api/auth/verify-email?token=${token}`)

    assert.equal(res.status, 409)
    assert.equal(res.json.code, 'ACCOUNT_ALREADY_VERIFIED')
  })

  test('all four outcomes are distinguishable by (status, code)', async () => {
    const seen = new Set()

    const token = newToken()
    await makePending({
      email: 'verify-distinct@mailhost.test',
      token,
      tokenExpiry: inFuture(),
      registrationExpiry: inFuture(30 * 60 * 1000),
      phone: '9000000015',
    })
    seen.add('valid:200')

    const ok = await apiFetch(`/api/auth/verify-email?token=${token}`)
    assert.equal(ok.json.code, 'EMAIL_VERIFIED')

    const expiredToken = newToken()
    await makePending({
      email: 'verify-distinct-exp@mailhost.test',
      token: expiredToken,
      tokenExpiry: inPast(),
      registrationExpiry: inFuture(30 * 60 * 1000),
      phone: '9000000016',
    })
    const expired = await apiFetch(`/api/auth/verify-email?token=${expiredToken}`)
    seen.add(`expired:${expired.status}`)

    const invalid = await apiFetch(`/api/auth/verify-email?token=${newToken()}`)
    seen.add(`invalid:${invalid.status}`)

    const alreadyToken = newToken()
    await makePending({
      email: 'alpha@mailhost.test',
      token: alreadyToken,
      tokenExpiry: inFuture(),
      registrationExpiry: inFuture(30 * 60 * 1000),
      phone: '9000000017',
    })
    const already = await apiFetch(`/api/auth/verify-email?token=${alreadyToken}`)
    seen.add(`already:${already.status}`)

    assert.deepEqual([...seen].sort(), [
      'already:409',
      'expired:410',
      'invalid:400',
      'valid:200',
    ])
  })
})

/* ========================================================================== */
/* 4. Google callback always redirects (never JSON)                            */
/* ========================================================================== */

describe('GET /api/auth/google/callback', () => {
  const frontendOrigin = new URL(config.FRONTEND_URL).origin

  test('missing code redirects to /login?error=google_cancelled', async () => {
    const res = await apiFetch('/api/auth/google/callback')

    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), `${frontendOrigin}/login?error=google_cancelled`)
    assert.equal(res.headers.get('content-type')?.includes('application/json') ?? false, false)
    assert.equal(res.text.includes('accessToken'), false)
  })

  test('bad/absent state redirects to /login?error=google_state_invalid', async () => {
    const res = await apiFetch('/api/auth/google/callback?code=fake-code&state=fake-state')

    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), `${frontendOrigin}/login?error=google_state_invalid`)
  })

  test('redirect target host is never taken from query params (no open redirect)', async () => {
    for (const hostileState of [
      '//evil.example.net',
      'https://evil.example.net',
      '/\\evil.example.net',
      'https%3A%2F%2Fevil.example.net',
    ]) {
      const res = await apiFetch(
        `/api/auth/google/callback?code=fake-code&state=${encodeURIComponent(hostileState)}`
      )

      assert.equal(res.status, 302)
      const location = new URL(res.headers.get('location'))
      assert.equal(location.origin, frontendOrigin, `host changed for state=${hostileState}`)
    }
  })

  test('start endpoint targets Google with the configured redirect_uri', async () => {
    const res = await apiFetch('/api/auth/google')

    assert.equal(res.status, 302)
    const location = res.headers.get('location') ?? ''
    assert.equal(location.startsWith('https://accounts.google.com/'), true)

    const parsed = new URL(location)
    assert.equal(parsed.searchParams.get('redirect_uri'), config.GOOGLE_CALLBACK_URL)
    assert.equal(parsed.searchParams.get('client_id') !== null, true)
    assert.equal(parsed.searchParams.get('state') !== null, true)
    assert.equal((res.headers.get('set-cookie') ?? '').includes('oauth_state'), true)
  })
})

/* ========================================================================== */
/* 5. A rejected CORS origin must not be a 500                                 */
/* ========================================================================== */

describe('CORS', () => {
  test('allow-listed origin receives CORS headers', async () => {
    const res = await apiFetch('/api/definitely-not-a-route', {
      headers: { Origin: config.CORS_ORIGINS[0] },
    })

    assert.equal(res.status, 404)
    assert.equal(res.headers.get('access-control-allow-origin'), config.CORS_ORIGINS[0])
  })

  test('disallowed origin gets no CORS headers and is NOT a 500', async () => {
    const res = await apiFetch('/api/definitely-not-a-route', {
      headers: { Origin: 'http://evil.example.net' },
    })

    assert.notEqual(res.status, 500)
    assert.equal(res.headers.get('access-control-allow-origin'), null)
  })
})

/* ========================================================================== */
/* 6. Error responses never carry a stack trace                                */
/* ========================================================================== */

describe('error handler', () => {
  test('a parser error returns 4xx with no stack field', async () => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: '{ this is not valid json',
    })

    assert.equal(res.status >= 400 && res.status < 500, true)
    assert.equal(res.json && 'stack' in res.json, false)
  })

  test('a 404 response carries no stack field', async () => {
    const res = await apiFetch('/api/nope')
    assert.equal(res.status, 404)
    assert.equal('stack' in res.json, false)
  })
})
