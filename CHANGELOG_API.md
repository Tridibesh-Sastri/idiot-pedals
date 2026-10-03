# API contract changes

Breaking and additive changes to the HTTP API, newest first. Every entry lists
what changed, why, and which Phase introduced it.

---

## Phase 1 — backend gap closure

### 1. Google OAuth callback no longer returns JSON (BREAKING)

`GET /api/auth/google/callback` previously returned a JSON body
(`200`/`201` with `data.user` + `data.accessToken`, or `400`/`403`/`409` JSON
errors). It is reached by a top-level browser navigation from Google, so a JSON
body was unusable — the user landed on a raw JSON page and never got a session.

It now **always** answers `302`:

| Outcome | Status | `Location` |
|---|---|---|
| success (new account, login, or link) | 302 | `{FRONTEND_URL}/auth/callback` |
| user cancelled / no code | 302 | `{FRONTEND_URL}/login?error=google_cancelled` |
| state missing or mismatched | 302 | `{FRONTEND_URL}/login?error=google_state_invalid` |
| code exchange failed | 302 | `{FRONTEND_URL}/login?error=google_exchange_failed` |
| Google identity not usable | 302 | `{FRONTEND_URL}/login?error=google_account_unverified` |
| account cannot be auto-linked | 302 | `{FRONTEND_URL}/login?error=google_link_conflict` |
| anything else | 302 | `{FRONTEND_URL}/login?error=google_failed` |

- On success the **httpOnly refresh cookie is set**; no access token is returned
  in a body or placed in the URL. The SPA then calls `POST /api/auth/refresh` to
  mint a short-lived access token. (Frontend wiring is Phase 5 — the SPA needs a
  `/auth/callback` route for the flow to complete.)
- The redirect target is built **only** from the validated `FRONTEND_URL` and is
  never read from query parameters.
- **State validation changed mechanism:** it now uses the signed, httpOnly,
  `SameSite=Lax` `oauth_state` cookie set by `GET /api/auth/google`. The
  previous in-memory `Map` in `google.service.js` was removed (it lost all
  pending states on restart and did not work across multiple instances), and
  `getGoogleUser` no longer takes a `state` argument.
- Removed exports: `verifyOAuthState` (authenticate middleware) and
  `validateGoogleCallback` (auth validators). Neither is used any more.

### 2. NEW `GET /api/order/:orderId`

Owner-only single order. Same order document shape as list items (line items and
`payment.status` included).

| Case | Status | Body |
|---|---|---|
| owner | 200 | `{ success: true, message, data: { order } }` |
| valid id, other user's order | **404** | `{ success: false, message: 'Order not found.' }` |
| valid id, no such order | 404 | same as above |
| malformed id | 400 | validation error |
| no/invalid token | 401 | `{ success: false, message: 'Authentication required.' }` |

Other users' orders deliberately return **404, not 403** — a 403 would confirm
that the id exists.

### 3. NEW `GET` / `PATCH /api/users/me`

- `GET` → `{ success: true, data: { user } }` with the same user shape as
  `/api/auth/me` (includes `phone` and `phoneVerified`).
- `PATCH` accepts **only `name` and `phone`**. Any other key — including `role`,
  `emailVerified`, `phoneVerified`, `email`, `passwordHash`, `authProviders`,
  `_id` — is rejected with 400 before the service layer runs. The service also
  copies only whitelisted keys, so the whitelist holds even if validation is
  bypassed.
- Errors: 400 unknown field, 400 `NO_UPDATABLE_FIELDS` (empty body), 400 invalid
  name/phone, 409 `PHONE_IN_USE` (phone already on another account),
  401 unauthenticated.
- Changing email is intentionally unsupported (requires re-verification).

### 4. `POST /api/auth/verify-email` — distinct outcomes (replaces legacy GET)

The old consuming `GET /api/auth/verify-email?token=…` is removed (now 404).
Verification is `POST /api/auth/verify-email` with `{ "token": "<64 hex>" }`
in the JSON body; the emailed `/verify-email?token=…` link only lands on the
SPA page, which sends exactly one POST per button press. `POST /api/auth/resend-verification`
(`{ "email" }`, always generic 200) was added alongside for lost mails.

Responses carry a machine-readable `code`:

