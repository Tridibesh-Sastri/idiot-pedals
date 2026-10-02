# Known gaps

Outstanding work, unverified items and deliberate limitations. Kept honest:
anything listed here has **not** been proven by a test run.

_Last updated: end of Phase 1._

---

## Deliberately deferred to a later phase

### Phase 2 — payment safety (not started)
- Order totals are computed server-side from DB prices, but **not yet in integer
  paise**. Floating-point money paths still exist.
- **Stock is not reserved atomically.** `order.service.js` reads
  `stock - reservedStock` and validates, but the decrement is not a conditional
  `findOneAndUpdate`. Concurrent orders can oversell.
- No **stock release** on payment failure/timeout.
- Razorpay signature comparison uses the vendor SDK helper; **timing-safe
  comparison and replay protection are not asserted by a test**.
- `POST /api/payments/razorpay/create` is **not yet proven idempotent** under
  concurrency (it does reuse an existing `razorpayOrderId`, but that check is a
  read-then-write, not atomic).
- Webhook handler: raw-body signature verification exists, but the **state
  machine** (`created → paid → fulfilled/failed`), unique event-id index and
  idempotency guarantees are not verified.
- No **idempotency key** on order creation: a replayed request creates a second
  order.
- Not audited: whether any log statement can emit full payloads, signatures or
  keys.

### Phase 3 — load & resilience (not started)
- Rate limiting uses the **in-memory store**, so limits are per-instance. Needs a
  Redis store before running more than one instance (or the limitation must be
  documented for the deployment).
- No `/healthz` or `/readyz`; no request IDs; no structured logging (still
  `console.*`); no redaction rules.
- No `ETag`/short cache on `GET /api/products`.
- Mongo connection pool/timeouts are not tuned; index usage is not verified with
  `explain()`.
- No load test has been run, so no p50/p95/p99 figures exist.

### Phase 5 — frontend wiring
- The SPA has **no `/auth/callback` route yet**, so Google sign-in cannot
  complete end-to-end even though the backend now behaves correctly.
- `OrderDetailPage` still derives a single order from the paginated list instead
  of calling the new `GET /api/order/:id`.
- Account profile/phone editing is still disabled in the UI; `PATCH
  /api/users/me` is not called yet.
- The client still maps verify-email outcomes from message text rather than the
  new `code` values.
- `/verify-phone` has no backend support at all (no OTP endpoints exist).

---

## Verified only partially

- **Google OAuth happy path is untested end-to-end.** Phase 1 tests cover the
  redirect behaviour for missing code, bad/absent state, hostile `state` values
  and the start-URL parameters. Exchanging a real authorization code requires
  browser interaction and live Google credentials, which was not done.
- **Email delivery is untested.** Registration and verification-email sending
  (SMTP + Resend) were not exercised; the verification tests create
  `pendingRegistration` documents directly instead of going through
  `POST /api/auth/register`.
- **No browser-level check** of CORS or cookie behaviour (credentials,
  `SameSite=Strict` refresh cookie). CORS was verified with raw requests only.
- **`GET /api/order/:id` pagination edge case.** The old list-derived client
  lookup scanned at most 5 pages (250 orders); the new endpoint has no such
  limit, but nothing tests ownership beyond the first page.
- `PATCH /api/users/me` cannot change email by design; there is no flow to
  change an account email at all.

---

## Environment / repo notes

- The configured MongoDB is a **local, shared development instance** (it holds
  several unrelated projects' databases) and it does not currently contain a
  populated `idiot-pedal` database. There is no dedicated staging or production
  cluster configured.
- Tests use a **separate database** (`idiot-pedal-phase1-test`) that is dropped
  before and after each run; the development database is never touched.
- `src/models/t.*.js` (`t.order`, `t.product`, `t.user`, `t.refreshToken`,
  `t.shipment`, `t.validators`, `t.webhookEvent`) appear to be **unused scratch
  duplicates** — nothing imports them. They drift from the real models and
  should be deleted or moved out of `src/`.
- A rejected CORS origin still receives the **normal route response** without
  CORS headers (by design — CORS is a browser mechanism, not server-side access
  control). If an origin-blocking response is wanted, that belongs with the
  Phase 3 error handling review.
- `frontend` and `api` must share a registrable domain in production because the
  refresh cookie is `SameSite=Strict`. Cross-site deployment needs a deliberate
  cookie change (documented in `server/README.md`).
- No CI configuration runs the new test suites yet; they are run manually via
  `npm test` in `server/` and `client/`.
