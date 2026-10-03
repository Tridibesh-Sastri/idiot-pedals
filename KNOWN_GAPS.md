# Known gaps

Outstanding work, unverified items and deliberate limitations. Kept honest:
anything listed here has **not** been proven by a test run.

_Last updated: end of Phase 5._

---

## Deliberately deferred

### Payment follow-ups
- Order totals now carry exact integer paise (`pricing.totalMinor`) and all money
  arithmetic uses them, but the **stored/returned major-unit `amount` remains a
  JS number**. It is exact for the values the catalogue produces; it is not a
  decimal type.
- Razorpay **webhook delivery** has never been exercised by Razorpay itself. The
  handler is tested against realistic payloads and is idempotent, but no real
  delivery has been received.
- **No refund flow.** `refunded` exists in the state machine but nothing drives
  it, and there is no Razorpay refund call.
- **No idempotency key on `POST /api/order`.** A replayed request creates a
  second order (a double-clicked submit is mitigated in the UI, not the API).
- A failed payment **cancels the order and releases its reservation**; retrying
  requires placing a new order. There is no "resume payment" path for an
  existing order.
- `POST /api/payments/razorpay/create` is idempotent per order via a conditional
  update, but in a genuine race the **losing request may leave an unused
  Razorpay order** behind. Only the winning id is ever returned or stored.

### Rate limiting is per-instance
`server/src/middlewares/rateLimiter.js` uses express-rate-limit's default
in-process `MemoryStore`:

- Limits apply **per Node process**, not across a cluster. N instances multiply
  the effective allowance by N, and counters reset on every restart.
- The store is injectable (`createRateLimiter({ store })`) so a shared store can
  be supplied in one place, but **no shared store is wired up** and the
  multi-instance path is untested.

Real volumetric/DDoS protection belongs at the edge (Cloudflare/WAF), not in
Express middleware.

### Load-test numbers are single-machine, single-instance
Measured with `npx autocannon` against the local API and the shared local
MongoDB — this describes a laptop, not production. Each endpoint was measured
against a freshly started server so the in-memory limiter did not carry over.

| endpoint | reqs | 2xx | non-2xx | p50 | p97.5 | p99 | rps |
|---|---|---|---|---|---|---|---|
| GET /api/products (10 conns) | 250 | 250 | – | 53 ms | 161 ms | 178 ms | 125 |
| POST /api/order (10 conns) | 250 | 250 | – | 149 ms | 353 ms | 432 ms | 50 |
| POST /api/payments/razorpay/create (5 conns) | 20 | 20 | – | 47 ms | 229 ms | 229 ms | 20 |
| POST /api/auth/login (2 conns) | 10 | 10 | – | 650 ms | 779 ms | 779 ms | 3 |
| GET /api/products (50 conns, ramp) | 400 | 300 | 429 ×100 | 242 ms | 505 ms | 529 ms | 200 |

- **Login is slowest (p50 ≈ 650 ms).** That is bcrypt at `SALT_ROUND=12`: CPU
  bound and deliberate, not a code defect. No bottleneck was "fixed" because
  none of the measurements exposed one.
- The **degradation point is the rate limiter by design** — after 300 requests
  per 15 minutes from one IP the global limiter answers 429. The 50-connection
  ramp shows exactly 300 successes then 429s.
- Payment create was measured on the **idempotent reuse path** (the fixture order
  already had a `razorpayOrderId`), so no outbound Razorpay calls were made; a
  first-call measurement would be dominated by Razorpay's own latency.

---

## Unverified

- **Real Google sign-in end to end.** Only the redirect/error paths are tested;
  exchanging a real authorization code needs a browser and live Google
  credentials.
- **Real Razorpay checkout.** No real payment has been captured. Signature
  verification, replay/idempotency, the state machine and stock release are all
  exercised against realistic payloads.
- **Real webhook delivery** from Razorpay to this server.
- **Real email delivery.** Register/verify-email sending was never observed
  arriving in an inbox, so both SMTP and Resend paths are unproven.
- **Multi-instance behaviour** — see the rate-limit note above.
- **`autocannon` ran on the same machine** as the server, competing for CPU.