| Situation | Status | `code` |
|---|---|---|
| verified and account created | 200 | `EMAIL_VERIFIED` |
| token unknown / already used | 400 | `EMAIL_TOKEN_INVALID` |
| token malformed (validator) | 400 | `EMAIL_TOKEN_INVALID` |
| token or registration window expired | **410** | `EMAIL_TOKEN_EXPIRED` |
| email already has a verified account | 409 | `ACCOUNT_ALREADY_VERIFIED` |

`410 Gone` is returned for expired tokens. Rate limit: 20/15min/IP.

### 5. Additive: `phoneVerified` in user payloads

`GET /api/auth/me`, `POST /api/auth/login` and the new `/api/users/me` now
return `phoneVerified` alongside `emailVerified` (previously omitted, so the
client always rendered it as false). `/api/auth/me` now selects the shared
`PUBLIC_USER_FIELDS` projection. No fields were removed.

### 6. CORS rejection is no longer a 500

A request from a non-allow-listed origin previously threw inside the cors
callback, which produced a **500** (and, outside production, a stack trace in
the body). It now returns the response **without CORS headers**, so the browser
blocks it and the server does not treat a routine cross-origin request as an
error. Verify with an `Origin` header — the status is no longer 500.

### 7. Error responses no longer include stack traces

The global error handler used to append `stack` whenever
`NODE_ENV !== 'production'`. Stack traces are now included **only** when
`DEBUG_EXPOSE_STACK=true`, and never when production. Server-side logging is
unchanged (stack still logged in non-production console output).

### 8. New environment variable

- `DEBUG_EXPOSE_STACK` — optional boolean, default `false`. Opt-in only;
  ignored when `NODE_ENV=production`.

### 9. `NODE_ENV` must be explicit when a production indicator is present

Boot now fails if `NODE_ENV` is unset **and** either `FRONTEND_URL` contains an
`https://` origin or `MONGO_URI` is not localhost. An explicit value (including
`NODE_ENV=development`) satisfies the rule. This prevents a missing `NODE_ENV`
from silently disabling production safety behaviour.

### 10. Internal fixes (no contract change)

- **Mongoose 9 pre-hook bug.** `order.model.js`, `pendingRegistration.js` and
  `shipment.model.js` declared `function (next)` pre-`validate` hooks. Mongoose
  9 no longer passes `next`, so `next()` threw
  `TypeError: next is not a function`. This was latent for orders/shipments and
  fatal for any `pendingRegistration` `.create()`/`.save()`. Hooks are now
  promise-style and report failures via `this.invalidate(...)`.
- `PUBLIC_USER_FIELDS` / `serializeUser` centralised in
  `src/utils/serializeUser.js` so every user-returning endpoint shares one shape.
- `users.routes.js`, `user.controller.js`, `user.service.js`,
  `user.validator.js` added; mounted at `/api/users`.
- `rejectUnknownFields` is now exported from `auth.validator.js` and reused.

### 11. Postman collection

`Idiot Pedals.postman_collection.json` was rewritten: `{{baseUrl}}` and
`{{accessToken}}` variables, corrected `/api/payment/...` →
`/api/payments/...`, unified ports (the stray `4500` is gone), the temporary
trycloudflare tunnel URL removed, and all real credentials (email, password,
verification token, webhook signature) replaced with variables. New requests
cover `/api/users/me`, order detail and the webhook.

---

## Phase 2 — payment safety (no request/response shape changes)

Additive fields only; nothing the frontend sends or reads changed shape.

### 12. New additive amount fields

`order.pricing` gains `subtotalMinor`, `shippingMinor`, `discountMinor`,
`totalMinor`, and each `items[].unitPrice` / `items[].total` gains
`amountMinor`. These are exact integer **paise** values. The existing
major-unit `amount` fields are unchanged and still what the UI displays.

All money arithmetic and every Razorpay amount now derive from the integer
fields, so totals cannot drift through binary floating point. The order schema
pre-validate hook compares exact integers instead of using a ±0.01 tolerance.

### 13. Quantity validation is unchanged but now enforced twice

`POST /api/order` already required an integer quantity 1–100. The service now
re-validates it before the paise arithmetic, so a non-integer can never reach
the money math. Client-supplied prices remain ignored (they are never read).

### 14. New conflict code on create order

`POST /api/order` returns **409** with `INSUFFICIENT_STOCK` when the atomic
stock reservation fails. Previously the same condition produced a 409 with a
product-specific message; the status is unchanged, and the message is now
`One or more items do not have enough stock available.`

