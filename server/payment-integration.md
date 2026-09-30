Absolutely. Let's make this the **master Razorpay integration checklist** for IDIOT Pedals. We can use it as our progress tracker and move through it one item at a time.

I've aligned the security-critical parts with Razorpay's current guidance: server-side order creation, secret protection, trusted order IDs for signature verification, HMAC-verified webhooks, and testing before switching to Live Mode. ([Razorpay][1])

# 🔴 IDIOT Pedals — Razorpay Integration Master Roadmap

**Status legend**

* ⬜ Not started
* 🟡 In progress
* ✅ Completed
* 🔴 Problem / needs fixing
* 🔵 Tested

---

# PHASE 0 — Architecture & Decisions

### 0.1 Payment architecture

* ⬜ Confirm Razorpay Standard Checkout
* ⬜ Confirm backend-authoritative payment architecture
* ⬜ Confirm MongoDB is the internal payment/order source of truth
* ⬜ Separate `Order` from `Payment`
* ⬜ Separate Razorpay integration from Shiprocket integration
* ⬜ Define payment state machine
* ⬜ Define order state machine

Target:

```text
Customer
   │
   ▼
React
   │
   ▼
Express Backend
   │
   ├──────────────► MongoDB
   │
   └──────────────► Razorpay
                         │
                         ▼
                     Checkout
                         │
                         ▼
                      Payment
                         │
                  ┌──────┴──────┐
                  ▼             ▼
              Callback       Webhook
                  │             │
                  └──────┬──────┘
                         ▼
                      Backend
                         │
                         ▼
                       Order
```

---

# PHASE 1 — Razorpay Test Environment

You have already completed most of this.

### Account

* ✅ Razorpay developer/test account created
* ✅ Test Mode available
* ✅ Test Key ID obtained
* ✅ Test Key Secret obtained
* ⬜ Confirm Test Mode remains enabled

Razorpay's Test Mode is specifically intended for simulated transactions without real money. ([Razorpay][2])

### Security

* ⬜ Never commit Test Secret to Git
* ⬜ Never put Secret in React
* ⬜ Never expose Secret through an API response
* ⬜ Add `.env` to `.gitignore`
* ⬜ Create separate environment variables for test/live credentials

---

# PHASE 2 — Backend Environment

Create:

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### Checklist

* ⬜ Add Razorpay variables to backend `.env`
* ⬜ Add variables to environment configuration
* ⬜ Validate required environment variables at startup
* ⬜ Ensure secrets aren't logged
* ⬜ Ensure `.env` isn't committed
* ⬜ Decide production secret-storage mechanism

Razorpay explicitly recommends keeping API secrets out of source control and securely managing them. ([Razorpay][1])

---

# PHASE 3 — Install & Configure Razorpay SDK

### Backend

* ⬜ Install Razorpay Node SDK
* ⬜ Verify package installation
* ⬜ Create:

```text
backend/src/integrations/razorpay/
```

* ⬜ Create `razorpay.client.js`
* ⬜ Create `razorpay.service.js`
* ⬜ Create `razorpay.mapper.js`

Target:

```text
integrations/
└── razorpay/
    ├── razorpay.client.js
    ├── razorpay.service.js
    └── razorpay.mapper.js
```

### Client

* ⬜ Initialize Razorpay SDK with server credentials
* ⬜ Verify backend can communicate with Razorpay Test API
* ⬜ Create a small integration test
* ⬜ Confirm Test API response

Razorpay's current API examples use the Key ID and Key Secret for authenticated server-side API calls. ([Razorpay][3])

---

# PHASE 4 — Design Internal Payment Model

Before writing payment code, lock the database representation.

For example:

```text
Order
│
├── _id
├── orderNumber
├── userId
│
├── items[]
│
├── pricing
│
├── shippingAddress
│
├── payment
│   ├── method
│   ├── status
│   ├── razorpayOrderId
│   ├── razorpayPaymentId
│   └── ...
│
├── orderStatus
│
└── timestamps
```

### Payment fields

* ⬜ `method`
* ⬜ `status`
* ⬜ `razorpayOrderId`
* ⬜ `razorpayPaymentId`
* ⬜ `razorpaySignature`
* ⬜ payment amount
* ⬜ currency
* ⬜ payment timestamps
* ⬜ failure information where appropriate

### Important separation

```text
payment.status

pending
paid
failed
refunded
```

versus:

```text
order.status

pending
confirmed
processing
shipped
delivered
cancelled
returned
refunded
```

