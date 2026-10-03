# Manual test checklist (localhost)

Browser walk-through for the shopping flow. Everything runs locally against the
developer database; no live Razorpay keys are involved.

## Before you start

1. **Mongo** — a local MongoDB must be running.
2. **Server**
   ```bash
   cd server && npm run dev
   ```
   Expect: `MongoDB connected successfully`, `Server is running on port <PORT>`,
   and both cron jobs scheduled. Check `http://localhost:<PORT>/healthz` → 200
   and `/readyz` → `{"status":"ok","mongo":"connected"}`.
3. **Client**
   ```bash
   cd client && npm run dev
   ```
   The SPA runs on `http://localhost:3000` — it must match `FRONTEND_URL` in
   `server/.env`, otherwise CORS and the auth cookies will fail.
4. **At least one product** must exist. Create one as an admin (see
   `POST /api/products` in the Postman collection) or the storefront will be
   empty.

---

## 1. Register + verify email

1. Go to `http://localhost:3000/register`.
2. Fill in name, email, a 10-digit phone, password and an address. Submit.
3. Expect a "check your email" confirmation — **no** account exists yet.
4. Open the verification link from the email (or copy the `token` from the link
   the server logged in development).
   - `…/verify-email?token=<64 hex>` → **"Email verified"** screen.
5. Open the same link again → **"already used / invalid"** screen (400).
   ⚠️ A fresh link left unused for longer than the token TTL → **"expired"**
   screen (410). Both are distinct screens with different copy.
6. Submit the register form twice with the same email → the second attempt is
   rejected, and verifying the older link then reports
   **"account already verified"** (409).

## 2. Login / logout

1. Go to `/login` and sign in with the account you just verified.
2. Expect to land on `/account` with your name in the navbar.
3. Reload the page — you stay signed in (the session is restored from the
   refresh cookie via `GET /api/auth/me`).
4. Click **Sign out** → back to the home page, navbar shows signed-out state.
   Reload again → still signed out.

## 3. Products

1. Go to `/products`. The catalogue loads from the API (no mock data).
2. Open a product → detail page at `/products/<id>` shows price, stock and
   description.
3. Reload the product page: the request revalidates with an `ETag` (browser
   devtools shows a 304, or a 200 with `Cache-Control: max-age=30`).
4. Visit a non-existent id → a "not found" state, not a crash.

## 4. Cart + checkout (Razorpay test payment)

1. Add an item to the cart and go to `/checkout`.
2. Fill in shipping details (10-digit phone).
3. With Razorpay test keys configured, choose the online payment option and
   submit.
4. The Razorpay test checkout opens. Use a Razorpay **test** card /
   `success@razorpay` test flow.
5. On success the UI confirms and you are taken to the order.
   - The order's payment status becomes **paid**.
   - Devtools → Network: the create-payment request sends only `{ orderId }`;
     no amount, no price is sent from the browser.
6. Try submitting the payment twice (or double-click **Pay**): the second
   attempt must reuse the same Razorpay order, not create a second one.

## 5. Stock race (optional, two tabs)

1. Find a product with stock 1 and open it in two browser tabs.
2. Buy it in tab A, then immediately in tab B.
3. Exactly one order is created; the other shows "not enough stock available"
   (409). The product's available stock does not go negative.

## 6. Order paid + order detail

1. Go to `/orders`. Your orders are listed with status badges.
2. Open an order → `/orders/<id>`.
   - The page uses `GET /api/order/:id` directly (devtools shows one request to
     `/api/order/<orderNumber>`, not a chain of list pages).
   - Line items, totals, address and payment status are shown.
3. Confirm the totals match the cart (they are computed server-side).
4. Try opening another user's order id by hand → **"not found"** (404), never
   another customer's data.

## 7. Profile edit

1. Go to `/account`, find **Edit profile**.
2. Change the name → **Save changes** → success toast, navbar updates.
3. Set the phone to fewer than 10 digits → inline validation error; the request
   is not sent.
4. Set the phone to a value already used by another account → a clear conflict
   error (409 `PHONE_IN_USE`).
5. Reload → the new values persist (they came from the server, not localStorage).

## 8. Google login

1. Go to `/login` and click the Google button.
2. Choose an account. You are redirected to Google and back to
   `http://localhost:3000/auth/callback`, then land on `/account` signed in.
3. Press **Cancel** on the Google consent screen → you return to
   `/login?error=google_cancelled` with a specific message.
4. To see the other error states, you can visit them directly:
   `/login?error=google_state_invalid`, `…=google_exchange_failed`,
   `…=google_account_unverified`, `…=google_link_conflict`, `…=google_failed`.

## 9. Expired session

1. Sign in, then delete the `accessToken` from sessionStorage (or wait for it to
   expire) and make an authenticated request.
2. The client silently refreshes once and the request succeeds.
3. Sign out in another tab, then make an authenticated request → you are bounced
   to `/login?reason=session_expired`.

---

## Known limitations while testing

- **Real email** needs valid SMTP/Resend credentials. Without them,
  registration still creates the pending record; take the token from the server
  log.
- **Webhook delivery** cannot be triggered from the browser. The webhook is what
  finalizes fulfilment; without a tunnel or the Postman webhook request, an order
  stays at `confirmed` (paid) rather than `fulfilled`.
- **Fulfilment** therefore needs either a webhook (Postman request in the
  collection, or `ngrok`/cloudflared pointing at the API) or a manual DB update.
