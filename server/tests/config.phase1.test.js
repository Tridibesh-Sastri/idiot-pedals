/**
 * Phase 1 — config boot-guard tests.
 *
 * Each case runs config.js in a CHILD process whose working directory is a
 * throwaway temp dir containing a synthetic .env. That way:
 *   - the real server/.env is never read, modified, or printed
 *   - NODE_ENV can be genuinely absent (which is the condition under test)
 *
 *   node --test tests/config.phase1.test.js
 */

import "./helpers/testEnv.js";

import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const here = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_URL = pathToFileURL(path.resolve(here, '../src/config/config.js')).href

let workDir

const buildEnvFile = ({
  nodeEnv = null,
  frontendUrl = 'http://localhost:3000',
  mongoUri = 'mongodb://localhost:27017/idiot-pedal-envtest',
  razorpayKeyId = 'rzp_test_abcdefghijklmnopqrstuvwx',
  razorpayKeySecret = 'f'.repeat(24),
  razorpayWebhookSecret = 'g'.repeat(24),
  emailNotificationsEnabled = null,
} = {}) => {
  const lines = [
    'PORT=5000',
    `MONGO_URI=${mongoUri}`,
    'SALT_ROUND=12',
    `ACCESS_TOKEN_SECRET=${'a'.repeat(64)}`,
    `REFRESH_TOKEN_SECRET=${'b'.repeat(64)}`,
    `COOKIE_SECRET=${'c'.repeat(64)}`,
    `FRONTEND_URL=${frontendUrl}`,
    'EMAIL_VERIFICATION_TOKEN_TTL_MS=900000',
    'PENDING_REGISTRATION_TTL_MS=1800000',
    'SMTP_HOST=smtp.mailhost.test',
    'SMTP_PORT=587',
    'SMTP_SECURE=false',
    'SMTP_USER=mailer',
    `SMTP_PASSWORD=${'d'.repeat(32)}`,
    'EMAIL_FROM="IDIOT <no-reply@mailhost.test>"',
    'GOOGLE_CLIENT_ID=client-id.apps.googleusercontent.com',
    `GOOGLE_CLIENT_SECRET=${'e'.repeat(32)}`,
    'GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback',
    `RAZORPAY_KEY_ID=${razorpayKeyId}`,
    `RAZORPAY_KEY_SECRET=${razorpayKeySecret}`,
    `RAZORPAY_WEBHOOK_SECRET=${razorpayWebhookSecret}`,
    `RESEND_API_KEY=${'h'.repeat(24)}`,
    'RESEND_FROM="IDIOT <orders@mailhost.test>"',
    'ADMIN_ORDER_EMAIL=admin@mailhost.test',
  ]

  if (nodeEnv !== null) lines.unshift(`NODE_ENV=${nodeEnv}`)
  if (emailNotificationsEnabled !== null) lines.push(`EMAIL_NOTIFICATIONS_ENABLED=${emailNotificationsEnabled}`)

  return `${lines.join('\n')}\n`
}