Don't collapse these into one status.

---

# PHASE 5 — Internal Order Creation

Create:

```http
POST /api/orders
```

Frontend sends something like:

```json
{
  "items": [
    {
      "productId": "...",
      "quantity": 1
    }
  ],
  "shippingAddressId": "...",
  "paymentMethod": "razorpay"
}
```

### Backend must

* ⬜ Authenticate user
* ⬜ Validate product ID
* ⬜ Fetch product from MongoDB
* ⬜ Validate product availability
* ⬜ Validate quantity
* ⬜ Read authoritative price
* ⬜ Calculate subtotal
* ⬜ Calculate shipping
* ⬜ Calculate discount if applicable
* ⬜ Calculate final total
* ⬜ Never trust frontend price
* ⬜ Create order snapshot
* ⬜ Set payment status = `pending`
* ⬜ Set order status appropriately
* ⬜ Generate internal order number

Example:

```text
IDIOT Order
IP-2026-000001
```

At this point:

```text
MongoDB

Order
  │
  ├── payment.status = pending
  └── razorpayOrderId = null
```

---

# PHASE 6 — Create Razorpay Order

Create:

```http
POST /api/payments/razorpay/create
```

Flow:

```text
Internal Order
      │
      ▼
Backend
      │
      ├── Read order total
      │
      ▼
Razorpay Orders API
      │
      ▼
Razorpay Order
      │
      ▼
razorpay_order_id
```

### Checklist

* ⬜ Receive internal order ID
* ⬜ Authenticate user
* ⬜ Retrieve internal order from DB
* ⬜ Verify order belongs to user
* ⬜ Verify order is payable
* ⬜ Read amount from DB
* ⬜ Convert INR → paise
* ⬜ Create Razorpay Order
* ⬜ Store `razorpayOrderId`
* ⬜ Return safe checkout data

Example:

```text
₹2,499
     ↓ ×100
249900 paise
```

Razorpay's Orders API is designed to create the server-side order that is then associated with the checkout payment. ([Razorpay][3])

---

# PHASE 7 — Frontend Razorpay Checkout

### React

* ⬜ Add Razorpay Checkout script/integration
* ⬜ Receive checkout configuration from backend
* ⬜ Pass only public Key ID
* ⬜ Pass Razorpay Order ID
* ⬜ Pass amount/currency
* ⬜ Pass customer information
* ⬜ Configure branding
* ⬜ Open checkout

Important:

```text
Frontend receives:

KEY_ID          ✅
razorpayOrderId ✅
amount          ✅

KEY_SECRET      ❌ NEVER
WEBHOOK_SECRET  ❌ NEVER
```

---

# PHASE 8 — Successful Payment Callback

Razorpay Checkout returns payment information to the frontend.

Typically:

```text
razorpay_payment_id
razorpay_order_id
razorpay_signature
```

Frontend then sends the result to:

```http
POST /api/payments/razorpay/verify
```

### Backend

* ⬜ Authenticate request
* ⬜ Receive payment ID
* ⬜ Receive Razorpay order ID
* ⬜ Receive signature
* ⬜ Find internal order
* ⬜ Retrieve **trusted** Razorpay Order ID from DB
* ⬜ Generate expected HMAC
* ⬜ Compare signatures
* ⬜ Reject invalid signature
* ⬜ Verify amount/order relationship
* ⬜ Update payment
* ⬜ Update order

Razorpay specifically recommends retrieving the order ID from a trusted source such as your database when generating the HMAC rather than trusting a client-supplied order ID. ([Razorpay][1])

---

# PHASE 9 — Payment State Management

Design explicit transitions.

### Successful payment

```text
pending
   ↓
paid
```

### Failed payment

```text
pending
   ↓
failed
```

### Refund

```text
paid
   ↓
refunded
```

### Invalid signature

```text
payment rejected
```

Never:

```text
Frontend says SUCCESS
        ↓
Database says PAID
```

Instead:

```text
Frontend says SUCCESS
        ↓
Backend verifies
        ↓
Valid?
 ┌──────┴──────┐
YES           NO
 │             │
 ▼             ▼
PAID         REJECT
```

---

# PHASE 10 — Razorpay Webhooks

Create:

```http
POST /api/webhooks/razorpay
```

This is one of the most important parts.

### Setup

* ⬜ Create Test webhook
* ⬜ Configure webhook URL
* ⬜ Generate webhook secret
* ⬜ Store webhook secret in `.env`
* ⬜ Configure required events

