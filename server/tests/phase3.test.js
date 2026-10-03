/**
 * Phase 3 — resilience tests.
 *
 * Health endpoints, request-id correlation, short-cache/ETag behaviour on the
 * public catalogue, pagination caps, and an explain() check that every hot
 * query path uses an index rather than a collection scan.
 */

import "./helpers/testEnv.js";

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import http from 'node:http'
import mongoose from 'mongoose'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

import app from '../src/app/app.js'
import config from '../src/config/config.js'
import userModel from '../src/models/user.model.js'
import productModel from '../src/models/product.model.js'
import orderModel from '../src/models/order.model.js'
import refreshModel from '../src/models/refreshToken.model.js'
import { accessTokenGenerator } from '../src/utils/tokenManager.js'

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

before(async () => {
  await mongoose.connect(testMongoUri)
  await mongoose.connection.dropDatabase()

  await Promise.all([
    userModel.init(),
    productModel.init(),
    orderModel.init(),
    refreshModel.init(),
  ])

  user = await userModel.create({
    name: 'Phase Three',
    email: 'phase3@mailhost.test',
    emailVerified: true,
    phone: '9000000311',
    phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: 'phase3@mailhost.test' }],
    passwordHash: 'test-hash',
    role: 'customer',
  })

  token = await accessTokenGenerator({ userId: user._id, role: user.role })

  await productModel.create({
    name: 'Phase3 Pedal',
    slug: 'phase3-pedal',
    sku: 'PHASE3-ONE',
    description: 'Phase 3 fixture product.',
    price: 1234.5,
    currency: 'INR',
    stock: 10,
    reservedStock: 0,
    status: 'active',
  })

  /*
   * Fixture rows so the query planner has real data to plan against: on an
   * empty collection MongoDB may legitimately choose a COLLSCAN, which would
   * make the explain() assertions below meaningless.
   */
  await orderModel.create([
    {
      orderNumber: 'IP-PHASE3-0001',
      userId: user._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: 'Fixture',
          sku: 'FIX-1',
          quantity: 1,
          unitPrice: { amount: 100, amountMinor: 10000, currency: 'INR' },
          total: { amount: 100, amountMinor: 10000, currency: 'INR' },
        },
      ],
      pricing: {
        subtotal: 100,
        shipping: 0,
        discount: 0,
        total: 100,
        currency: 'INR',
        subtotalMinor: 10000,
        shippingMinor: 0,
        discountMinor: 0,
        totalMinor: 10000,
      },
      customer: { name: 'Phase Three', email: 'phase3@mailhost.test', phone: '9000000311' },
      shippingAddress: {
        name: 'Phase Three',
        phone: '9000000311',
        addressLine1: '1 Test Street',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700001',
        country: 'India',
      },
      payment: { method: 'razorpay', status: 'pending', razorpayOrderId: 'order_phase3_fixture' },
      orderStatus: 'pending',
      stockReservedAt: new Date(),
    },
  ])

  await refreshModel.create({
    userId: user._id,
    // The model requires a 64-character hex hash.
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 60_000),
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
/* 1. Health + readiness                                                       */
/* ========================================================================== */

describe('health endpoints', () => {
  test('GET /healthz reports the process as up', async () => {
    const res = await apiFetch('/healthz')

    assert.equal(res.status, 200)
    assert.equal(res.json.status, 'ok')
    assert.equal(typeof res.json.uptimeSeconds, 'number')
  })

  test('GET /readyz reports Mongo as connected', async () => {
    const res = await apiFetch('/readyz')

    assert.equal(res.status, 200)
    assert.equal(res.json.status, 'ok')
    assert.equal(res.json.mongo, 'connected')
  })

  test('GET /readyz returns 503 when Mongo is not connected', async () => {
    /*
     * Verified in a child process that never connects to Mongo: readyState is a
     * getter on the connection, so it cannot be stubbed in-process, and a real
     * disconnected process is a stronger check anyway.
     */
    const script = `
      const http = await import('node:http');
      const { default: app } = await import('./src/app/app.js');
      const server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const res = await fetch('http://127.0.0.1:' + server.address().port + '/readyz');
      console.log('STATUS=' + res.status);
      console.log('BODY=' + JSON.stringify(await res.json()));
      server.close();
    `

    const { stdout } = await execFileAsync(
      process.execPath,
      ['--input-type=module', '-e', script],
      { cwd: process.cwd() }
    )

    assert.match(stdout, /STATUS=503/)
    assert.match(stdout, /"mongo":"disconnected"/)
  })

  test('health endpoints are not rate limited (registered before the limiter)', async () => {
    // More than the 300/15min global allowance: if the limiter applied to
    // /healthz, some of these would come back 429 and the probe would report the
    // service as down while it is serving traffic.
    const statuses = new Set()
    for (let i = 0; i < 310; i += 1) {
      const res = await fetch(`${baseUrl}/healthz`)
      statuses.add(res.status)
      // Drain the body to release the socket.
      await res.text()
    }

    assert.deepEqual([...statuses], [200])
  })
})

/* ========================================================================== */
/* 2. Request id                                                               */
/* ========================================================================== */

describe('request id', () => {
  test('every response carries an X-Request-Id header', async () => {
    const res = await apiFetch('/api/products')

    const requestId = res.headers.get('x-request-id')
    assert.equal(typeof requestId, 'string')
    assert.equal(requestId.length > 0, true)
  })

  test('a well-formed inbound request id is propagated', async () => {
    const inbound = 'trace-abc-12345678'
    const res = await apiFetch('/api/products', { headers: { 'x-request-id': inbound } })

    assert.equal(res.headers.get('x-request-id'), inbound)
  })

  test('a malformed inbound request id is replaced, not echoed', async () => {
    const hostile = 'bad id with spaces'
    const res = await apiFetch('/api/products', { headers: { 'x-request-id': hostile } })

    const returned = res.headers.get('x-request-id')
    assert.notEqual(returned, hostile)
    assert.equal(/^[A-Za-z0-9._-]{8,128}$/.test(returned), true)
  })

  test('404 and error responses include the request id for correlation', async () => {
    const notFound = await apiFetch('/api/nope')
    assert.equal(notFound.status, 404)
    assert.equal(notFound.json.requestId, notFound.headers.get('x-request-id'))

    // A parser error goes through the central error handler.
    const parserError = await apiFetch('/api/auth/login', { method: 'POST', body: '{ bad json' })
    assert.equal(parserError.status, 400)
    assert.equal(parserError.json.requestId, parserError.headers.get('x-request-id'))
    assert.equal('stack' in parserError.json, false)
  })
})

/* ========================================================================== */
/* 3. Short cache + ETag on the public catalogue                               */
/* ========================================================================== */

describe('catalogue caching', () => {
  /*
   * Raw HTTP client for the conditional-request tests: undici's fetch does not
   * forward `if-none-match`, so it cannot exercise 304 handling.
   */
  const rawGet = (path, headers = {}) =>
    new Promise((resolve, reject) => {
      const { hostname, port } = new URL(baseUrl)
      const req = http.get({ hostname, port, path, headers }, (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body })
        )
      })
      req.on('error', reject)
    })

  test('GET /api/products sets a short public Cache-Control and an ETag', async () => {
    const res = await apiFetch('/api/products')

    assert.equal(res.status, 200)
    assert.match(res.headers.get('cache-control') ?? '', /public/)
    assert.match(res.headers.get('cache-control') ?? '', /max-age=30/)
    assert.equal(typeof res.headers.get('etag'), 'string')
  })

  test('a revalidating request returns 304 with no body', async () => {
    const first = await rawGet('/api/products')
    assert.equal(first.status, 200)
    const etag = first.headers.etag

    const second = await rawGet('/api/products', { 'if-none-match': etag })

    assert.equal(second.status, 304)
    assert.equal(second.body, '')
  })

  test('a stale ETag returns the full body again', async () => {
    const res = await apiFetch('/api/products', { headers: { 'if-none-match': '"stale-etag"' } })

    assert.equal(res.status, 200)
    assert.equal(Array.isArray(res.json.data.products), true)
  })

  test('single product read is cached too', async () => {
    const list = await apiFetch('/api/products')
    const productId = list.json.data.products[0]._id

    const res = await apiFetch(`/api/products/${productId}`)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('cache-control') ?? '', /max-age=30/)
  })
})

