import "./helpers/testEnv.js";

/**
 * The example env files must stay in step with the code.
 *
 * A name that config.js reads but .env.example omits is a trap: the next person
 * copies the example, boots, and gets a ConfigError about a variable nobody told
 * them about.
 *
 * Deliberately free of backslash-heavy regexes so the checks read plainly.
 */

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LF = String.fromCharCode(10)
const EQUALS = String.fromCharCode(61)
const QUOTE_DOUBLE = String.fromCharCode(34)
const QUOTE_SINGLE = String.fromCharCode(39)

const here = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(here, '..')
const clientRoot = path.resolve(serverRoot, '..', 'client')

const declaredNames = (source) =>
  source
    .split(LF)
    .map((line) => {
      const separator = line.indexOf(EQUALS)
      if (separator < 1) return null

      const name = line.slice(0, separator).trim().replace(/^#+/, '').trim()

      return /^[A-Z][A-Z0-9_]*$/.test(name) ? name : null
    })
    .filter(Boolean)

const configSource = fs.readFileSync(path.join(serverRoot, 'src', 'config', 'config.js'), 'utf8')
const specStart = configSource.indexOf('const SPEC = {')
const specEnd = configSource.indexOf(LF + '}', specStart)
const specSource = configSource.slice(specStart, specEnd)

const configNames = [...specSource.matchAll(/^ {2}([A-Z][A-Z0-9_]*):\s*\{/gm)].map((match) => match[1])

const serverExample = fs.readFileSync(path.join(serverRoot, '.env.example'), 'utf8')
const serverExampleNames = declaredNames(serverExample)
const clientExample = fs.readFileSync(path.join(clientRoot, '.env.example'), 'utf8')

const stripQuotes = (value) =>
  value.split(QUOTE_DOUBLE).join('').split(QUOTE_SINGLE).join('').trim()

describe('env examples match the code', () => {
  test('config.js exposes a SPEC to read', () => {
    assert.equal(configNames.length > 20, true, `only found ${configNames.length} names`)
  })

  test('every name config.js reads is present in server/.env.example', () => {
    const missing = configNames.filter((name) => !serverExampleNames.includes(name))

    assert.deepEqual(missing, [], `missing from server/.env.example: ${missing.join(', ')}`)
  })

  test('server/.env.example declares nothing the code does not read', () => {
    const extra = [...new Set(serverExampleNames.filter((name) => !configNames.includes(name)))]

    assert.deepEqual(extra, [], `not read by config.js: ${extra.join(', ')}`)
  })

  test('server/.env.example contains no secret-shaped value', () => {
    const findings = []

    for (const line of serverExample.split(LF)) {
      const separator = line.indexOf(EQUALS)
      if (separator < 1) continue

      const name = line.slice(0, separator).trim()
      if (!name || name.startsWith('#')) continue

      const value = stripQuotes(line.slice(separator + 1))
      if (!value) continue

      const looksGenerated =
        value.length >= 32 &&
        !value.includes('replace') &&
        !value.includes('placeholder') &&
        !value.includes('_') === false
          ? value.length >= 32 && !value.includes('replace') && !value.includes('placeholder')
          : false

      if (value.startsWith('rzp_live_') && value.length > 20) {
        findings.push(`${name} looks like a live Razorpay key`)
      }
      if (value.startsWith('eyJ') && value.length > 30) {
        findings.push(`${name} looks like a JWT`)
      }
      if (looksGenerated && !value.includes('://')) {
        findings.push(`${name} looks like a generated secret`)
      }
      if (value.includes('mongodb') && value.includes('@')) {
        findings.push(`${name} looks like a credentialed Mongo URI`)
      }
    }

    assert.deepEqual(findings, [], findings.join('; '))
  })

  test('server/.env.example documents local development and production values', () => {
    assert.match(serverExample, /LOCAL DEVELOPMENT VALUES/)
    assert.match(serverExample, /PRODUCTION VALUES/)
    assert.match(serverExample, /EMAIL_NOTIFICATIONS_ENABLED/)
  })

  test('client/.env.example mentions only the allowed VITE_ variables', () => {
    const viteNames = [...new Set(clientExample.match(/VITE_[A-Z0-9_]+/g) ?? [])].sort()

    assert.deepEqual(viteNames, ['VITE_API_BASE_URL', 'VITE_API_PROXY_TARGET', 'VITE_RAZORPAY_KEY_ID'])
  })

  test('client/.env.example explains the proxy, the /api suffix and the secret rule', () => {
    assert.match(clientExample, /proxy/i)
    assert.match(clientExample, /end with \/api|must end with \/api/i)
    assert.match(clientExample, /never put the razorpay key secret here/i)
  })
})
