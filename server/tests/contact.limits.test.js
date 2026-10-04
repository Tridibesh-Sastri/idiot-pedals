import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * Contact form abuse limits (POST /api/contact).
 *
 * The contact limiters read config live (not captured at import), so each
 * test below pins the two uninvolved caps high and hammers the third. This
 * keeps every assertion deterministic regardless of file order.
 * Functional coverage lives in contact.test.js.
 */

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import app from '../src/app/app.js'
import config from '../src/config/config.js'

void fakeRazorpay

let server
let baseUrl

const postContact = async (body) => {
  const res = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

let emailCounter = 0
const validBody = (email) => ({
  name: 'Limit Tester',
  email: email ?? `limit-${Date.now()}-${(emailCounter += 1)}@mailhost.test`,
  subject: 'technical',
  message: 'Does the Neon Fuzz Box play well after a buffered tuner?',
})

const REAL_LIMITS = {
  CONTACT_RATE_IP_MAX: config.CONTACT_RATE_IP_MAX,
  CONTACT_RATE_EMAIL_MAX: config.CONTACT_RATE_EMAIL_MAX,
  CONTACT_RATE_DAILY_MAX: config.CONTACT_RATE_DAILY_MAX,
}

before(async () => {
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  config.CONTACT_RATE_IP_MAX = REAL_LIMITS.CONTACT_RATE_IP_MAX
  config.CONTACT_RATE_EMAIL_MAX = REAL_LIMITS.CONTACT_RATE_EMAIL_MAX
  config.CONTACT_RATE_DAILY_MAX = REAL_LIMITS.CONTACT_RATE_DAILY_MAX

  if (server) await new Promise((resolve) => server.close(resolve))
})

describe('contact abuse limits', () => {
  /*
   * All three limiters count every POST in this process, so the tests below
   * are ordered and budgeted against cumulative hits. Per-test config pins
   * the two uninvolved caps high; real defaults are restored in after().
   */

  test('daily cap trips with its own message once lowered', async () => {
    config.CONTACT_RATE_IP_MAX = 1000
    config.CONTACT_RATE_EMAIL_MAX = 1000
    config.CONTACT_RATE_DAILY_MAX = 2

    try {
      const first = await postContact(validBody())
      assert.equal(first.status, 200, first.text)

      const second = await postContact(validBody())
      assert.equal(second.status, 200, second.text)

      const third = await postContact(validBody())
      assert.equal(third.status, 429, third.text)
      assert.match(third.json?.message ?? '', /today/i)
    } finally {
      config.CONTACT_RATE_DAILY_MAX = REAL_LIMITS.CONTACT_RATE_DAILY_MAX
    }
    // Cumulative hits so far — IP: 3, daily: 3.
  })

  test('per-email limiter trips on the 4th message from one address', async () => {
    config.CONTACT_RATE_IP_MAX = 1000
    config.CONTACT_RATE_EMAIL_MAX = 3
    config.CONTACT_RATE_DAILY_MAX = 1000

    const email = `repeat-${Date.now()}@mailhost.test`
    let last = null

    for (let attempt = 0; attempt < 4; attempt += 1) {
      last = await postContact(validBody(email))
      if (attempt < 3) assert.equal(last.status, 200, last.text)
    }

    assert.equal(last.status, 429, last.text)
    assert.match(last.json?.message ?? '', /from this address/i)
    // Cumulative hits so far — IP: 7, daily: 7.
  })

  test('per-IP limiter trips once the shared budget is spent', async () => {
    config.CONTACT_RATE_IP_MAX = 8
    config.CONTACT_RATE_EMAIL_MAX = 1000
    config.CONTACT_RATE_DAILY_MAX = 1000

    // 7 prior hits + 1 = 8/8 passes; the next one trips.
    const first = await postContact(validBody())
    assert.equal(first.status, 200, first.text)

    const second = await postContact(validBody())
    assert.equal(second.status, 429, second.text)
    assert.match(second.json?.message ?? '', /too many messages\. please try again later\./i)
  })
})