Razorpay recommends validating webhook requests using HMAC. ([Razorpay][1])

### Backend

* ⬜ Receive raw webhook body
* ⬜ Verify webhook signature
* ⬜ Reject invalid signature
* ⬜ Parse event
* ⬜ Identify event
* ⬜ Find internal order
* ⬜ Update payment state
* ⬜ Update order state
* ⬜ Return successful response

---

# PHASE 11 — Webhook Idempotency

This is critical.

Imagine Razorpay sends:

```text
payment.captured
```

three times.

Your backend must **not**:

```text
3 × confirm order
3 × send email
3 × create shipment
3 × reduce stock
```

Instead:

```text
Webhook #1 → process ✅

Webhook #2 → already processed → ignore

Webhook #3 → already processed → ignore
```

### Checklist

* ⬜ Store Razorpay event ID
* ⬜ Add unique constraint/index where appropriate
* ⬜ Check whether event was already processed
* ⬜ Make state transitions idempotent
* ⬜ Prevent duplicate shipment creation
* ⬜ Prevent duplicate emails
* ⬜ Test duplicate webhook

Razorpay's current material also emphasizes webhook signing and idempotency/replay protection. ([Razorpay][4])

---

# PHASE 12 — Browser vs Webhook Reconciliation

We need to handle situations such as:

### Scenario A

```text
Customer pays
     ↓
Payment successful
     ↓
Browser crashes
```

Webhook should still update the backend.

### Scenario B

```text
Customer pays
     ↓
Frontend receives success
     ↓
Verification request fails
```

Webhook should recover the state.

### Scenario C

```text
Payment succeeds
     ↓
Webhook arrives
     ↓
Frontend also verifies
```

Both must safely converge to:

```text
payment.status = paid
```

---

# PHASE 13 — Payment Failure Handling

Test:

* ⬜ User cancels checkout
* ⬜ Card failure
* ⬜ UPI failure
* ⬜ Payment timeout
* ⬜ Network disconnect
* ⬜ Browser refresh
* ⬜ Browser closes
* ⬜ Backend temporarily unavailable
* ⬜ Invalid signature
* ⬜ Wrong order ID
* ⬜ Duplicate verification request

Expected behaviour:

```text
FAILED PAYMENT

Order remains
     │
     ▼
payment = failed
     │
     ▼
Customer can retry
     │
     ▼
Create/reuse appropriate payment flow
```

Razorpay's integration guidance recommends testing failed and interrupted transactions before going live. ([Razorpay][5])

---

# PHASE 14 — Payment Retry

Design:

```text
Order
  │
  └── payment failed
          │
          ▼
       Retry
          │
          ▼
New payment attempt
```

### Checklist

* ⬜ Decide whether a new Razorpay Order is created for retry
* ⬜ Prevent payment on cancelled orders
* ⬜ Prevent payment on already-paid orders
* ⬜ Prevent paying wrong amount
* ⬜ Track attempts if required
* ⬜ Test multiple failed attempts

---

# PHASE 15 — Inventory Interaction

Payment shouldn't blindly modify inventory multiple times.

Define:

```text
Order created
      ↓
Inventory reservation/deduction policy
      ↓
Payment
      ↓
Confirmation
```

### Checklist

* ⬜ Decide when stock is reserved
* ⬜ Decide when stock is permanently deducted
* ⬜ Handle failed payment
* ⬜ Handle abandoned order
* ⬜ Handle payment retry
* ⬜ Prevent overselling
* ⬜ Make inventory operations idempotent

We'll finalize this alongside the order service rather than hiding it inside Razorpay.

---

# PHASE 16 — Email Integration

After payment state is reliably confirmed:

* ⬜ Payment confirmation email
* ⬜ Order confirmation email
* ⬜ Failed payment email where appropriate
* ⬜ Retry-payment email where appropriate
* ⬜ Prevent duplicate emails from duplicate webhooks

Important architecture:

```text
Razorpay webhook
      ↓
Payment confirmed
      ↓
Order confirmed
      ↓
Email service
```

Not:

```text
Frontend callback
      ↓
Send "Payment Successful" email
```

---

# PHASE 17 — Connect Razorpay → Shiprocket

**Only after Razorpay is stable.**

```text
Payment confirmed
       ↓
Order confirmed
       ↓
Fulfillment workflow
       ↓
Shiprocket
       ↓
Shipment created
       ↓
AWB
       ↓
Tracking
```

