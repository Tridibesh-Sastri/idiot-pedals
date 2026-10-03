# IDIOT Pedals — API server

Express + MongoDB + Razorpay backend for the IDIOT Pedals storefront.

## Setup

```bash
npm install
cp .env.example .env     # then fill in real values (never commit .env)
npm run dev              # nodemon ./src/server.js
```

`src/config/config.js` validates the whole environment **at boot** and refuses to
start when a required variable is missing/empty, still looks like a placeholder,
an application secret is under 32 characters, a vendor-issued secret is under 24
characters, a numeric/enum value is out of range, `NODE_ENV` disagrees with the
Razorpay key class (`rzp_test_` in production, or `rzp_live_` outside
production), `FRONTEND_URL` contains a wildcard or a non-origin URL, or
production points `MONGO_URI` at localhost.

Validation errors and warnings print variable **names only** — never values.

Secrets can be generated with `openssl rand -hex 32`.

## CORS

The allow-list is derived exclusively from `FRONTEND_URL` (a comma-separated
list of exact origins). Wildcards are rejected and there is no implicit
localhost allowance, so local development requires `FRONTEND_URL` to match the
actual dev origin (for example `http://localhost:3000`).

## Deployment note — refresh cookie and domains

The refresh token is stored in an **httpOnly cookie with `SameSite=Strict`**
(see `src/services/auth.service.js`). Consequences:

- In production the SPA and the API **must share a registrable domain**
  (for example `app.example.com` and `api.example.com`, or the API behind a
  same-origin path such as `/api`). If they are on unrelated domains the browser
  will not send the cookie, and every silent refresh will fail.
- The cookie is also `Secure` in production, so HTTPS is required.
- If you ever need a genuinely cross-site deployment, the cookie must be changed
  to `SameSite=None; Secure` **and** the exact frontend origin added to
  `FRONTEND_URL` — this weakens CSRF protection and should be a deliberate,
  reviewed decision.

Short-lived access tokens travel in the `Authorization: Bearer` header; only the
refresh token uses the cookie.

## Notes

- DDoS/volumetric protection belongs at the edge (Cloudflare or equivalent), not
  in Express. In-app rate limiting only mitigates abusive request patterns.
