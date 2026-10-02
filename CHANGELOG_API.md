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

### 4. `GET /api/auth/verify-email` — distinct outcomes (BEHAVIOUR CHANGE)

Responses now carry a machine-readable `code`. The ambiguous
`"Invalid or expired verification link."` 400 is gone.

| Situation | Status | `code` |
|---|---|---|
| verified and account created | 200 | `EMAIL_VERIFIED` |
| token unknown / already used | 400 | `EMAIL_TOKEN_INVALID` |
| token malformed (validator) | 400 | `EMAIL_TOKEN_INVALID` |
| token or registration window expired | **410** (was 400) | `EMAIL_TOKEN_EXPIRED` |
| email already has a verified account | 409 | `ACCOUNT_ALREADY_VERIFIED` |

`410 Gone` is a new status on this endpoint. The human-readable `message` is
retained, and still contains the words "expired" / "already", so the current
frontend mapping keeps working until Phase 5 switches to `code`.

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