### Checklist

* ⬜ Payment confirmed
* ⬜ Order confirmed
* ⬜ Trigger shipment workflow
* ⬜ Create Shiprocket order
* ⬜ Store shipment ID
* ⬜ Store AWB
* ⬜ Store courier
* ⬜ Store tracking URL
* ⬜ Handle Shiprocket failure separately
* ⬜ Prevent duplicate shipment creation

Remember:

```text
Razorpay failure ≠ Shiprocket failure

Shiprocket failure ≠ Order deletion
```

---

# PHASE 18 — Security Review

### Secrets

* ⬜ No Razorpay secret in React
* ⬜ No Razorpay secret in Git
* ⬜ No secret in logs
* ⬜ No secret in API response
* ⬜ Production secrets separated from test secrets
* ⬜ Secret rotation procedure documented

### Backend

* ⬜ Authentication required
* ⬜ Authorization checked
* ⬜ User can only pay their own order
* ⬜ Amount comes from DB
* ⬜ Product price comes from DB
* ⬜ Order ID comes from trusted DB state
* ⬜ Signature verified
* ⬜ Webhook HMAC verified
* ⬜ Duplicate webhook protection
* ⬜ Rate limiting
* ⬜ Input validation

Razorpay's security checklist specifically calls out secret protection, HTTPS, trusted order IDs, callback signature validation and webhook HMAC validation. ([Razorpay][1])

---

# PHASE 19 — Local Testing

We should prove the entire flow locally.

### Basic

* ⬜ Backend starts
* ⬜ MongoDB connected
* ⬜ Razorpay Test API connected
* ⬜ Product loaded
* ⬜ Order created
* ⬜ Razorpay order created
* ⬜ Checkout opens

### Successful payment

* ⬜ Test payment succeeds
* ⬜ Callback received
* ⬜ Signature verified
* ⬜ Payment becomes `paid`
* ⬜ Order becomes `confirmed`
* ⬜ Webhook received
* ⬜ Duplicate webhook handled

### Failure

* ⬜ Payment failure
* ⬜ Payment cancellation
* ⬜ Retry
* ⬜ Failed payment doesn't confirm order

### Edge cases

* ⬜ Refresh checkout
* ⬜ Close browser
* ⬜ Double-click Pay
* ⬜ Duplicate verification
* ⬜ Duplicate webhook
* ⬜ Wrong signature
* ⬜ Wrong order
* ⬜ Wrong amount
* ⬜ Expired/cancelled order
* ⬜ Backend timeout

Razorpay recommends maintaining test cases and validating both successful and failed scenarios before launch. ([Razorpay][2])

---

# PHASE 20 — Staging / Production Testing

Before real customers:

* ⬜ Deploy backend
* ⬜ HTTPS working
* ⬜ Production-like database
* ⬜ Test credentials configured
* ⬜ Webhook publicly reachable
* ⬜ Webhook signature verified
* ⬜ Test checkout works on deployed frontend
* ⬜ Desktop tested
* ⬜ Mobile tested
* ⬜ Slow network tested
* ⬜ Error monitoring enabled
* ⬜ Logs verified

---

# PHASE 21 — Production Razorpay Account

Only now:

```text
IDIOT Pedals
     ↓
Actual Razorpay Merchant Account
     ↓
KYC / activation
     ↓
Live Mode
```

### Production credentials

* ⬜ Live Key ID
* ⬜ Live Key Secret
* ⬜ Live Webhook Secret

### Production configuration

* ⬜ Production API credentials
* ⬜ Production webhook URL
* ⬜ Production webhook secret
* ⬜ Correct business/merchant information
* ⬜ Bank settlement details
* ⬜ Dashboard 2FA
* ⬜ Production environment variables

Razorpay's guidance describes the transition as testing with sandbox credentials, then replacing them with live credentials and rechecking webhook/return configuration before accepting real payments. ([Razorpay][5])

---

# PHASE 22 — Go-Live Verification

Before switching the website to production payments:

### Payment

* ⬜ Live Key ID configured
* ⬜ Live Secret configured
* ⬜ Live webhook configured
* ⬜ Webhook signature verified
* ⬜ Correct INR amount
* ⬜ Correct order ID
* ⬜ Correct merchant information
* ⬜ Payment confirmation works

### Order

* ⬜ Order created
* ⬜ Payment confirmed
* ⬜ Order confirmed
* ⬜ Email sent
* ⬜ Inventory updated
* ⬜ Shiprocket triggered
* ⬜ Shipment created

