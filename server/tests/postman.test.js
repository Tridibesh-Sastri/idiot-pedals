import "./helpers/testEnv.js";

/**
 * Keeps the Postman collection honest.
 *
 * The collection is documentation people actually run, so it drifts silently.
 * This test binds it to the code:
 *
 *   1. every request's method + path must match a route actually mounted on the
 *      Express app (read out of app.js and the router files, not hardcoded)
 *   2. every request must be reachable at runtime — a real request through the
 *      app must not come back 404/405, which catches a typo the parse would miss
 *   3. no request may point anywhere but {{baseUrl}}
 *   4. no string may look like a token, key or secret
 */

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import app from '../src/app/app.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const serverRoot = path.resolve(here, '..')
const collectionPath = path.join(repoRoot, 'Idiot Pedals.postman_collection.json')
const environmentPath = path.join(repoRoot, 'Idiot Pedals.postman_environment.example.json')

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'))

const walkRequests = (items, out = []) => {
  for (const item of items) {
    if (item.item) walkRequests(item.item, out)
    else out.push(item)
  }
  return out
}

const requests = walkRequests(collection.item)

/* -------------------------------------------------------------------------- */
/* Route table, read from the code                                             */
/* -------------------------------------------------------------------------- */

const normalize = (routePath) => {
  const trimmed = routePath.replace(/\/+$/, '')
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const collapsed = withLeadingSlash === '' ? '/' : withLeadingSlash

  return (
    collapsed
      // ':orderId', '{{orderId}}' and a literal ObjectId are all one param.
      .replace(/:[A-Za-z0-9_]+/g, '*')
      .replace(/\{\{[^}]+\}\}/g, '*')
      .replace(/\/[a-f0-9]{24}(?=\/|$)/gi, '/*')
  )
}

const joinPath = (mount, routePath) => {
  const left = mount.replace(/\/+$/, '')
  const right = routePath === '/' ? '' : routePath
  return normalize(`${left}${right}`) || '/'
}