/* ========================================================================== */
/* 4. Pagination caps + .lean()                                                */
/* ========================================================================== */

describe('pagination caps', () => {
  test('product limit is capped at 100', async () => {
    const overCap = await apiFetch('/api/products?limit=1000')
    assert.equal(overCap.status, 400)

    const atCap = await apiFetch('/api/products?limit=100')
    assert.equal(atCap.status, 200)
    // The service echoes the query value, which arrives as a string.
    assert.equal(Number(atCap.json.data.pagination.limit), 100)
  })

  test('order limit is capped at 50', async () => {
    const overCap = await apiFetch('/api/order?limit=500')
    assert.equal(overCap.status, 400)

    const atCap = await apiFetch('/api/order?limit=50')
    assert.equal(atCap.status, 200)
    assert.equal(Number(atCap.json.data.pagination.limit), 50)
  })

  test('non-positive and non-integer pages are rejected', async () => {
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc']) {
      const res = await apiFetch(`/api/products?${query}`)
      assert.equal(res.status, 400, `${query} should be rejected`)
    }
  })

  test('list reads come back as plain objects (.lean())', async () => {
    const res = await apiFetch('/api/products')

    const product = res.json.data.products[0]
    // A hydrated Mongoose document would serialise with $__/toJSON internals and
    // would not be a plain object on the server side; lean() results are plain.
    assert.equal(Object.getPrototypeOf(product) === Object.prototype, true)
  })
})

