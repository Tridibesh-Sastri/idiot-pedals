import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * compareAtPrice: an optional display-only "was" price.
 *
 * The invariant under test is that it is a real discount or nothing at all, and
 * that it can never leak into money arithmetic.
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
let adminToken
let userToken

let skuCounter = 0

const request = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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

const productBody = (overrides = {}) => {
  skuCounter += 1
  return {
    name: `Compare Pedal ${skuCounter}`,
    slug: `compare-pedal-${skuCounter}-${Date.now()}`,
    sku: `CMP-${Date.now()}-${skuCounter}`,
    description: 'Compare-at fixture product.',
    price: 2399,
    currency: 'INR',
    stock: 10,
    status: 'active',
    ...overrides,
  }
}

before(async () => {
  await mongoose.connect(testMongoUri)
  await mongoose.connection.dropDatabase()

  await Promise.all([userModel.init(), productModel.init(), orderModel.init()])

  const stamp = Date.now()
  const uniquePhone = (n) => String(9000000000 + n)

  const admin = await userModel.create({
    name: 'Compare Admin', email: `cmp-admin-${stamp}@mailhost.test`, emailVerified: true,
    phone: uniquePhone(1), phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: `cmp-admin-${stamp}@mailhost.test` }],
    passwordHash: 'x', role: 'admin',
  })

  const customer = await userModel.create({
    name: 'Compare Customer', email: `cmp-user-${stamp}@mailhost.test`, emailVerified: true,
    phone: uniquePhone(2), phoneVerified: false,
    authProviders: [{ provider: 'email', providerId: `cmp-user-${stamp}@mailhost.test` }],
    passwordHash: 'x', role: 'customer',
  })

  adminToken = await accessTokenGenerator({ userId: admin._id, role: 'admin' })
  userToken = await accessTokenGenerator({ userId: customer._id, role: 'customer' })

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

