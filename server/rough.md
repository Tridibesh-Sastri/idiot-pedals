## collections
1. User
2. refresh

## email services 
    - resend  
    - brevo

## protections
1. email verification 
    - Pending Registration State
2. captcha (bot protection)
3. rate limits
4. ip registration limits
5. searching the whole db - indexing solves it
6. add isSuspisious property to user
7. every token pair genration should have breach detection mechanism
where we have it only for refresh API only
8. how to handle order spam after login





## Auth APIs
- POST /api/auth/register ✅
- POST /api/auth/login ✅
- POST /api/auth/refresh 
- POST /api/auth/logout
- POST /api/auth/verify-email
- GET /api/auth/google
- GET /api/auth/google/callback


## google Oauth implementation steps

STEP 1 ✅
Google Cloud OAuth configuration
        ↓
STEP 2 ✅
Environment variables
        ↓
STEP 3 ✅
google.service.js
        ↓
STEP 4 ✅
GET /auth/google
        ↓
STEP 5 ✅
GET /auth/google/callback
        ↓
STEP 6 ✅
Extract Google identity
        ↓
STEP 7 ✅
Find/create/link User
        ↓
STEP 8 ✅
Generate Access Token
        ↓
STEP 9 ✅
Generate Refresh Token
        ↓
STEP 10 ✅
Secure session/cookie handling
        ↓
STEP 11 
Postman/backend testing
        ↓
STEP 12
React "Continue with Google" button
        ↓
STEP 13
Frontend authentication state
        ↓
STEP 14
Protected-route testing


## api path wise db operatoins

api/auth/register

api/auth/login - 
        1. find user with the email in the collection
        2. create new refresh document to save token hash in refreshToken Collection


// refresh validator added


## admin routes

| API | Purpose |
|---|---|
| `GET /api/admin/dashboard/orders/summary` | Dashboard counts |
| `GET /api/admin/orders` | Order table/list |
| `GET /api/admin/orders/:id` | Complete order details |
| `PATCH /api/admin/orders/:id` | General controlled admin update |
| `POST /api/admin/orders/:id/cancel` | Cancel order |
| `POST /api/admin/orders/:id/confirm` | Confirm order |

GET /api/admin/dashboard/orders/summary
GET /api/admin/orders
GET /api/admin/orders/:orderId
POST /api/admin/orders/:orderId/confirm
POST /api/admin/orders/:orderId/cancel
POST /api/admin/orders/:orderId/process
POST /api/admin/orders/:orderId/mark-shipped