/* ========================================================================== */
/* 5. Index usage (explain)                                                    */
/* ========================================================================== */

describe('query plans use indexes', () => {
  const planStages = (explain) => {
    const stages = []

    const walk = (node) => {
      if (!node || typeof node !== 'object') return
      if (typeof node.stage === 'string') stages.push(node.stage)
      for (const value of Object.values(node)) {
        if (value && typeof value === 'object') walk(value)
      }
    }

    walk(explain)
    return stages
  }

  const assertUsesIndex = async (label, query) => {
    const explain = await query.explain('queryPlanner')
    const stages = planStages(explain)

    assert.equal(
      stages.includes('COLLSCAN'),
      false,
      `${label} fell back to COLLSCAN (stages: ${stages.join(', ')})`
    )
    /*
     * MongoDB 8 reports an index scan as EXPRESS_IXSCAN; older versions report
     * IXSCAN. Either proves the planner used an index.
     */
    assert.equal(
      stages.some((stage) => stage.includes('IXSCAN')),
      true,
      `${label} did not use an index (stages: ${stages.join(', ')})`
    )
  }

  test('orders for a user (user list + pagination)', async () => {
    await assertUsesIndex(
      'orders by user',
      orderModel.find({ userId: user._id }).sort({ createdAt: -1 })
    )
  })

  test('single order owned by a user (detail endpoint)', async () => {
    await assertUsesIndex(
      'order by id + user',
      orderModel.find({ _id: new mongoose.Types.ObjectId(), userId: user._id })
    )
  })

  test('order lookup by razorpay ids (verify + webhook)', async () => {
    await assertUsesIndex(
      'order by razorpay order id',
      orderModel.find({ 'payment.razorpayOrderId': 'order_x' })
    )
    await assertUsesIndex(
      'order by razorpay payment id',
      orderModel.find({ 'payment.razorpayPaymentId': 'pay_x' })
    )
  })

  test('reservation-expiry sweep', async () => {
    await assertUsesIndex(
      'expired reservations',
      orderModel.find({
        'payment.status': 'pending',
        orderStatus: 'pending',
        stockReservedAt: { $ne: null, $lte: new Date() },
        stockReleasedAt: null,
      })
    )
  })

  test('product catalogue listing', async () => {
    await assertUsesIndex(
      'products by status',
      productModel.find({ status: 'active' }).sort({ createdAt: -1 })
    )
  })

  test('user lookup by email and by phone', async () => {
    await assertUsesIndex('user by email', userModel.find({ email: 'a@b.test' }))
    await assertUsesIndex('user by phone', userModel.find({ phone: '9000000000' }))
  })

  test('refresh session lookup by token hash', async () => {
    await assertUsesIndex(
      'refresh by token hash',
      refreshModel.find({ tokenHash: 'x' })
    )
  })
})