---

## Environment / repo notes

- The configured MongoDB is a **local, shared development instance** holding
  several unrelated projects' databases; it must never be dropped. Tests use a
  separate `idiot-pedals-test` database that is dropped before and after each
  run, and the suite runs with `--test-concurrency=1` so two test files never
  share it at once.
- `src/models/t.*.js` (`t.order`, `t.product`, `t.user`, `t.refreshToken`,
  `t.shipment`, `t.validators`, `t.webhookEvent`) are **unused scratch
  duplicates** — nothing imports them. They drift from the real models and
  should be deleted or moved out of `src/`.
- A rejected CORS origin still receives the normal route response **without CORS
  headers** (by design: CORS is a browser mechanism, not server-side access
  control).
- `frontend` and `api` must share a registrable domain in production, because the
  refresh cookie is `SameSite=Strict` (documented in `server/README.md`).
- No CI configuration runs the suites yet; they are run manually with `npm test`
  in `server/` and `client/`.

## Frontend notes

- `orderService.getOrderById` maps a 404 from `GET /api/order/:id` to "not
  found" rather than an error, because the endpoint deliberately returns 404
  (never 403) for another user's order.
- Pagination echoes `limit` as a **string** (taken straight from the query
  string), so consumers must not rely on it being a number.
- `/verify-phone` still has no backend support (no OTP endpoints exist); the page
  degrades gracefully.

---

# Pre-deployment security audit

Scope: authorization on every mounted route, token trust, cross-user access,
NoSQL injection, mass assignment, rate limits, error hygiene, cookies, CORS and
helmet, webhook signatures, secrets in the repo and dependency audit.

**No exploitable vulnerability was found in the audited surface.** `tests/security.test.js`
(28 tests) is the proof; every claim below is either asserted there or listed as
an accepted limitation. Nothing in this section is assumed.

## Findings, with severity

### LOW — `/healthz` and `/readyz` bypass helmet and CORS
They are mounted in `app.js` before `helmet(...)` and `cors(...)`, so their
responses carry no security headers and never an `Access-Control-Allow-Origin`
header. Not exploitable: they return only `{status, uptimeSeconds}` and
`{status, mongo}` — no user data, no auth, and the absent CORS header makes them
*less* reachable from a browser than the API, not more. The residual cost is that
`X-Powered-By` is not stripped on those two paths (framework disclosure only).
Not changed: moving the routes would alter `app.js` middleware ordering for no
security gain.

### FIXED — verify-email is now POST-with-button (was: `GET` mutating state)
`POST /api/auth/verify-email` takes the token in the JSON body; landing on the
`/verify-email` page consumes nothing, and one button press sends exactly one
POST. Prefetchers and scanners can no longer burn single-use tokens. The old
consuming GET was removed (now 404). Recorded in `CHANGELOG_API.md`.

### LOW — a plaintext password exists in at most one request body
Login and register take the password in the JSON body, so it appears in any
request log that records bodies. Application logs redact it by key
(`password` matches the redaction pattern), but an upstream reverse proxy or APM
that logs bodies would see it. Acceptable for TLS-terminated production; do not
enable full-body logging in front of this API.

### INFO — test fixtures that look like secrets
`server/tests/config.phase1.test.js:148,176` contains
`rzp_live_abcdefghijklmnopqrstuvwx`, and `client/src/pages/ContactPage.tsx:177`
uses `guitarist@gmail.com` as an input placeholder. Both are synthetic.
The first exists precisely to prove that a live key is refused outside
production. No real key, token or address appears in any tracked file.

### INFO — health endpoints expose uptime
`/healthz` returns `uptimeSeconds`, which reveals roughly when the process last
restarted. Harmless for a shop; keep the endpoint reachable only from your
monitor and load balancer if you prefer to hide it.

## What was verified (and where the proof lives)

- **Route authorization matrix** — every mounted route reviewed; the three
  product mutations require `authenticateMiddleware` + `authorizeAdmin`; no route
  lists all users or all orders. `tests/security.test.js` proves 401 without a
  token and 403 with a normal user token for POST/PATCH/DELETE `/api/products`.