### Customer

* ⬜ Order confirmation page
* ⬜ Order history
* ⬜ Payment status
* ⬜ Shipment tracking
* ⬜ Mobile checkout
* ⬜ Failed-payment retry

---

# PHASE 23 — Production Monitoring

After launch:

* ⬜ Monitor successful payments
* ⬜ Monitor failed payments
* ⬜ Monitor webhook failures
* ⬜ Monitor duplicate events
* ⬜ Monitor payment/order mismatches
* ⬜ Monitor Razorpay API errors
* ⬜ Monitor Shiprocket failures
* ⬜ Monitor email failures
* ⬜ Monitor settlement/reconciliation

Razorpay recommends ongoing monitoring of transactions, settlements and error logs after launch. ([Razorpay][5])

---

### files created

- .env updated with razorpay id and razorpay secret, razorpay webhook remainig
- src/config/config.js invoked razorpay id and razorpay secret from .env
- src/middlewares/validate.js
- src/middlewares/authenticate.js

// Auth
- src/models/user.model.js
- src/models/pendingRegistration.js
- src/models/refreshToken.model.js
- src/utils/tokenManager.js
- src/validators/auth.validator.js
- src/integrations/google/google.service.js
- src/controllers/auth.controller.js
- src/controllers/logoutControlle.js
- src/services/auth.service.js
- src/services/email.services.js
- src/routers/auth.routes.js

// products
- src/models/product.model.js
- src/validators/product.validator.js
- src/controllers/product.controller.js
- src/services/product.service.js
- src/routers/product.routes.js

// order
- src/validators/order.validator.js
- src/controllers/order.controller.js
- src/services/order.service.js
- src/router/order.routes.js

// razorpay
- src/integrations/razorpay/razorpay.client.js
- src/integrations/razorpay/razorpay.service.js
- src/validators/payment.validator.js
- src/controllers/payment.controller.js
- src/services/payment.service.js
- src/routers/payment.routes.js

// razorpay webhooks
- src/modles/webhookEvent.model.js
- src/controllers/webhook.controller.js
- src/services/webhook.service.js
- src/routers/webhook.routes.js


// online order body

{
  "items": [
    {
      "productId": "6abb3665d71202ec710072e6",
      "quantity": 1
    }
  ],
  "paymentMethod": "razorpay",
  "customer": {
    "name": "Race Test",
    "email": "your-test-email@example.com",
    "phone": "9999999999"
  },
  "shippingAddress": {
    "name": "Race Test",
    "phone": "9999999999",
    "addressLine1": "Test Address",
    "city": "Kolkata",
    "state": "West Bengal",
    "postalCode": "700001",
    "country": "India"
  }
}

PAYMENT BACKEND
│
├── 1. Create Razorpay Order              ✅
├── 2. Store Razorpay Order ID            ✅
├── 3. Verify Checkout Signature           ✅
├── 4. Verify actual payment status        🔨 NOW
├── 5. Verify amount/order/currency        🔨 NOW
├── 6. Idempotent payment confirmation     🔨 NOW
├── 7. Handle payment failure              🔨
├── 8. Razorpay Webhook                    🔨
├── 9. Webhook signature verification      🔨
├── 10. Webhook idempotency                🔨
├── 11. Refund infrastructure              🔨
├── 12. Post-payment order transition      🔨
└── 13. Postman test suite                 🔨

# 🧭 MASTER PROGRESS TRACKER

This is the compact version we'll use as we work:

```text
RAZORPAY — IDIOT PEDALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[x] 01  Architecture
[x] 02  Test Account
[x] 03  Environment Variables
[x] 04  Razorpay SDK
[x] 05  Razorpay Client
[ ] 06  Payment Database Model
[ ] 07  Internal Order Creation
[ ] 08  Razorpay Order Creation    
[ ] 09  React Checkout
[ ] 10  Payment Callback
[ ] 11  Signature Verification
[ ] 12  Payment State Machine
[ ] 13  Webhook
[ ] 14  Webhook HMAC Verification
[ ] 15  Webhook Idempotency
[ ] 16  Payment Retry
[ ] 17  Failure Handling
[ ] 18  Inventory Integration
[ ] 19  Email Integration
[ ] 20  Shiprocket Integration
[ ] 21  Security Review
[ ] 22  Local Test Matrix
[ ] 23  Staging Test
[ ] 24  Production Razorpay Account
[ ] 25  Live Credentials
[ ] 26  Live Webhook
[ ] 27  Go-Live Verification
[ ] 28  Production Monitoring
```

