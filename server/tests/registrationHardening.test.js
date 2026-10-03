import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * Verification-flow hardening: per-email cooldown, resend endpoint, mail
 * hardening, password byte rule, address validation.
 *
 * Same harness shape as the other HTTP suites (own process, own rate-limiter
 * budgets, own database): register/verify/resend are public endpoints, so no
 * auth fixtures are needed. HTTP budgets per file process: at most 5 register
 * POSTs and 5 resend POSTs here (the per-IP limiter allows 5 each) — pure
 * unit tests cover everything count-shaped beyond that.
 *
 *   node --test --test-concurrency=1 tests/registrationHardening.test.js
 */

import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import mongoose from 'mongoose'

import app from '../src/app/app.js'
import config from '../src/config/config.js'
import pendingRegistrationModel from '../src/models/pendingRegistration.js'
import { verificationSendDecision } from '../src/controllers/auth.controller.js'
import {
  clearSentMessages,
  getSentMessagesOfKind,
} from '../src/services/mailer.service.js'

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

const apiFetch = async (path, { method = 'GET', body } = {}) => {
  const headers = {}
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

let emailCounter = 0
const registerBody = (overrides = {}) => {
  emailCounter += 1
  // Unique valid Indian mobile per call: verified users keep their number
  // (phone is uniquely indexed), so reuse across tests would collide.
  const phone = String(9000000000 + emailCounter)
  return {
    name: 'Cooldown Tester',
    email: `cooldown-${Date.now()}-${emailCounter}@mailhost.test`,
    phone,
    password: 'Correct#12345',
    addresses: [
      {
        label: 'Home',
        name: 'Cooldown Tester',
        phone: '9876543210',
        addressLine1: '1 Test Street',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700001',
        country: 'India',
      },
    ],
    ...overrides,
  }
}

const extractToken = (text) => {
  const match = String(text ?? '').match(/verify-email\?token=([a-f0-9]{64})/i)
  assert.ok(match, 'no verification token in the recorded mail')
  return match[1]
}

before(async () => {
  await mongoose.connect(testMongoUri)
  await mongoose.connection.dropDatabase()

  await Promise.all([pendingRegistrationModel.init()])

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
/* 1. Per-email cooldown on register                                            */
/* ========================================================================== */

describe('register cooldown', () => {
  test('re-register inside the cooldown sends no mail and keeps the old token valid', async () => {
    clearSentMessages()
    const body = registerBody()

    const first = await apiFetch('/api/auth/register', { method: 'POST', body })
    assert.equal(first.status, 200, first.text)
    assert.equal(first.json.retryAfterSeconds, undefined)

    const second = await apiFetch('/api/auth/register', { method: 'POST', body })
    assert.equal(second.status, 200, second.text)
    assert.ok(
      second.json.retryAfterSeconds > 0 && second.json.retryAfterSeconds <= 60,
      `expected a retry countdown, got ${JSON.stringify(second.json)}`
    )

    // Exactly one verification mail went out, for the first attempt.
    const mails = getSentMessagesOfKind('email-verification')
    assert.equal(mails.length, 1)

    // The earlier link still verifies: nothing was rotated.
    const token = extractToken(mails[0].text)
    const verified = await apiFetch(`/api/auth/verify-email?token=${token}`)
    assert.equal(verified.status, 200, verified.text)
  })

  test('outside the cooldown the token rotates and the old link dies', async () => {
    clearSentMessages()
    const body = registerBody()

    const first = await apiFetch('/api/auth/register', { method: 'POST', body })
    assert.equal(first.status, 200, first.text)

    const firstMail = getSentMessagesOfKind('email-verification')[0]
    const oldToken = extractToken(firstMail.text)

    // Move past the cooldown without waiting for it.
    await pendingRegistrationModel.updateOne(
      { email: body.email.toLowerCase() },
      { $set: { lastVerificationSentAt: new Date(Date.now() - 61_000) } }
    )

    const second = await apiFetch('/api/auth/register', { method: 'POST', body })
    assert.equal(second.status, 200, second.text)
    assert.equal(second.json.retryAfterSeconds, undefined)

    const mails = getSentMessagesOfKind('email-verification')
    assert.equal(mails.length, 2)
    const newToken = extractToken(mails[1].text)
    assert.notEqual(newToken, oldToken)

    // Old link is dead, new link verifies.
    const stale = await apiFetch(`/api/auth/verify-email?token=${oldToken}`)
    assert.equal(stale.status, 400, stale.text)

    const fresh = await apiFetch(`/api/auth/verify-email?token=${newToken}`)
    assert.equal(fresh.status, 200, fresh.text)
  })
})

/* ========================================================================== */
/* Send-decision helper (pure unit tests, including the capped path)            */
/* ========================================================================== */

describe('verificationSendDecision', () => {
  test('no live record → send with count reset', () => {
    assert.deepEqual(
      verificationSendDecision({ isLive: false, sendCount: 4, lastSentAtMs: Date.now() }, Date.now()),
      { action: 'send', resetCount: true }
    )
  })

  test('at the send cap → capped, even outside the cooldown', () => {
    assert.deepEqual(
      verificationSendDecision({ isLive: true, sendCount: 5, lastSentAtMs: Date.now() - 3600_000 }, Date.now()),
      { action: 'capped' }
    )
    assert.deepEqual(
      verificationSendDecision({ isLive: true, sendCount: 9, lastSentAtMs: undefined }, Date.now()),
      { action: 'capped' }
    )
  })

  test('below the cap inside the window → cooldown with a countdown', () => {
    const now = 1_700_000_000_000
    const decision = verificationSendDecision({ isLive: true, sendCount: 1, lastSentAtMs: now - 30_000 }, now)
    assert.equal(decision.action, 'cooldown')
    assert.equal(decision.retryAfterSeconds, 30)
  })

  test('exactly at the window edge → send (boundary is exclusive)', () => {
    const now = 1_700_000_000_000
    assert.deepEqual(
      verificationSendDecision({ isLive: true, sendCount: 1, lastSentAtMs: now - 60_000 }, now),
      { action: 'send', resetCount: false }
    )
  })

  test('one millisecond inside the window → cooldown with a 1s countdown', () => {
    const now = 1_700_000_000_000
    const decision = verificationSendDecision({ isLive: true, sendCount: 0, lastSentAtMs: now - 59_999 }, now)
    assert.equal(decision.action, 'cooldown')
    assert.equal(decision.retryAfterSeconds, 1)
  })

  test('no prior send timestamp → send (pre-change records)', () => {
    assert.deepEqual(
      verificationSendDecision({ isLive: true, sendCount: 0, lastSentAtMs: undefined }, Date.now()),
      { action: 'send', resetCount: false }
    )
  })
})
