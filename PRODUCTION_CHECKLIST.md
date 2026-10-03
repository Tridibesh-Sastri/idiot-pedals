# Production launch checklist — live Razorpay + real HTTPS domain

Branch: `integration-hardening`. Code is done and tested (server 189/189, client 18/18).
Everything below is account/hosting work the agent cannot do. Do the steps in order;
each step says how to confirm it before moving on. All env var names, file paths and
route paths are the real ones from this repo (`server/src/config/config.js`,
`server/.env.example`, `client/.env.example`).

Conventions used below — replace these placeholders with your real values:
- `https://shop.example.com` → the real frontend origin (the site customers open)
- `https://api.example.com` → the real backend origin (serves `/api/*`)
- Never commit real values. Production env lives in the host dashboard
  (Render/Railway/VPS env settings), never in the repo.

---

## 0. DNS + hosting layout (do this first — everything else depends on it)

1. Create two DNS A (or CNAME) records:
   - `shop.example.com` → frontend host
   - `api.example.com` → backend host (port is host-assigned; the app listens on
     `PORT` from env, default `5000` in `server/src/config/config.js:109`)
2. Serve HTTPS on both (host-managed certificate).
3. Decide the proxy chain in front of the Node process, because `TRUST_PROXY`
   (`server/src/app/app.js:86-88`, parsed in `server/src/config/config.js:254-265`)
   must equal the number of proxy hops, or `req.ip`, rate limiting and `Secure`
   cookies misbehave:
   - Direct VPS + Nginx (`proxy_pass` to Node): `TRUST_PROXY=1`
   - Render / Railway (their router is the only hop): `TRUST_PROXY=1`
   - Cloudflare in front of either of the above: `TRUST_PROXY=2`
   - Node directly exposed (no proxy): leave `TRUST_PROXY` unset
4. Confirm HTTPS works: `curl -sI https://api.example.com/healthz` must return
   `200` (the `/healthz` route is defined in `server/src/app/app.js:59-61`).
   There is deliberately no in-app HTTP→HTTPS redirect — the host must do it.

---

## A. Razorpay KYC → live mode

1. In the Razorpay dashboard, complete business KYC (business PAN, bank account
   for settlements, website URL = `https://shop.example.com`).
2. You know live mode is active when the dashboard header shows **Live Mode**
   (not Test Mode) and the API-keys page has a separate **Live** tab with keys
   starting `rzp_live_`.
3. Copy the live **Key ID** (`rzp_live_...`) and **Key Secret**. They go into
   `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in step E.
4. Keep the test keys somewhere safe — you need them for the Section G rollback.

## B. Domain + HTTPS env values

Set these exact variables in the backend host env (names from
`server/src/config/config.js:106-190`):

```text
NODE_ENV=production
FRONTEND_URL=https://shop.example.com
GOOGLE_CALLBACK_URL=https://api.example.com/api/auth/google/callback
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/idiot_pedals?retryWrites=true
TRUST_PROXY=<1, 2, or unset — per step 0.3>
```

Notes the server enforces at boot (it refuses to start otherwise):
- `FRONTEND_URL` must be `https://` in production, no wildcards, no paths.
  `http://localhost` is rejected in production (`config.js:237-239, 387-393`).
- `MONGO_URI` must not point at localhost in production.
- If you see `NODE_ENV: must be set explicitly because a production indicator
  is present`, it means `NODE_ENV` itself is missing — set it, don't work around it.

Frontend build env (baked at build time by Vite — set these where the
frontend builds/deploys, then rebuild):

```text
VITE_API_BASE_URL=https://api.example.com/api
VITE_RAZORPAY_KEY_ID=<see step E: test key for test builds, live key for the live build>
```

## C. Production webhook registration

1. Exact path served by this repo: `POST https://api.example.com/api/webhooks/razorpay`
   (mounted in `server/src/app/app.js:174-177`, implemented in
   `server/src/routers/webhook.routes.js:43-50`). Register exactly this URL in
   Razorpay Dashboard → Developers → Webhooks → Add webhook.
2. Enable ONLY these two events — they are the only ones the handler processes
   (`server/src/services/webhook.service.js:383-408`, anything else is stored
   as `ignored`):
   - `payment.captured`
   - `payment.failed`
3. Generate a NEW webhook secret in the Razorpay dashboard (do not reuse the
   key secret — the server refuses to boot if
   `RAZORPAY_WEBHOOK_SECRET === RAZORPAY_KEY_SECRET`, added in
   `server/src/config/config.js:474-489` on this branch).