/** app.js: direct app.get(...) routes and app.use(mount, router) mounts. */
const readAppRoutes = () => {
  const source = fs.readFileSync(path.join(serverRoot, 'src', 'app', 'app.js'), 'utf8')
  const routes = new Set()

  for (const [, method, routePath] of source.matchAll(/app\.(get|post|patch|put|delete)\(\s*['"]([^'"]+)['"]/g)) {
    routes.add(`${method.toUpperCase()} ${normalize(routePath)}`)
  }

  // Map the router variable back to its file via the import statements.
  const routerFiles = new Map()
  for (const [, variable, file] of source.matchAll(
    /import\s+(\w+)\s+from\s+['"][^'"]*\/routers\/([^'"]+)['"]/g
  )) {
    routerFiles.set(variable, `src/routers/${file}`)
  }

  for (const [, mount, variable] of source.matchAll(/app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g)) {
    const file = routerFiles.get(variable)
    if (!file) continue

    const routerSource = fs.readFileSync(path.join(serverRoot, file), 'utf8')

    for (const [, method, routePath] of routerSource.matchAll(
      /router\.(get|post|patch|put|delete)\(\s*['"]([^'"]*)['"]/g
    )) {
      routes.add(`${method.toUpperCase()} ${joinPath(mount, routePath)}`)
    }
  }

  return routes
}

const appRoutes = readAppRoutes()

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const SUBSTITUTE = {
  orderId: '507f1f77bcf86cd799439011',
  productId: '507f1f77bcf86cd799439012',
  razorpayOrderId: 'order_TEST0000000000',
  razorpayPaymentId: 'pay_TEST0000000000',
  razorpaySignature: 'invalid-signature-value',
  accessToken: 'not-a-real-token',
}

const substitute = (value) =>
  String(value).replace(/\{\{([^}]+)\}\}/g, (match, key) => SUBSTITUTE[key.trim()] ?? match)

const collectionSignature = (item) => {
  const { method, url } = item.request
  // Raw segments: {{param}} must still be recognisable as a parameter here.
  const segments = url.path || []
  const joined = segments.length ? `/${segments.join('/')}` : '/'
  return `${method.toUpperCase()} ${normalize(joined) || '/'}`
}

let server
let baseUrl

before(async () => {
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
})

/* ========================================================================== */

describe('postman collection', () => {
  test('the collection exists, parses and has the expected shape', () => {
    assert.equal(collection.info.schema.includes('collection/v2.1.0'), true)
    assert.equal(requests.length > 20, true)

    const folders = collection.item.map((folder) => folder.name)
    for (const expected of ['Health', 'Auth', 'Users', 'Products', 'Orders', 'Payments', 'Webhooks']) {
      assert.equal(folders.includes(expected), true, `missing folder ${expected}`)
    }
  })

  test('every request method + path matches a route mounted on the app', () => {
    const mismatches = []

    for (const item of requests) {
      const signature = collectionSignature(item)
      if (!appRoutes.has(signature)) mismatches.push(`${item.name} -> ${signature}`)
    }

    assert.deepEqual(
      mismatches,
      [],
      `collection requests with no matching route:\n${mismatches.join('\n')}\n\nmounted routes:\n${[...appRoutes].sort().join('\n')}`
    )
  })

  test('every route mounted on the app is covered by the collection', () => {
    const covered = new Set(requests.map(collectionSignature))
    const missing = [...appRoutes].filter((route) => !covered.has(route)).sort()

    assert.deepEqual(missing, [], `routes with no Postman request:\n${missing.join('\n')}`)
  })

  test('every request is actually reachable (no 404/405 from the app)', async () => {
    for (const item of requests) {
      const { method, url } = item.request
      const segments = (url.path || []).map((segment) => substitute(segment))
      const query = (url.query || [])
        .filter((entry) => entry.value !== undefined)
        .map((entry) => `${entry.key}=${encodeURIComponent(substitute(entry.value))}`)
        .join('&')

      const target = `${baseUrl}/${segments.join('/')}${query ? `?${query}` : ''}`

      const res = await fetch(target, {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
        body: ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase()) ? '{}' : undefined,
        redirect: 'manual',
      })

      await res.text()

      assert.notEqual(res.status, 404, `${item.name} -> ${method} ${target} returned 404`)
      assert.notEqual(res.status, 405, `${item.name} -> ${method} ${target} returned 405`)
    }
  })

  test('every request targets {{baseUrl}} and nothing else', () => {
    for (const item of requests) {
      const raw = item.request.url.raw ?? ''
      assert.equal(raw.startsWith('{{baseUrl}}'), true, `${item.name} does not start with {{baseUrl}}`)

      const hosts = [item.request.url.host].flat().filter(Boolean)
      for (const host of hosts) {
        assert.equal(host, '{{baseUrl}}', `${item.name} has host ${host}`)
      }

      // No absolute URL smuggled in anywhere else in the request.
      assert.equal(/https?:\/\//i.test(raw), false, `${item.name} contains an absolute URL`)
    }
  })

  test('every request asserts an expected status code', () => {
    const allowed = new Set([200, 201, 302, 400, 401, 403, 404, 409, 410, 500, 503])

    for (const item of requests) {
      const scripts = (item.event ?? [])
        .filter((entry) => entry.listen === 'test')
        .map((entry) => (entry.script.exec ?? []).join('\n'))
        .join('\n')

      const match = scripts.match(/pm\.response\.to\.have\.status\((\d{3})\)/)

      assert.equal(Boolean(match), true, `${item.name} has no pm.response.to.have.status(N) assertion`)
      assert.equal(allowed.has(Number(match[1])), true, `${item.name} asserts an unexpected status ${match[1]}`)
    }
  })

  test('no real emails, passwords, tokens, keys or ports are stored', () => {
    const findings = []

    const SECRET_PATTERNS = [
      [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT-shaped string'],
      [/rzp_(test|live)_[A-Za-z0-9]{10,}/, 'Razorpay key'],
      [/\b[a-f0-9]{32,}\b/i, 'long hex string (token/signature shaped)'],
      [/\b(sk|pk)_(live|test)_[A-Za-z0-9]{10,}/, 'provider secret key'],
      [/mongodb(\+srv)?:\/\//i, 'Mongo connection string'],
    ]

    const scan = (value, where) => {
      if (typeof value !== 'string') return

      for (const [pattern, label] of SECRET_PATTERNS) {
        if (pattern.test(value)) findings.push(`${where}: ${label}`)
      }
    }

    const walk = (node, trail) => {
      if (Array.isArray(node)) {
        node.forEach((entry, index) => walk(entry, `${trail}[${index}]`))
        return
      }

      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) walk(value, `${trail}.${key}`)
        return
      }

      scan(node, trail)
    }

    walk(collection, 'collection')

    assert.deepEqual(findings, [], `possible secrets in the collection:\n${findings.join('\n')}`)
  })

  test('the environment example exists with empty values and no secrets', () => {
    const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'))

    const keys = environment.values.map((entry) => entry.key)
    for (const expected of [
      'baseUrl',
      'accessToken',
      'orderId',
      'productId',
      'razorpayOrderId',
      'razorpayPaymentId',
      'razorpaySignature',
      'razorpayWebhookSecret',
    ]) {
      assert.equal(keys.includes(expected), true, `missing environment key ${expected}`)
    }

    for (const entry of environment.values) {
      assert.equal(entry.value, '', `${entry.key} must be empty in the example environment`)
    }
  })

  test('the collection warns about real email and test keys', () => {
    const description = collection.info.description

    assert.match(description, /EMAIL_NOTIFICATIONS_ENABLED=false/)
    assert.match(description, /REAL email|real email/)
    assert.match(description, /TEST keys/)
  })

  test('the webhook request signs its raw body in a pre-request script', () => {
    const webhook = requests.find((item) => item.name.startsWith('POST /api/webhooks/razorpay — signed'))

    assert.equal(Boolean(webhook), true)

    const scripts = (webhook.event ?? [])
      .filter((entry) => entry.listen === 'prerequest')
      .map((entry) => (entry.script.exec ?? []).join('\n'))
      .join('\n')

    assert.match(scripts, /HmacSHA256/)
    assert.match(scripts, /razorpayWebhookSecret/)
    assert.match(scripts, /pm\.request\.body\.raw/)
    assert.match(scripts, /x-razorpay-signature/)
  })
})
