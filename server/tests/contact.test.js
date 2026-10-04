import { fakeRazorpay } from "./helpers/testEnv.js";

/**
 * Contact form endpoint (POST /api/contact).
 *
 * Functional coverage only — no DB writes anywhere on this path, so no
 * models are touched. Rate-limiter hammering lives in contact.limits.test.js
 * (separate process = separate in-memory limiter budgets).
 */

import { after, before, describe, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import app from '../src/app/app.js'
import config from '../src/config/config.js'

// Functional coverage only: raise the abuse caps for this process so
// validation/honeypot/injection cases never trip a limiter mid-file.
// Limiter behavior itself is covered in contact.limits.test.js.
const REAL_LIMITS = {
  CONTACT_RATE_IP_MAX: config.CONTACT_RATE_IP_MAX,
  CONTACT_RATE_EMAIL_MAX: config.CONTACT_RATE_EMAIL_MAX,
  CONTACT_RATE_DAILY_MAX: config.CONTACT_RATE_DAILY_MAX,
}

import {
  clearSentMessages,
  getSentMessagesOfKind,
} from '../src/services/mailer.service.js'
import mailer from '../src/services/mailer.service.js'

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

const validBody = (overrides = {}) => ({
  name: 'Contact Tester',
  email: 'contact-tester@mailhost.test',
  subject: 'technical',
  message: 'Does the Neon Fuzz Box play well after a buffered tuner?',
  ...overrides,
})

before(async () => {
  config.CONTACT_RATE_IP_MAX = 1000
  config.CONTACT_RATE_EMAIL_MAX = 1000
  config.CONTACT_RATE_DAILY_MAX = 1000

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

describe('contact form', () => {
  test('valid send returns 200 and records one escaped admin email', async () => {
    clearSentMessages()

    const res = await postContact(validBody({ name: '<b>Bold</b>' }))

    assert.equal(res.status, 200, res.text)
    assert.equal(res.json?.success, true)

    const mails = getSentMessagesOfKind('contact')
    assert.equal(mails.length, 1)

    const [mail] = mails
    assert.equal(mail.channel, 'resend')
    assert.deepEqual(mail.to, [config.ADMIN_ORDER_EMAIL])
    assert.equal(mail.replyTo, 'contact-tester@mailhost.test')
    assert.match(mail.subject, /^\[Contact\] technical$/)
    assert.ok(!mail.html.includes('<b>Bold</b>'), 'raw HTML leaked into body')
    assert.ok(mail.html.includes('&lt;b&gt;Bold&lt;/b&gt;'))
  })

  test('each validation failure returns 400 and sends nothing', async () => {
    const cases = [
      ['missing name', { name: undefined }],
      ['short name', { name: 'A' }],
      ['over-long name', { name: 'N'.repeat(81) }],
      ['missing email', { email: undefined }],
      ['bad email', { email: 'not-an-email' }],
      ['over-long email', { email: `${'a'.repeat(250)}@b.co` }],
      ['bad subject', { subject: 'free-text-subject' }],
      ['missing subject', { subject: undefined }],
      ['short message', { message: 'too short' }],
      ['missing message', { message: undefined }],
      ['over-long message', { message: 'M'.repeat(2001) }],
      ['unknown field', { role: 'admin' }],
    ]

    for (const [label, override] of cases) {
      clearSentMessages()
      const body = validBody()
      for (const [key, value] of Object.entries(override)) {
        if (value === undefined) delete body[key]
        else body[key] = value
      }

      const res = await postContact(body)
      assert.equal(res.status, 400, `${label}: got ${res.status}: ${res.text}`)
      assert.equal(getSentMessagesOfKind('contact').length, 0, `${label}: mail was sent`)
    }
  })

  test('honeypot returns the same 200 and sends nothing', async () => {
    clearSentMessages()

    const real = await postContact(validBody())
    assert.equal(real.status, 200, real.text)

    const trapped = await postContact(validBody({ website: 'http://spam.example' }))
    assert.equal(trapped.status, 200, trapped.text)
    assert.deepEqual(trapped.json, real.json)

    // Only the real submission produced mail.
    assert.equal(getSentMessagesOfKind('contact').length, 1)
  })

  test('CRLF header injection in email is rejected with 400', async () => {
    clearSentMessages()

    const res = await postContact(
      validBody({ email: 'victim@mailhost.test\r\nBcc: evil@mailhost.test' })
    )
    assert.equal(res.status, 400, res.text)
    assert.equal(getSentMessagesOfKind('contact').length, 0)
  })

  test('CRLF in name is stripped and the send succeeds', async () => {
    clearSentMessages()

    const res = await postContact(validBody({ name: 'Tester\r\nBcc: evil@mailhost.test' }))
    assert.equal(res.status, 200, res.text)

    const mails = getSentMessagesOfKind('contact')
    assert.equal(mails.length, 1)
    assert.ok(!mails[0].text.includes('\r'), 'CR leaked into mail text')
    assert.ok(mails[0].text.includes('TesterBcc:'), 'stripped name missing from mail text')
  })

  test('Resend failure returns generic 503 with no leak', async () => {
    clearSentMessages()

    mock.method(mailer, 'sendMail', async () => {
      throw new Error('simulated provider outage')
    })

    const res = await postContact(validBody({ email: 'outage@mailhost.test' }))
    assert.equal(res.status, 503, res.text)
    assert.equal(res.json?.success, false)
    assert.ok(res.text.includes('try again later'))

    // No name, email, message or provider detail in the response.
    assert.equal(res.text.includes('outage@mailhost.test'), false)
    assert.equal(res.text.includes('simulated provider outage'), false)
    assert.equal(getSentMessagesOfKind('contact').length, 0)
  })

  test('oversize body is rejected before validation', async () => {
    const res = await postContact(validBody({ message: 'M'.repeat(11 * 1024) }))
    assert.equal(res.status, 413, res.text)
    assert.equal(getSentMessagesOfKind('contact').length, 0)
  })
})