### Our immediate position

Based on what you've already done:

```text
01 Architecture             ✅
02 Test Account             ✅
03 Test Key ID              ✅
04 Test Key Secret          ✅

05 Razorpay SDK             ⬜  ← NEXT
06 Razorpay Client          ⬜
07 Payment DB Model         ⬜
...
```

So **we should not jump to Checkout yet**.

Our next step is simply:

> **Install the Razorpay Node SDK → configure your backend environment → create `razorpay.client.js` → make one safe Test API call and confirm that our backend can communicate with Razorpay.**

After that we mark **Phase 3 complete** and move to the next checkbox. This keeps the integration controlled rather than mixing 10 moving parts at once.



Razorpay {
  key_id: 'rzp_test_ThYAEqKNccXjTD',
  key_secret: '0sjgUV1CswgzllboN3oHNH9w',
  oauthToken: undefined,
  api: API {
    version: 'v1',
    rq: [Function: wrap] {
      constructor: [Function: wrap],
      request: [Function: wrap],
      _request: [Function: wrap],
      getUri: [Function: wrap],
      delete: [Function: wrap],
      get: [Function: wrap],
      head: [Function: wrap],
      options: [Function: wrap],
      post: [Function: wrap],
      postForm: [Function: wrap],
      put: [Function: wrap],
      putForm: [Function: wrap],
      patch: [Function: wrap],
      patchForm: [Function: wrap],
      query: [Function: wrap],
      defaults: [Object: null prototype],
      interceptors: [Object],
      create: [Function: create]
    }
  },
  accounts: {
    create: [Function: create],
    edit: [Function: edit],
    fetch: [Function: fetch],
    delete: [Function: _delete],
    uploadAccountDoc: [Function: uploadAccountDoc],
    fetchAccountDoc: [Function: fetchAccountDoc]
  },
  stakeholders: {
    create: [Function: create],
    edit: [Function: edit],
    fetch: [Function: fetch],
    all: [Function: all],
    uploadStakeholderDoc: [Function: uploadStakeholderDoc],
    fetchStakeholderDoc: [Function: fetchStakeholderDoc]
  },
  payments: {
    all: [Function: all],
    fetch: [Function: fetch],
    capture: [Function: capture],
    createPaymentJson: [Function: createPaymentJson],
    createRecurringPayment: [Function: createRecurringPayment],
    edit: [Function: edit],
    refund: [Function: refund],
    fetchMultipleRefund: [Function: fetchMultipleRefund],
    fetchRefund: [Function: fetchRefund],
    fetchTransfer: [Function: fetchTransfer],
    transfer: [Function: transfer],
    bankTransfer: [Function: bankTransfer],
    fetchCardDetails: [Function: fetchCardDetails],
    fetchPaymentDowntime: [Function: fetchPaymentDowntime],
    fetchPaymentDowntimeById: [Function: fetchPaymentDowntimeById],
    otpGenerate: [Function: otpGenerate],
    otpSubmit: [Function: otpSubmit],
    otpResend: [Function: otpResend],
    createUpi: [Function: createUpi],
    validateVpa: [Function: validateVpa],
    fetchPaymentMethods: [Function: fetchPaymentMethods]
  },
  refunds: {
    all: [Function: all],
    edit: [Function: edit],
    fetch: [Function: fetch]
  },
  orders: {
    all: [Function: all],
    fetch: [Function: fetch],
    create: [Function: create],
    edit: [Function: edit],
    fetchPayments: [Function: fetchPayments],
    fetchTransferOrder: [Function: fetchTransferOrder],
    viewRtoReview: [Function: viewRtoReview],
    editFulfillment: [Function: editFulfillment]
  },
  customers: {
    create: [Function: create],
    edit: [Function: edit],
    fetch: [Function: fetch],
    all: [Function: all],
    fetchTokens: [Function: fetchTokens],
    fetchToken: [Function: fetchToken],
    deleteToken: [Function: deleteToken],
    addBankAccount: [Function: addBankAccount],
    deleteBankAccount: [Function: deleteBankAccount],
    requestEligibilityCheck: [Function: requestEligibilityCheck],
    fetchEligibility: [Function: fetchEligibility]
  },
  transfers: {
    all: [Function: all],
    fetch: [Function: fetch],
    create: [Function: create],
    edit: [Function: edit],
    reverse: [Function: reverse],
    fetchSettlements: [Function: fetchSettlements]
  },
  tokens: {
    create: [Function: create],
    fetch: [Function: fetch],
    delete: [Function: _delete],
    processPaymentOnAlternatePAorPG: [Function: processPaymentOnAlternatePAorPG]
  },
  virtualAccounts: {
    all: [Function: all],
    fetch: [Function: fetch],
    create: [Function: create],
    close: [Function: close],
    fetchPayments: [Function: fetchPayments],
    addReceiver: [Function: addReceiver],
    allowedPayer: [Function: allowedPayer],
    deleteAllowedPayer: [Function: deleteAllowedPayer]
  },
  invoices: {
    create: [Function: create],
    edit: [Function: edit],
    issue: [Function: issue],
    delete: [Function: _delete],
    cancel: [Function: cancel],
    fetch: [Function: fetch],
    all: [Function: all],
    notifyBy: [Function: notifyBy]
  },
  iins: { fetch: [Function: fetch], all: [Function: all] },
  paymentLink: {
    create: [Function: create],
    cancel: [Function: cancel],
    fetch: [Function: fetch],
    all: [Function: all],
    edit: [Function: edit],
    notifyBy: [Function: notifyBy]
  },
  plans: {
    create: [Function: create],
    fetch: [Function: fetch],
    all: [Function: all]
  },
  products: {
    requestProductConfiguration: [Function: requestProductConfiguration],
    edit: [Function: edit],
    fetch: [Function: fetch],
    fetchTnc: [Function: fetchTnc]
  },
  subscriptions: {
    create: [Function: create],
    fetch: [Function: fetch],
    update: [Function: update],
    pendingUpdate: [Function: pendingUpdate],
    cancelScheduledChanges: [Function: cancelScheduledChanges],
    pause: [Function: pause],
    resume: [Function: resume],
    deleteOffer: [Function: deleteOffer],
    all: [Function: all],
    cancel: [Function: cancel],
    createAddon: [Function: createAddon],
    createRegistrationLink: [Function: createRegistrationLink]
  },
  addons: {
    fetch: [Function: fetch],
    delete: [Function: _delete],
    all: [Function: all]
  },
  settlements: {
    createOndemandSettlement: [Function: createOndemandSettlement],
    all: [Function: all],
    fetch: [Function: fetch],
    fetchOndemandSettlementById: [Function: fetchOndemandSettlementById],
    fetchAllOndemandSettlement: [Function: fetchAllOndemandSettlement],
    reports: [Function: reports]
  },
  qrCode: {
    create: [Function: create],
    all: [Function: all],
    fetchAllPayments: [Function: fetchAllPayments],
    fetch: [Function: fetch],
    close: [Function: close]
  },
  fundAccount: { create: [Function: create], fetch: [Function: fetch] },
  items: {
    all: [Function: all],
    fetch: [Function: fetch],
    create: [Function: create],
    edit: [Function: edit],
    delete: [Function: _delete]
  },
  cards: {
    fetch: [Function: fetch],
    requestCardReference: [Function: requestCardReference]
  },
  webhooks: {
    create: [Function: create],
    edit: [Function: edit],
    all: [Function: all],
    fetch: [Function: fetch],
    delete: [Function: _delete]
  },
  documents: { create: [Function: create], fetch: [Function: fetch] },
  disputes: {
    fetch: [Function: fetch],
    all: [Function: all],
    accept: [Function: accept],
    contest: [Function: contest]
  }
}