describe('compareAtPrice validation', () => {
  test('a valid compareAtPrice is stored and returned by list and detail', async () => {
    const created = await request('/api/products', {
      method: 'POST',
      token: adminToken,
      body: productBody({ price: 2399, compareAtPrice: 3499 }),
    })

    assert.equal(created.status, 201, created.text)
    assert.equal(created.json.data.product.price, 2399)
    assert.equal(created.json.data.product.compareAtPrice, 3499)

    const id = created.json.data.product._id

    const detail = await request(`/api/products/${id}`)
    assert.equal(detail.status, 200)
    assert.equal(detail.json.data.product.compareAtPrice, 3499)

    const list = await request('/api/products?limit=100')
    assert.equal(list.status, 200)
    const fromList = list.json.data.products.find((entry) => entry._id === id)
    assert.equal(fromList.compareAtPrice, 3499)
  })

  test('omitted compareAtPrice is absent or null, never invented', async () => {
    const created = await request('/api/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(),
    })

    assert.equal(created.status, 201, created.text)

    const value = created.json.data.product.compareAtPrice
    assert.equal(value === null || value === undefined, true, `got ${value}`)

    const detail = await request(`/api/products/${created.json.data.product._id}`)
    const detailValue = detail.json.data.product.compareAtPrice
    assert.equal(detailValue === null || detailValue === undefined, true, `got ${detailValue}`)
  })

  test('equal and lower compareAtPrice values are rejected with 400', async () => {
    const equal = await request('/api/products', {
      method: 'POST', token: adminToken,
      body: productBody({ price: 2399, compareAtPrice: 2399 }),
    })
    assert.equal(equal.status, 400)
    assert.match(JSON.stringify(equal.json), /Compare-at price must be greater/i)

    const lower = await request('/api/products', {
      method: 'POST', token: adminToken,
      body: productBody({ price: 2399, compareAtPrice: 1999 }),
    })
    assert.equal(lower.status, 400)
  })

  test('a fractional difference still counts as a real discount (paise comparison)', async () => {
    // 2399.001 is above 2399 in paise terms once rounded: 239900 vs 239900 -> not greater.
    const tooClose = await request('/api/products', {
      method: 'POST', token: adminToken,
      body: productBody({ price: 2399, compareAtPrice: 2399.001 }),
    })
    assert.equal(tooClose.status, 400)

    // A whole paise more is a real (if tiny) discount.
    const onePaisaMore = await request('/api/products', {
      method: 'POST', token: adminToken,
      body: productBody({ price: 2399, compareAtPrice: 2399.01 }),
    })
    assert.equal(onePaisaMore.status, 201, onePaisaMore.text)
  })

  test('non-numeric and negative values are rejected', async () => {
    // A numeric string and a negative are both transmittable, and both rejected.
    for (const compareAtPrice of ['3499', -1]) {
      const res = await request('/api/products', {
        method: 'POST', token: adminToken,
        body: productBody({ price: 2399, compareAtPrice }),
      })
      assert.equal(res.status, 400, `compareAtPrice=${String(compareAtPrice)} -> ${res.status}`)
    }
  })

  test('non-finite values are rejected at the model, where they can exist', async () => {
    /*
     * JSON.stringify(Infinity) is `null`, so a non-finite value cannot arrive over
     * HTTP — it is indistinguishable from "clear the field". The model rule is what
     * guards every other write path, so it is asserted directly.
     */
    for (const value of [Number.POSITIVE_INFINITY, Number.NaN]) {
      await assert.rejects(
        () => productModel.create(productBody({ price: 2399, compareAtPrice: value })),
        (error) => {
          assert.match(String(error.message), /finite|cast to number/i)
          return true
        }
      )
    }

    // Over HTTP those two become null: "no compare-at price", never a number.
    for (const value of [Number.POSITIVE_INFINITY, Number.NaN]) {
      const res = await request('/api/products', {
        method: 'POST', token: adminToken,
        body: productBody({ price: 2399, compareAtPrice: value }),
      })
      assert.equal(res.status, 201)
      const stored = res.json.data.product.compareAtPrice
      assert.equal(stored === null || stored === undefined, true, `got ${stored}`)
    }
  })

  test('PATCH rejects a compareAtPrice at or below the stored price', async () => {
    const created = await request('/api/products', {
      method: 'POST', token: adminToken,
      body: productBody({ price: 2399, compareAtPrice: 3499 }),
    })
    const id = created.json.data.product._id

    const equal = await request(`/api/products/${id}`, {
      method: 'PATCH', token: adminToken, body: { compareAtPrice: 2399 },
    })
    assert.equal(equal.status, 400)
    assert.match(JSON.stringify(equal.json), /Compare-at price must be greater/i)

    const lower = await request(`/api/products/${id}`, {
      method: 'PATCH', token: adminToken, body: { compareAtPrice: 1000 },
    })
    assert.equal(lower.status, 400)
  })

  test('PATCH rejects a price change that would leave price >= stored compareAtPrice', async () => {
    const created = await request('/api/products', {
      method: 'POST', token: adminToken,
      body: productBody({ price: 2399, compareAtPrice: 3499 }),
    })
    const id = created.json.data.product._id

    const equal = await request(`/api/products/${id}`, {
      method: 'PATCH', token: adminToken, body: { price: 3499 },
    })
    assert.equal(equal.status, 400)
    assert.match(JSON.stringify(equal.json), /Compare-at price must be greater/i)

    const above = await request(`/api/products/${id}`, {
      method: 'PATCH', token: adminToken, body: { price: 4000 },
    })
    assert.equal(above.status, 400)

    // Still stored unchanged after the rejections.
    const stored = await productModel.findById(id).lean()
    assert.equal(stored.price, 2399)
    assert.equal(stored.compareAtPrice, 3499)

    // A price that keeps the discount valid is fine.
    const ok = await request(`/api/products/${id}`, {
      method: 'PATCH', token: adminToken, body: { price: 2499 },
    })
    assert.equal(ok.status, 200, ok.text)
    assert.equal(ok.json.data.product.price, 2499)
    assert.equal(ok.json.data.product.compareAtPrice, 3499)
  })

  test('PATCH accepts null to clear it, and a higher value to raise it', async () => {
    const created = await request('/api/products', {
      method: 'POST', token: adminToken,
      body: productBody({ price: 2399, compareAtPrice: 3499 }),
    })
    const id = created.json.data.product._id

    const raised = await request(`/api/products/${id}`, {
      method: 'PATCH', token: adminToken, body: { compareAtPrice: 3999 },
    })
    assert.equal(raised.status, 200, raised.text)
    assert.equal(raised.json.data.product.compareAtPrice, 3999)

    const cleared = await request(`/api/products/${id}`, {
      method: 'PATCH', token: adminToken, body: { compareAtPrice: null },
    })
    assert.equal(cleared.status, 200, cleared.text)
    assert.equal(cleared.json.data.product.compareAtPrice === null || cleared.json.data.product.compareAtPrice === undefined, true)

    const stored = await productModel.findById(id).lean()
    assert.equal(stored.compareAtPrice, null)
  })

  test('no token 401 and a normal user 403, for both create and patch', async () => {
    const product = await productModel.create(productBody({ price: 2399 }))

    const createAnonymous = await request('/api/products', { method: 'POST', body: productBody({ compareAtPrice: 3499 }) })
    assert.equal(createAnonymous.status, 401)

    const createAsUser = await request('/api/products', { method: 'POST', token: userToken, body: productBody({ compareAtPrice: 3499 }) })
    assert.equal(createAsUser.status, 403)

    const patchAnonymous = await request(`/api/products/${product._id}`, { method: 'PATCH', body: { compareAtPrice: 3499 } })
    assert.equal(patchAnonymous.status, 401)

    const patchAsUser = await request(`/api/products/${product._id}`, { method: 'PATCH', token: userToken, body: { compareAtPrice: 3499 } })
    assert.equal(patchAsUser.status, 403)

    // Untouched by the rejected attempts.
    const stored = await productModel.findById(product._id).lean()
    assert.equal(stored.compareAtPrice, null)
  })
})

