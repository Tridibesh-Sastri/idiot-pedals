import "./helpers/testEnv.js";

/**
 * express-rate-limit v8 validates limiter options at build time and reports
 * violations to stderr through its logger instead of throwing — for example
 * ERR_ERL_KEY_GEN_IPV6 when a custom keyGenerator uses raw req.ip. The main
 * suites never look at stderr, so such a violation went unnoticed until a
 * real boot printed it.
 *
 * This test imports the real app (which builds every limiter on every router)
 * in a child process and fails if any ValidationError is emitted. Importing
 * app.js has no side effects: no DB connection, no listener, no cron jobs
 * (those all live in server.js, which is never imported here).
 *
 *   node --test --test-concurrency=1 tests/limiterValidation.test.js
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const here = path.dirname(fileURLToPath(import.meta.url))
const APP_URL = pathToFileURL(path.resolve(here, '../src/app/app.js')).href

test('building every limiter emits zero express-rate-limit ValidationErrors', async () => {
  const script = `await import(${JSON.stringify(APP_URL)}); console.log('APP_OK');`

  let stdout = ''
  let stderr = ''
  try {
    const result = await execFileAsync(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        // Same working directory the suite itself runs from, so dotenv finds
        // server/.env exactly as it does for the parent process.
        cwd: path.resolve(here, '..'),
        env: { ...process.env },
      }
    )
    stdout = result.stdout ?? ''
    stderr = result.stderr ?? ''
  } catch (error) {
    assert.fail(`importing the app failed: ${error.message}\n${error.stderr ?? ''}`)
  }

  assert.match(stdout, /APP_OK/)
  assert.equal(
    /ERR_ERL_/.test(stderr),
    false,
    `rate-limit validation errors on stderr:\n${stderr}`
  )
  assert.equal(
    /ValidationError/.test(stderr),
    false,
    `validation errors on stderr:\n${stderr}`
  )
})
