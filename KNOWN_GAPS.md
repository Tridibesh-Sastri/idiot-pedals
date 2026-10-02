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