describe('compareAtPrice never touches money', () => {
  test('order totals use price only, even with a compareAtPrice set', async () => {
    const created = await request('/api/products', {
      method: 'POST', token: adminToken,
      body: productBody({ name: 'Discounted Pedal', price: 2399, compareAtPrice: 3499, stock: 5 }),
    })
    assert.equal(created.status, 201, created.text)
    const product = created.json.data.product

    // Order two of them: 2 x 2399.00 = 4798.00 = 479800 paise.
    const order = await request('/api/order', {
      method: 'POST', token: userToken,
      body: {
        items: [{ productId: product._id, quantity: 2 }],
        paymentMethod: 'razorpay',
        customer: { name: 'Compare Customer', email: 'cmp@mailhost.test', phone: '9000000002' },
        shippingAddress: {
          name: 'Compare Customer', phone: '9000000002', addressLine1: '1 Compare Street',
          city: 'Kolkata', state: 'West Bengal', postalCode: '700001', country: 'India',
        },
      },
    })

    assert.equal(order.status, 201, order.text)

    const stored = await orderModel.findById(order.json.order._id).lean()

    // price only: never compareAtPrice (which would be 699800 for two).
    assert.equal(stored.items[0].unitPrice.amount, 2399)
    assert.equal(stored.items[0].unitPrice.amountMinor, 239900)
    assert.equal(stored.items[0].total.amountMinor, 479800)
    assert.equal(stored.pricing.subtotalMinor, 479800)
    assert.equal(stored.pricing.totalMinor, 479800)
    assert.notEqual(stored.pricing.totalMinor, 699800)

    // Stock behaves as usual: two units reserved, none consumed yet.
    const after = await productModel.findById(product._id).lean()
    assert.equal(after.stock, 5)
    assert.equal(after.reservedStock, 2)
  })
})