Excellent. **This is a complete success.** 🎉

We have now successfully tested the **actual Razorpay payment pipeline end-to-end**.

### What just worked

```text
1. Internal Order
   ↓
2. Razorpay Order
   ↓
3. Razorpay Checkout
   ↓
4. Test payment
   ↓
5. Razorpay payment response
   ↓
6. Backend verification
   ↓
7. MongoDB update
```

Your verification response confirms:

```json
{
  "success": true,
  "message": "Payment verified successfully.",
  "payment": {
    "status": "paid",
    "razorpayOrderId": "order_ThvB2hKGl1hgSy",
    "razorpayPaymentId": "pay_ThvC7iCOHXlWje"
  },
  "orderStatus": "confirmed"
}
```

So the **frontend → backend → Razorpay → MongoDB** callback path is working.

---

## We have also already proven the webhook path

From the previous test, the webhook independently changed the database to:

```text
payment.status = paid
orderStatus    = confirmed
```

So we now have **two independent payment confirmation mechanisms**:

```text
                         Razorpay
                            │
                ┌───────────┴───────────┐
                │                       │
        Checkout Response        payment.captured
                │                       │
                ▼                       ▼
     /payments/razorpay/verify   /webhooks/razorpay
                │                       │
                ▼                       ▼
             ┌────────────────────────────┐
             │          MongoDB            │
             │                            │
             │ payment.status = paid      │
             │ orderStatus = confirmed    │
             └────────────────────────────┘
```