4. Put it in `RAZORPAY_WEBHOOK_SECRET` and restart the backend.
5. Confirm: Razorpay shows a recent delivery with HTTP 200 after your first
   real payment (step F). A 4xx means the secret mismatches — re-check step 4.

## D. Google OAuth production

1. Google Cloud Console → your OAuth client → Authorized redirect URIs → add
   exactly (must match `GOOGLE_CALLBACK_URL` from step B character for character,
   `https://` included):
   ```text
   https://api.example.com/api/auth/google/callback
   ```
   This is the route served at `server/src/routers/auth.routes.js:267-271`,
   and the code sends this exact value as `redirect_uri`
   (`server/src/integrations/google/google.service.js:38,54`).
2. OAuth consent screen → Publishing status → **Publish App** (out of testing
   mode), with the production domain on the authorized-domains list.
3. Confirm: click site Sign-In → Google → approve → you land in the app signed
   in. A failure lands on `https://shop.example.com/login?error=<code>`
   (handled in `server/src/controllers/auth.controller.js:668-673`); the code
   names the cause (`access_denied`, etc.).

## E. Email (Brevo/SMTP env-only + Resend admin mail)

There is no Brevo code in this repo and no Brevo API key variable. Mail flows
through two channels selected in code, configured only by env:

- Verification emails (signup): `channel: "smtp"`
  (`server/src/services/email.service.js:13-16`) → generic SMTP via
  `SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD`
  (`server/src/integrations/mail/transports.js:28-43`). If Brevo sends these,
  it is purely because these four vars point at Brevo's SMTP relay.
- Admin order + refund-alert emails: `channel: "resend"`
  (`server/src/services/order.email.service.js`) → `RESEND_API_KEY`,
  `RESEND_FROM`, `ADMIN_ORDER_EMAIL`.

Steps:
1. Whichever provider sends each class, verify the sending domain (SPF + DKIM)
   in that provider's dashboard.
2. Set `EMAIL_FROM` to an address **on that verified domain**
   (e.g. `"IDIOT Pedals <no-reply@shop.example.com>"`) — never a
   `@gmail.com` address, or delivery fails SPF alignment.
3. Set `RESEND_FROM` to an address on the Resend-verified domain and confirm
   the Resend API key belongs to YOUR Resend account (dashboard → API keys →
   key owner), not a shared/test account.
4. `ADMIN_ORDER_EMAIL` = the inbox a human actually reads.
5. Live proof: register a real account → the verification email arrives in the
   inbox (not spam) with a working `https://shop.example.com/verify-email?token=…`
   link; place a real order → the admin inbox receives the order email with the
   right order number and total.

## F. Key swap (test → live)

1. Set in the backend host env:
   ```text
   RAZORPAY_KEY_ID=rzp_live_<key body>
   RAZORPAY_KEY_SECRET=<live key secret>
   RAZORPAY_WEBHOOK_SECRET=<new secret from step C.3>
   ```
2. Restart. If anything is wrong the process exits before listening with a
   names-only message. The three you can hit here, verbatim:
   - `RAZORPAY_KEY_ID: test keys cannot be used with NODE_ENV=production`
     → a test key is still in `RAZORPAY_KEY_ID`.
   - `RAZORPAY_KEY_ID: live keys must never be used outside NODE_ENV=production`
     → live key with non-production `NODE_ENV`.
   - `RAZORPAY_WEBHOOK_SECRET: must differ from RAZORPAY_KEY_SECRET`
     → you pasted the key secret as the webhook secret; generate a fresh one.
3. Rebuild the frontend with the live `VITE_RAZORPAY_KEY_ID` (same value class
   as the backend key: live-with-live). A test key in a production build is
   refused at runtime with “Online payments are not configured” nowhere —
   note: mismatched key classes fail at payment time, so keep them in sync.

## G. One real payment, watched end to end

Pay a small real amount (keep it minimal, e.g. one unit), then **close the tab
right after the Razorpay success modal** — this exercises the webhook-only path
(no `/verify` call), which is the path most likely to surprise you.

Confirm each hop, in order:
1. Razorpay dashboard → Payments → status **captured** for the payment.
2. Razorpay dashboard → Webhooks → the `payment.captured` delivery log shows
   HTTP **200** from `https://api.example.com/api/webhooks/razorpay`.