- **Role is read from the database, never the token** —
  `authenticateMiddleware` re-loads the user and requires
  `user.role === decoded.role`, so demoting an admin or deleting an account
  invalidates existing tokens immediately (asserted).
- **No public route grants admin.** Register rejects `role`/`emailVerified` with
  400; `PATCH /api/users/me` whitelists `name` and `phone` only (400 otherwise).
  An admin account therefore exists only by writing `role: "admin"` directly to
  the user document — a deliberate manual/ops step, e.g. in `mongosh` or by
  running the fixture in `server/scripts/postman-run.mjs`, which is the only
  place in the codebase that sets an admin role and is not a server route.
- **Token forgery** — forged `role: admin` under the real secret, a wrong-secret
  token, an `alg: none` token, an expired token and a valid token for an
  unverified account are all rejected with 401.
- **Cross-user access** — another user's order returns 404 by ObjectId *and* by
  order number; the order list is caller-scoped; user B cannot create or verify a
  payment for user A's order, and A's order is unchanged afterwards.
- **NoSQL injection** — operator objects in login, register, verify-email,
  order lookups, order line items and product filters are rejected (400) or
  neutralised; none reach the query layer as an operator.
- **Mass assignment** — client-supplied `pricing`, `totalMinor`, `unitPrice`,
  `orderStatus`, `payment.status` and `needsRefund` on order create are ignored;
  the persisted order carries server-computed values and starts `pending`.
- **Rate limits** — login, register and payment create all return 429 once their
  per-IP budget is spent.
- **Error hygiene** — 404/400/401/403 responses contain no `stack` key, stack
  frame, file path, `E11000`, `MongoError`/`CastError`, `mongodb://` URI or
  secret.
- **Cookies** — the refresh cookie is `HttpOnly`, `SameSite=Strict`, `Path=/`,
  `Secure` in production only, and is cleared on logout with a matching
  attribute set. The OAuth `oauth_state` cookie is `HttpOnly`, signed,
  `SameSite=Lax`, 15-minute TTL, and the Google start URL points at
  `accounts.google.com`.
- **CORS and helmet** — only `FRONTEND_URL` is echoed; no wildcard; helmet
  headers (nosniff, no `X-Powered-By`, CSP/framing/COOP/CORP/referrer policy)
  are present on API responses.
- **Webhook** — unsigned and wrongly signed deliveries are rejected with 4xx and
  leave the order untouched; a correctly signed one still drives fulfilment.
- **Secrets** — no `.env` file has ever been committed (checked across all
  history); no live Razorpay key, credentialed Mongo URI, JWT literal or private
  key in tracked files; the client bundle contains none of the server's `.env`
  values and only `VITE_API_BASE_URL` and `VITE_RAZORPAY_KEY_ID` (the
  dev-server-only `VITE_API_PROXY_TARGET` is absent from the bundle).
- **Dependencies** — `npm audit` reports 0 vulnerabilities for the server
  (production dependencies) and 0 for the client. No high or critical finding
  needed fixing.

## Security work still outstanding

- **Everything in the "Unverified" section above still applies**: no real Google
  sign-in, no real Razorpay capture, no real webhook delivery, no real email.
  Those paths are covered by fakes, which is not the same as proved in
  production.
- **Single-instance assumptions.** Rate limiting is per-process; a multi-instance
  deployment multiplies the effective budget (see the rate-limit section above).
- **No CSRF token.** The refresh cookie is `SameSite=Strict`, which is the
  mitigation; a cross-site POST from another origin cannot carry it. This is
  sufficient for the current design but is not a substitute for a CSRF token if
  the cookie's `SameSite` policy is ever relaxed.
- **No 2FA and no login notification.** A stolen password is enough to sign in.
- **No audit log** of admin actions (product create/update/delete).
- **No dependency scanning in CI** — `npm audit` was run by hand.
- **No secret manager.** Secrets live in `server/.env` on the host; rotation is
  manual.
- **The tests are only as good as the fake providers.** `tests/security.test.js`
  proves behaviour through the app, not through Google or Razorpay.