/** Runs config.js in a child process; returns { ok, output }. */
const loadConfig = async ({ envFile, envOverrides = {} }) => {
  await writeFile(path.join(workDir, '.env'), envFile, 'utf8')

  /*
   * The child must see ONLY the synthetic .env. dotenv never overwrites already
   * present process variables, so any inherited key that the synthetic file
   * also defines would silently win and invalidate the case under test.
   */
  const syntheticNames = envFile
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
    .filter(Boolean)

  const env = { ...process.env }
  delete env.NODE_ENV
  for (const name of syntheticNames) delete env[name]
  Object.assign(env, envOverrides)

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--input-type=module', '-e', `await import(${JSON.stringify(CONFIG_URL)}); console.log('CONFIG_OK');`],
      { cwd: workDir, env }
    )
    return { ok: true, output: stdout }
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` }
  }
}

before(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), 'idiot-pedals-envtest-'))
})

after(async () => {
  if (workDir) await rm(workDir, { recursive: true, force: true })
})

/* -------------------------------------------------------------------------- */

test('baseline dev config (absent NODE_ENV, http localhost, test key) loads', async () => {
  const result = await loadConfig({ envFile: buildEnvFile() })
  assert.equal(result.ok, true, result.output)
})

test('absent NODE_ENV + https FRONTEND_URL is refused', async () => {
  const result = await loadConfig({
    envFile: buildEnvFile({ frontendUrl: 'https://app.mailhost.test' }),
  })

  assert.equal(result.ok, false)
  assert.match(result.output, /NODE_ENV: must be set explicitly/)
})

test('absent NODE_ENV + non-local MONGO_URI is refused', async () => {
  const result = await loadConfig({
    envFile: buildEnvFile({ mongoUri: 'mongodb+srv://cluster0.mongodb.net/idiot-pedal' }),
  })

  assert.equal(result.ok, false)
  assert.match(result.output, /NODE_ENV: must be set explicitly/)
})

test('explicit NODE_ENV=development satisfies the production indicator', async () => {
  const result = await loadConfig({
    envFile: buildEnvFile({
      nodeEnv: 'development',
      frontendUrl: 'https://app.mailhost.test',
      mongoUri: 'mongodb+srv://cluster0.mongodb.net/idiot-pedal',
    }),
  })

  assert.equal(result.ok, true, result.output)
})

test('live Razorpay key outside production is refused', async () => {
  const result = await loadConfig({
    envFile: buildEnvFile({
      nodeEnv: 'development',
      razorpayKeyId: 'rzp_live_abcdefghijklmnopqrstuvwx',
    }),
  })

  assert.equal(result.ok, false)
  assert.match(result.output, /live keys must never be used outside NODE_ENV=production/)
})

test('test Razorpay key with NODE_ENV=production is refused', async () => {
  const result = await loadConfig({
    envFile: buildEnvFile({
      nodeEnv: 'production',
      frontendUrl: 'https://app.mailhost.test',
      mongoUri: 'mongodb+srv://cluster0.mongodb.net/idiot-pedal',
      razorpayKeyId: 'rzp_test_abcdefghijklmnopqrstuvwx',
    }),
  })

  assert.equal(result.ok, false)
  assert.match(result.output, /test keys cannot be used with NODE_ENV=production/)
})

test('missing required MONGO_URI is refused with a clear message', async () => {
  // Empty value (not a dropped line): the harness strips inherited variables
  // only for names the synthetic file declares, so the line must stay to
  // keep the real MONGO_URI out of the child environment.
  const envFile = buildEnvFile()
    .split('\n')
    .map((line) => (line.startsWith('MONGO_URI=') ? 'MONGO_URI=' : line))
    .join('\n')
  const result = await loadConfig({ envFile })

  assert.equal(result.ok, false)
  assert.match(result.output, /MONGO_URI: missing or empty/)
})

test('reused Razorpay webhook secret (same as key secret) is refused', async () => {
  const shared = 's'.repeat(32)
  const result = await loadConfig({
    envFile: buildEnvFile({
      razorpayKeySecret: shared,
      razorpayWebhookSecret: shared,
    }),
  })

  assert.equal(result.ok, false)
  assert.match(result.output, /RAZORPAY_WEBHOOK_SECRET: must differ from RAZORPAY_KEY_SECRET/)
})

test('production + live key + https origin + remote Mongo loads', async () => {
  const result = await loadConfig({
    envFile: buildEnvFile({
      nodeEnv: 'production',
      frontendUrl: 'https://app.mailhost.test',
      mongoUri: 'mongodb+srv://cluster0.mongodb.net/idiot-pedal',
      razorpayKeyId: 'rzp_live_abcdefghijklmnopqrstuvwx',
    }),
  })

  assert.equal(result.ok, true, result.output)
})

test('refusal output never contains a secret value', async () => {
  const envFile = buildEnvFile({ frontendUrl: 'https://app.mailhost.test' })
  const result = await loadConfig({ envFile })

  assert.equal(result.ok, false)
  // The synthetic secrets are long runs of one character; none may appear.
  for (const secret of ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64), 'd'.repeat(32)]) {
    assert.equal(result.output.includes(secret), false)
  }
})

test('EMAIL_NOTIFICATIONS_ENABLED=false in production is refused', async () => {
  const result = await loadConfig({
    envFile: buildEnvFile({
      nodeEnv: 'production',
      frontendUrl: 'https://app.mailhost.test',
      mongoUri: 'mongodb+srv://cluster0.mongodb.net/idiot-pedal',
      razorpayKeyId: 'rzp_live_abcdefghijklmnopqrstuvwx',
      emailNotificationsEnabled: 'false',
    }),
  })

  assert.equal(result.ok, false)
  assert.match(result.output, /EMAIL_NOTIFICATIONS_ENABLED: cannot be disabled in production/)
})

test('EMAIL_NOTIFICATIONS_ENABLED=false in development is allowed', async () => {
  const result = await loadConfig({
    envFile: buildEnvFile({
      nodeEnv: 'development',
      emailNotificationsEnabled: 'false',
    }),
  })

  assert.equal(result.ok, true, result.output)
})