3. Order in the DB (use the order number from the dashboard receipt/notes):
   ```js
   db.orders.find(
     { orderNumber: 'IP-<from receipt>' },
     { orderStatus: 1, 'payment.status': 1, 'payment.razorpayPaymentId': 1,
       'pricing.totalMinor': 1, needsRefund: 1, stockConsumedAt: 1 }
   )
   // expect: orderStatus 'fulfilled', payment.status 'paid',
   // needsRefund false, stockConsumedAt set
   ```
4. Admin inbox: the order email arrived (subject contains the order number).
5. Stock decremented exactly once:
   ```js
   db.products.find(
     { slug: 'neon-fuzz-box' },
     { stock: 1, reservedStock: 1 }
   )
   // expect: stock down by the ordered qty vs before, reservedStock back to baseline
   ```
6. Then refund it for real: Razorpay dashboard → that payment → **Refund**.
   App state afterwards: **nothing changes by itself** — there is no refund API
   integration and no `refunded` transition in code. See section H.

## H. Manual refunds (refunds stay manual — no code does this)

When money is captured for an already-cancelled order, the webhook records it
and flags the order instead of fulfilling it. The admin refund-alert email
(subject `Manual refund needed — <orderNumber>`) carries everything needed.

1. Find flagged orders with the repo's real field names:
   ```js
   db.orders.find(
     { needsRefund: true },
     { orderNumber: 1, 'payment.razorpayPaymentId': 1,
       'pricing.totalMinor': 1, 'pricing.currency': 1,
       refundReason: 1, orderStatus: 1 }
   )
   // amounts are integer paise: divide totalMinor by 100 for rupees
   ```
2. Razorpay dashboard → Payments → paste `payment.razorpayPaymentId` →
   **Refund** the captured amount (`totalMinor / 100`).
3. App state afterwards: the order stays `cancelled` with `needsRefund: true`
   — nothing records the refund and no status changes. Marking it done is a
   human bookkeeping step outside the app (e.g. a note on the dashboard
   payment). Do NOT hand-edit the order document to invent a `refunded`
   status the state machine never produced.

## I. Rollback to test keys (under 5 minutes)

Note up front: with `NODE_ENV=production` the server **refuses** `rzp_test_`
keys by design, so a rollback is a deliberate two-variable change + restart,
not a silent swap:

1. In the backend host env, set:
   ```text
   NODE_ENV=development
   RAZORPAY_KEY_ID=rzp_test_<your saved test key id>
   RAZORPAY_KEY_SECRET=<your saved test key secret>
   ```
   (Keep `RAZORPAY_WEBHOOK_SECRET` as-is — test webhooks can be re-registered
   against it, or leave live webhooks failing closed while rolled back.)
2. Restart. The process must log a normal listen line with no `ConfigError`.
   If you forget `NODE_ENV`, you will see exactly:
   `RAZORPAY_KEY_ID: test keys cannot be used with NODE_ENV=production` —
   that message means the guard worked; set `NODE_ENV=development` and restart.
3. Rebuild/redeploy the frontend with `VITE_RAZORPAY_KEY_ID` set back to the
   test key id (Vite bakes it at build time — a backend-only change is not
   enough for the modal to open).
4. Sanity: complete one test purchase; confirm no live charge exists in the
   Razorpay dashboard's **Live Mode** view.
5. Going live again = Section F from the top (live keys + `NODE_ENV=production`
   + live frontend key rebuild).

## J. Post-deploy verification (browser, 5 minutes)

1. DevTools → Network: complete a browse → product → checkout flow and confirm
   every `/api/*` call goes to `https://api.example.com/api/*` — this catches a
   wrong or missing `VITE_API_BASE_URL` bake (the build does not fail without
   it; it falls back to same-origin `/api`).
2. DevTools → Application → Cookies after signing in: `refreshToken` shows
   `Secure` ✓, `HttpOnly` ✓, `SameSite=Strict` ✓, `Path=/` ✓.
   (Flags asserted in tests at `server/tests/security.test.js` `cookies`
   block; this step confirms the real browser agrees.)
3. DevTools → Console on Home, Shop, Product, Checkout, Orders pages: no red
   errors, and nothing sensitive printed. Reference: the only `console.*` in
   shipped `client/src` is a dev-only config hint
   (`client/src/services/apiConfig.ts:32-39`, `import.meta.env.DEV`-gated),
   and production bundles strip console calls
   (`client/vite.config.ts:30-33`).