That's exactly the architecture we wanted.

---

# One thing to verify

For this latest order:

```text
Internal Order:
6abbe955182fc83ffdfb86f8

Razorpay Order:
order_ThvB2hKGl1hgSy

Payment:
pay_ThvC7iCOHXlWje
```

check MongoDB.

We expect:

```json
{
  "payment": {
    "method": "razorpay",
    "status": "paid",
    "razorpayOrderId": "order_ThvB2hKGl1hgSy",
    "razorpayPaymentId": "pay_ThvC7iCOHXlWje"
  },
  "orderStatus": "confirmed"
}
```

If that's there, **the entire V1 Razorpay integration test is green.**

---

# What we've now tested

| Component | Status |
|---|---|
| Internal order creation | ✅ |
| Product price authority | ✅ |
| ₹ → paise conversion | ✅ |
| Razorpay order creation | ✅ |
| Razorpay Test Checkout | ✅ |
| Test payment | ✅ |
| Razorpay payment ID | ✅ |
| Razorpay signature | ✅ |
| Backend signature verification | ✅ |
| Razorpay payment fetch | ✅ |
| Amount validation | ✅ |
| Currency validation | ✅ |
| Razorpay order matching | ✅ |
| Payment status validation | ✅ |
| MongoDB payment update | ✅ |
| MongoDB order confirmation | ✅ |
| Webhook endpoint | ✅ |
| Webhook signature validation | ✅ |
| Webhook → MongoDB update | ✅ |
| Temporary frontend CORS | ✅ |
| Callback verification API | ✅ |

### This means we should **stop modifying Razorpay core logic now.**

The next sensible testing phase is:

1. **Webhook idempotency** — same webhook twice must not duplicate/update incorrectly.
2. **Payment failure** — verify `payment.failed`.
3. **Invalid/tampered signature** — must be rejected.
4. **Wrong order/payment combination** — must be rejected.
5. **Webhook vs callback race** — either can arrive first without corrupting the order.
6. **COD flow** — completely separate from Razorpay.
7. Then move to **Shiprocket integration**.

And importantly, we don't need to redesign the current payment architecture. It is now behaving as intended.






===== TEST CONFIGURATION =====

{
  "API_BASE_URL": "https://builds-packard-cream-speaker.trycloudflare.com",
  "ORDER_ID": "6abc820256705acd4a7515ed",
  "RAZORPAY_ORDER_ID": "order_Ti6Phdl0Y5k2HD",
  "amount": 499900,
  "currency": "INR"
}

===== RAZORPAY CHECKOUT RESPONSE =====

{
  "razorpay_payment_id": "pay_Ti6QiEOOJ4VlIJ",
  "razorpay_order_id": "order_Ti6Phdl0Y5k2HD",
  "razorpay_signature": "46dff898265c4efa1ed0e3eab459863ade3757ed704e5a4d6c0c74bb33b81ae1"
}

===== PAYMENT VERIFICATION REQUEST =====

{
  "orderId": "6abc820256705acd4a7515ed",
  "razorpayPaymentId": "pay_Ti6QiEOOJ4VlIJ",
  "razorpayOrderId": "order_Ti6Phdl0Y5k2HD",
  "razorpaySignature": "46dff898265c4efa1ed0e3eab459863ade3757ed704e5a4d6c0c74bb33b81ae1"
}

===== BACKEND VERIFICATION RESPONSE =====

{
  "httpStatus": 200,
  "response": {
    "success": true,
    "message": "Payment verified successfully.",
    "payment": {
      "status": "paid",
      "razorpayOrderId": "order_Ti6Phdl0Y5k2HD",
      "razorpayPaymentId": "pay_Ti6QiEOOJ4VlIJ"
    },
    "orderStatus": "confirmed"
  }
}

===== IMPORTANT =====

The webhook is processed independently by Razorpay → backend. Check MongoDB and backend terminal for the final order state.