### 15. Order status gains `fulfilled`

`orderStatus` may now be `fulfilled`, reachable only via the provider webhook.
`pending -> confirmed` is set by a successful verify; `confirmed -> fulfilled`
is webhook-only, so a client-triggered verify can never finalize an order.
Illegal transitions return **409** (`ILLEGAL_ORDER_TRANSITION`).

### 16. Verify is replay-safe

Re-submitting the same payment id for an already-paid order returns 200 and
does not re-send notifications. A *different* payment id against a paid order,
or a payment id already used by another order, returns **409**.

---

## Phase 3 — resilience (no request/response shape changes)

### 17. New endpoints

- `GET /healthz` → `{ status: 'ok', uptimeSeconds }`. Not rate limited.
- `GET /readyz` → 200 `{ status: 'ok', mongo: 'connected' }`, or **503**
  `{ status: 'unavailable', mongo: 'disconnected' }`.

### 18. Additive response headers and fields

- Every response carries `X-Request-Id` (a client-supplied id is reused when it
  is 8–128 chars of `[A-Za-z0-9._-]`, otherwise a UUID is generated).
- 404 and error bodies now include `requestId`.
- `GET /api/products` and `GET /api/products/:id` send
  `Cache-Control: public, max-age=30, stale-while-revalidate=60` and the default
  `ETag` (revalidation returns 304).

### 19. Stricter rate limits (per IP, in-process)

Global 300/15min, plus login 10, register 5, verify-email 20, google 30,
payment create 20, payment verify 30, webhook 300. Limits are per Node process
— see KNOWN_GAPS.md.

---

## Phase 5 — frontend completion

### 20. `GET /api/order/:orderId` accepts an order number as well as an ObjectId

**Relaxation, not a break.** The endpoint previously required a Mongo ObjectId
and returned 400 otherwise. It now also accepts the human-readable order number
(`IP-...`), because the UI links to orders with that identifier. Everything else
is unchanged: still owner-scoped, still **404** for another user's order, still
400 for anything that is neither form. No existing caller is affected.

### 21. Frontend behaviour (no API change)

- Order detail now uses `GET /api/order/:id` instead of scanning the paginated
  list (the old approach missed orders beyond the first 250).
- `/auth/callback` is wired: the session comes from the refresh cookie, so the
  page calls `GET /api/auth/me` (which silently exchanges the cookie for an
  access token) and then lands on `/account`. No token is read from the URL.
- `/login?error=<code>` renders a specific message per Google error code.
- `userService` is now a real client over `GET`/`PATCH /api/users/me`; the
  localStorage copy is gone. AccountPage supports editing name and phone with
  validation and error states.
- Verify-email outcomes are mapped by HTTP status (200/400/410/409) instead of
  pattern-matching human-readable message text.

---

## Additive: optional `compareAtPrice` on products

### 22. New optional field

`Product.compareAtPrice` — an optional display-only "was" price, used by the
storefront to render a strikethrough beside the live price.

- **Type**: number or `null`. Omitted / `null` means "no compare-at price".
- **Representation rules** match `price`: non-negative and finite.
- **Rule**: when set, it must be **strictly greater** than the effective price.
  "Effective price" is the submitted `price` on create, and on `PATCH` the
  submitted `price` if the request carries one, otherwise the stored price.
  This means both of these are rejected with **400**:
  - `PATCH { compareAtPrice: X }` where `X <= price`
  - `PATCH { price: X }` where `X >= compareAtPrice`
- Compared in **integer paise**, never with floats.
- `PATCH { compareAtPrice: null }` clears it.
- Set by an admin only: `POST /api/products` and `PATCH /api/products/:id`
  require the existing `authenticateMiddleware` + `authorizeAdmin` chain, so a
  missing token still returns 401 and a normal user 403.

### 23. Response shape

- Returned by `GET /api/products`, `GET /api/products/:id`,
  `POST /api/products` and `PATCH /api/products/:id` when set; omitted or `null`
  when not.
- **Never influences money.** Order totals, payment amounts and stock continue to
  derive from `price` alone. `POST /api/order` ignores any client-supplied
  compare-at value, and an order for a product with `compareAtPrice` set is
  totalled from `price` only (asserted in `tests/compareAtPrice.test.js`).

No other endpoint, request body or response shape changed.
