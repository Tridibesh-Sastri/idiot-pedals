
# IDIOT Pedals — Frontend Architecture & Developer Reference Guide

Welcome to the **IDIOT Pedals** web application codebase. This document serves as the comprehensive architectural and technical reference for developers, engineers, and contributors. It explains the system design, directory hierarchy, state management, component trees, routing structure, audio signal processing engine, and data integration patterns in complete detail.

---

## Table of Contents

1. [Architectural Overview & Design Philosophy](#1-architectural-overview--design-philosophy)
2. [Technology Stack & Dependencies](#2-technology-stack--dependencies)
3. [Project Directory & File Structure](#3-project-directory--file-structure)
4. [Application Routing Architecture (`App.tsx`)](#4-application-routing-architecture-apptsx)
5. [Global State Management & Context Providers](#5-global-state-management--context-providers)
   - [AuthContext (`src/context/AuthContext.tsx`)](#authcontext)
   - [CartContext (`src/context/CartContext.tsx`)](#cartcontext)
   - [ToastContext (`src/context/ToastContext.tsx`)](#toastcontext)
6. [Component Hierarchy & UI System](#6-component-hierarchy--ui-system)
   - [Common Global Components (`src/components/common/`)](#common-global-components)
   - [Landing & Marketing Components (`src/components/`)](#landing--marketing-components)
   - [Pedal Hardware & Audio Components (`src/components/pedal/`)](#pedal-hardware--audio-components)
7. [Pages & View Controllers (`src/pages/`)](#7-pages--view-controllers-srcpages)
8. [Services & API Abstraction Layer (`src/services/`)](#8-services--api-abstraction-layer-srcservices)
9. [Web Audio API & Real-Time DSP Engine](#9-web-audio-api--real-time-dsp-engine)
10. [Type Definitions & Data Contracts (`src/types/index.ts`)](#10-type-definitions--data-contracts-srctypesindexts)
11. [Design Tokens & Styling System](#11-design-tokens--styling-system)
12. [Developer Workflows & Extension Guide](#12-developer-workflows--extension-guide)

---

## 1. Architectural Overview & Design Philosophy

IDIOT Pedals is an artisan e-commerce and interactive sound-testing platform for handcrafted guitar effects pedals originating from Kolkata, India. The primary flagship hardware featured is the **Neon Fuzz Box (₹2,499)**.

The frontend is engineered according to a **4-Layer Architecture**:

```
┌────────────────────────────────────────────────────────┐
│  LAYER 1: Presentation & Interactive UI               │
│  React Components • Framer Motion • Web Audio Synth   │
└──────────────────────────┬─────────────────────────────┘
                           │ Consumes hooks
┌──────────────────────────▼─────────────────────────────┐
│  LAYER 2: State & Application Context                  │
│  AuthContext • CartContext • ToastContext             │
└──────────────────────────┬─────────────────────────────┘
                           │ Dispatches calls
┌──────────────────────────▼─────────────────────────────┐
│  LAYER 3: Service Abstraction Layer                    │
│  authService • orderService • paymentService           │
│  shippingService • userService (all in src/services/)  │
└──────────────────────────┬─────────────────────────────┘
                           │ I/O Operations
┌──────────────────────────▼─────────────────────────────┐
│  LAYER 4: Persistence & External Integrations          │
│  LocalStorage Cache • Razorpay Gateway (Simulated/SDK) │
│  Shiprocket / Blue Dart Express Logistics API          │
└────────────────────────────────────────────────────────┘
```

### Core Design Rules
- **No Boutique Hype Tax:** Honest pricing, robust typography, warm industrial aesthetic (cream/ivory enclosure `#F3EFE6`, pedal red `#D91E18`, charcoal chassis `#171513`, and deep stage black `#0B0B0A`).
- **Interactive Audio Demonstration:** Guitarists require audible proof before purchasing. The platform embeds a zero-dependency Web Audio API synthesizer that models true analog diode clipping and tone filter sweeps right inside the browser.
- **Resilient Offline-Friendly State:** Cart items, registered authentication credentials, order history, and simulated courier tracking updates persist reliably in browser `localStorage`.
- **Zero-Friction Checkout:** Single-page mobile-friendly checkout supporting both Razorpay Online Gateway (UPI, Cards, NetBanking) and Cash on Delivery (COD).

---

## 2. Technology Stack & Dependencies

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | React | `^19.0.1` | Component-driven declarative UI |
| **Language** | TypeScript | `~5.8.2` | Strict type safety across contracts and props |
| **Build Tool** | Vite | `^6.2.3` | Ultra-fast HMR and production bundling |
| **Styling** | Tailwind CSS | `^4.1.14` | Utility-first styling with custom CSS variables |
| **Routing** | React Router DOM | `^7.18.4` | Client-side declarative SPA routing |
| **Icons** | Lucide React | `^0.546.0` | Crisp, scalable SVG iconography |
| **Animations** | Motion (Framer) | `^12.23.24` | Scroll-linked transforms and interactive transitions |
| **Audio Engine** | Web Audio API | Native Browser | Custom oscillator, WaveShaper, and BiquadFilter DSP |

---

## 3. Project Directory & File Structure

```
/
├── public/                     # Static assets (favicons, images, audio previews)
│   └── assets/
├── src/
│   ├── components/             # Reusable UI presentation units
│   │   ├── common/             # Global recurring widgets
│   │   │   ├── CartDrawer.tsx         # Slide-out shopping cart drawer
│   │   │   ├── Footer.tsx             # Global brand footer & warranty links
│   │   │   ├── IdiotPedalsLogo.tsx    # Responsive SVG brand logo
│   │   │   ├── Navbar.tsx             # Fixed top navigation & user controls
│   │   │   ├── ScrollToTop.tsx        # Route transition scroll resetter
│   │   │   └── ToastContainer.tsx     # Global notifications portal
│   │   ├── pedal/              # Hardware-specific deep dive components
│   │   │   ├── ControlsOverview.tsx   # Interactive potentiometer inspector
│   │   │   ├── PedalPhotoGallery.tsx  # Multi-angle photo viewer
│   │   │   ├── SoundDemoSection.tsx   # Web Audio tone test bench & oscilloscope
│   │   │   └── Specifications.tsx     # Enclosure, power, and audio specs table
│   │   ├── ExplodedView.tsx    # Mechanical component breakdown
│   │   ├── Hero.tsx            # Full-viewport landing hero with 3D pedal
│   │   ├── PedalModel.tsx      # SVG/CSS 3D enclosure with toggle switch
│   │   ├── SoundComparison.tsx # A/B dry vs. saturated comparison
│   │   └── TheSound.tsx        # Analog signal path schematic
│   ├── context/                # Global React Context providers
│   │   ├── AuthContext.tsx     # User authentication, tokens & OTP verification
│   │   ├── CartContext.tsx     # Cart contents, quantities & order subtotal
│   │   └── ToastContext.tsx    # Toast dispatch and auto-dismissal
│   ├── pages/                  # Page-level route views
│   │   ├── AboutPage.tsx       # Kolkata workbench story & manifesto
│   │   ├── AccountPage.tsx     # User profile, verified badges & quick orders
│   │   ├── CheckoutPage.tsx    # Single-page checkout & payment dispatcher
│   │   ├── ContactPage.tsx     # Support form, troubleshooting & warranty FAQ
│   │   ├── HomePage.tsx        # Flagship landing page
│   │   ├── LoginPage.tsx       # Sign-in form with demo user credentials
│   │   ├── OrderDetailPage.tsx # Chronological tracking & printable invoice
│   │   ├── OrdersPage.tsx      # Customer order history listing
│   │   ├── ProductPage.tsx     # Dedicated Neon Fuzz Box detail view
│   │   ├── RegisterPage.tsx    # New account registration
│   │   ├── VerifyEmailPage.tsx # Email code verification flow
│   │   └── VerifyPhonePage.tsx # Phone SMS OTP verification flow
│   ├── services/               # API clients, persistence & data access
│   │   ├── apiConfig.ts        # Base URL, storage keys, and sleep utility
│   │   ├── authService.ts      # Authentication logic & session persistence
│   │   ├── orderService.ts     # Order creation, lookup & tracking history
│   │   ├── paymentService.ts   # Razorpay payload builder & verification
│   │   ├── shippingService.ts  # Blue Dart tracking scans & pincode check
│   │   └── userService.ts      # Profile queries and mutations
│   ├── types/                  # Shared TypeScript interfaces & types
│   │   └── index.ts            # Central type repository
│   ├── App.tsx                 # Root component with providers & Route table
│   ├── data.ts                 # Hardware specifications & tone presets
│   ├── index.css               # Global Tailwind CSS imports & theme fonts
│   └── main.tsx                # React DOM entry point
├── client.readme.md            # Architectural reference documentation (this file)
├── index.html                  # HTML entry point with metadata
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler configuration
└── vite.config.ts              # Vite bundler plugins and settings
```

---

## 4. Application Routing Architecture (`App.tsx`)

The application routing is powered by `react-router-dom` (`BrowserRouter`, `Routes`, `Route`, `Navigate`).

### Route Definitions Table

| Path | Component | Description & Access |
| :--- | :--- | :--- |
| `/` | `HomePage` | Landing page: 3D model, audio demo, circuit diagram, sound manifesto |
| `/product` | `ProductPage` | Flagship e-commerce view with pincode check, specs, and purchase bar |
| `/about` | `AboutPage` | The Kolkata workshop story, build philosophy, and component breakdown |
| `/contact` | `ContactPage` | Direct workbench technical support, contact form, and FAQ |
| `/login` | `LoginPage` | Email/password sign-in and Google One-Tap simulation |
| `/register` | `RegisterPage` | Account creation with input validation |
| `/verify-email` | `VerifyEmailPage` | 6-digit confirmation code verification |
| `/verify-phone` | `VerifyPhonePage` | 4-digit SMS OTP verification for courier delivery updates |
| `/checkout` | `CheckoutPage` | Single-page checkout for Razorpay Gateway and Cash on Delivery |
| `/orders` | `OrdersPage` | Customer order history with live status pills and tracking links |
| `/orders/:id` | `OrderDetailPage` | Chronological order tracker, Blue Dart AWB, and receipt print view |
| `/account` | `AccountPage` | Customer profile management, verification status, and recent orders |
| `*` | `Navigate to="/"` | Wildcard fallback redirecting unknown paths to home |

### Router Layout & Hierarchy

```jsx
<BrowserRouter>
  <AuthProvider>           {/* User session & authentication state */}
    <CartProvider>         {/* Cart contents, pricing, and drawer toggle */}
      <ToastProvider>      {/* Global toast notification system */}
        <ScrollToTop />    {/* Resets scroll position on route change */}
        <Navbar />         {/* Fixed top brand bar */}
        <main>
          <Routes> ... </Routes>
        </main>
        <CartDrawer />     {/* Global slide-over cart drawer */}
        <ToastContainer /> {/* Toast notifications render portal */}
        <Footer />         {/* Global footer */}
      </ToastProvider>
    </CartProvider>
  </AuthProvider>
</BrowserRouter>
```

---

## 5. Global State Management & Context Providers

Global state is managed via native React Context and custom hooks without third-party boilerplate. All contexts provide fallback error handling when accessed outside their respective providers.

---

### AuthContext
**File:** `src/context/AuthContext.tsx`  
**Hook:** `useAuth()`

Manages the authenticated user session, token storage, and verification flags.

#### State Variables
- `user: User | null` — Currently authenticated user object (or `null` when logged out).
- `isAuthenticated: boolean` — Derived boolean (`!!user`) indicating active session.
- `loading: boolean` — Initializing/hydrating flag (true while inspecting `localStorage` on boot).

#### Exposed Methods & Functions
- `login(dto: LoginDTO): Promise<User>`  
  Validates credentials via `authService.login`, stores the session in localStorage, updates `user` state, and returns the User object.
- `register(dto: RegisterDTO): Promise<User>`  
  Registers a new user via `authService.register`, sets the state, and opens the path for email/phone verification.
- `googleLogin(): Promise<User>`  
  Simulates instantaneous Google OAuth sign-in with pre-verified email and phone flags.
- `verifyEmail(code: string): Promise<boolean>`  
  Submits email OTP code; upon success, sets `isEmailVerified: true` in state and storage.
- `verifyPhone(otp: string): Promise<boolean>`  
  Submits phone OTP code; upon success, sets `isPhoneVerified: true` in state and storage.
- `logout(): Promise<void>`  
  Removes token and user from localStorage and resets `user` to `null`.
- `refreshUser(): Promise<void>`  
  Re-fetches fresh user data from storage/API and updates state.

---

### CartContext
**File:** `src/context/CartContext.tsx`  
**Hook:** `useCart()`

Manages e-commerce cart line items, pricing calculations, and the slide-out drawer state.

#### State Variables
- `items: CartItem[]` — Array of products currently in the cart. Initialized from `localStorage` (defaults to one `NEON_FUZZ_BOX` unit for immediate demonstration).
- `isCartOpen: boolean` — Controls visibility of the slide-out `<CartDrawer />`.
- `subtotal: number` — Computed total: `∑(item.price * item.quantity)`.
- `shippingFee: number` — Fixed to `0` (Free nationwide express shipping for launch).
- `total: number` — `subtotal + shippingFee`.
- `totalQuantity: number` — Computed sum of all item quantities in the cart.

#### Exposed Methods & Functions
- `addItem(item?: CartItem, quantity?: number): void`  
  Adds a line item to the cart or increments existing quantity if the ID matches. Automatically opens the cart drawer (`setIsCartOpen(true)`).
- `removeItem(id: string): void`  
  Filters out the item with matching ID.
- `updateQuantity(id: string, quantity: number): void`  
  Updates item quantity. If `quantity <= 0`, removes the item.
- `clearCart(): void`  
  Empties the cart array and cleans up storage.
- `setIsCartOpen(open: boolean): void`  
  Direct boolean setter for opening/closing the cart drawer.

---

### ToastContext
**File:** `src/context/ToastContext.tsx`  
**Hook:** `useToast()`

Dispatches non-intrusive operational toasts across the entire application with auto-dismissal.

#### State Variables
- `toasts: Toast[]` — Active toast queue. Each toast contains:
  - `id: string` — Unique identifier (`toast_{timestamp}_{random}`).
  - `type: 'success' | 'error' | 'info'` — Semantic visual classification.
  - `message: string` — Human-readable text feedback.
  - `duration?: number` — Lifetime before auto-dismiss (default: `3500ms`).

#### Exposed Methods & Functions
- `showToast(message: string, type?: 'success' | 'error' | 'info'): void`  
  Pushes a new toast into state and sets a 3.5s timeout to trigger dismissal.
- `removeToast(id: string): void`  
  Removes a toast by ID from active state.

---

## 6. Component Hierarchy & UI System

### Common Global Components

#### 1. `Navbar.tsx` (`src/components/common/Navbar.tsx`)
- **Role:** Sticky top navigation bar.
- **Features:** Responsive desktop links, mobile hamburger menu, live cart badge with item counter, user profile dropdown, and direct order tracking shortcut.
- **State:** `mobileMenuOpen: boolean`, `userMenuOpen: boolean`.
- **Hooks Used:** `useCart()`, `useAuth()`, `useLocation()`, `useNavigate()`.

#### 2. `Footer.tsx` (`src/components/common/Footer.tsx`)
- **Role:** Global footer.
- **Features:** Workshop address in Kolkata, technical specifications summary, newsletter subscription input with toast confirmation, quick links, and warranty commitment.

#### 3. `CartDrawer.tsx` (`src/components/common/CartDrawer.tsx`)
- **Role:** Slide-out drawer displaying cart contents.
- **Features:** Line item image preview, quantity increment/decrement, remove button, free shipping badge, subtotal calculation, and checkout call-to-action.
- **Hooks Used:** `useCart()`, `useNavigate()`.

#### 4. `ToastContainer.tsx` (`src/components/common/ToastContainer.tsx`)
- **Role:** Fixed viewport portal rendering active toast messages with animated entry/exit.
- **Hooks Used:** `useToast()`.

#### 5. `IdiotPedalsLogo.tsx` (`src/components/common/IdiotPedalsLogo.tsx`)
- **Role:** Vector SVG brand mark.
- **Props:** `variant?: 'light' | 'dark' | 'color'`, `size?: 'sm' | 'md' | 'lg' | 'xl'`, `showTagline?: boolean`.

#### 6. `ScrollToTop.tsx` (`src/components/common/ScrollToTop.tsx`)
- **Role:** Invisible utility component. Listens to route changes (`pathname`, `hash`) and scrolls the window smoothly to the top or to an anchor element.

---

### Landing & Marketing Components

#### 1. `Hero.tsx` (`src/components/Hero.tsx`)
- **Role:** Top-of-page presentation with headline, pricing badge (₹2,499), quick "Add to Cart" / "Test Tone" buttons, and an interactive 3D pedal model.
- **Hooks Used:** `useCart()`.

#### 2. `PedalModel.tsx` (`src/components/PedalModel.tsx`)
- **Role:** Realistic CSS/SVG 3D pedal enclosure representation.
- **Interactive State:** `isEngaged: boolean`, `knobs: { gain: number, tone: number, vol: number }`.
- **Interactivity:** Clicking the footswitch toggles true bypass, illuminates the red LED, and plays a tactile mechanical click sound.

#### 3. `TheSound.tsx` (`src/components/TheSound.tsx`)
- **Role:** Interactive signal flow visualization tracing the guitar input through the analog clipping stage out to the amplifier.
- **Libraries:** Framer Motion scroll transforms (`useScroll`, `useTransform`).

#### 4. `SoundComparison.tsx` (`src/components/SoundComparison.tsx`)
- **Role:** Direct A/B audio comparison toggling between clean dry bypass and Neon Fuzz saturation.

#### 5. `ExplodedView.tsx` (`src/components/ExplodedView.tsx`)
- **Role:** Mechanical exploded diagram showcasing the die-cast 1590B aluminum enclosure, Alpha potentiometers, 3PDT true bypass footswitch, and PCB layout.

---

### Pedal Hardware & Audio Components

#### 1. `SoundDemoSection.tsx` (`src/components/pedal/SoundDemoSection.tsx`)
- **Role:** Full-featured browser-based guitar tone test bench.
- **State Variables:**
  - `activePreset: AudioSamplePreset` — Current musical style (`60s Garage Fuzz`, `Heavy Wool Chords`, `Screaming Lead Solo`, `Edge of Breakup`).
  - `isPlaying: boolean` — Active audio synthesis playback flag.
  - `isBypassed: boolean` — True bypass toggle (clean guitar vs. saturated fuzz).
  - `gain: number` — Overdrive/fuzz saturation level (5% to 100%).
  - `tone: number` — Biquad lowpass filter cutoff frequency (10% to 100%).
  - `volume: number` — Master output volume envelope (10% to 100%).
  - `playbackProgress: number` — Playhead position percentage for the oscilloscope (0 to 100).
- **Audio References:**
  - `audioCtxRef: useRef<AudioContext | null>`
  - `timerRef: useRef<number | null>`
- **Sub-Features:**
  - Real-time SVG cathode-ray oscilloscope visualizer.
  - Musical riff note sequencer in E pentatonic / blues scale.
  - A/B True Bypass comparison toggle with status indicator.

#### 2. `ControlsOverview.tsx` (`src/components/pedal/ControlsOverview.tsx`)
- **Role:** Detailed guide explaining how each potentiometer (GAIN, TONE, VOL) shapes harmonic distortion, clipping thresholds, and amp headroom.
- **State:** `selectedKnob: 'gain' | 'tone' | 'vol'`.

#### 3. `PedalPhotoGallery.tsx` (`src/components/pedal/PedalPhotoGallery.tsx`)
- **Role:** Multi-angle product imagery (front, angled, top-down, gut-shot circuit view, and jack inputs).
- **State:** `activeImageIndex: number`.

#### 4. `Specifications.tsx` (`src/components/pedal/Specifications.tsx`)
- **Role:** Tabbed technical specification table detailing electrical characteristics (9V DC, negative center, 8mA draw), dimensions (112 × 60 × 31 mm), and components.
- **State:** `activeTab: 'all' | 'electronics' | 'hardware' | 'power'`.

---

## 7. Pages & View Controllers (`src/pages/`)

### `HomePage.tsx`
- **Route:** `/`
- **Purpose:** Primary landing page assembling `Hero`, `SoundDemoSection`, `TheSound`, `ControlsOverview`, `ExplodedView`, `Specifications`, and customer reviews.

### `ProductPage.tsx`
- **Route:** `/product`
- **Purpose:** Dedicated e-commerce purchase page for the Neon Fuzz Box.
- **State Variables:**
  - `pincode: string` — 6-digit postal code input for delivery estimation.
  - `pincodeStatus: 'idle' | 'checking' | 'available' | 'error'` — Deliverability status.
  - `deliveryEstimate: string | null` — Estimated arrival date text.
  - `quantity: number` — Product purchase quantity.
- **Features:** Pincode validation via `shippingService`, "What's in the Box" breakdown, warranty banner, and a sticky mobile action bar for quick ordering.

### `AboutPage.tsx`
- **Route:** `/about`
- **Purpose:** The Kolkata workshop story, analog circuit philosophy, and hand-soldering manifesto.

### `ContactPage.tsx`
- **Route:** `/contact`
- **Purpose:** Direct communication portal for musicians, warranty assistance, and FAQs.
- **State Variables:**
  - `formData: { name, email, subject, message, orderId }` — Controlled form inputs.
  - `submitting: boolean` — Submission loading state.
  - `activeFaq: number | null` — Accordion toggle for troubleshooting questions.

### `LoginPage.tsx`
- **Route:** `/login`
- **Purpose:** User authentication.
- **State Variables:**
  - `email: string`, `password: string` — Form inputs.
  - `loading: boolean` — Async operation status.
  - `errorMessage: string` — Inline validation error display.
- **Actions:** Normal login, demo quick-fill action for instant testing, and simulated Google sign-in.

### `RegisterPage.tsx`
- **Route:** `/register`
- **Purpose:** New user account creation.
- **State Variables:**
  - `name: string`, `email: string`, `phone: string`, `password: string`, `confirmPassword: string`.
  - `agreeTerms: boolean` — Terms acceptance checkbox.
- **Flow:** On successful registration, redirects to `/verify-email`.

### `VerifyEmailPage.tsx` & `VerifyPhonePage.tsx`
- **Routes:** `/verify-email`, `/verify-phone`
- **Purpose:** Dual-factor account confirmation for order tracking and delivery notifications.
- **State Variables:**
  - `otp: string` — OTP code input.
  - `resendCooldown: number` — 30-second resend countdown timer.
  - `verifying: boolean` — Verification submission spinner.

### `CheckoutPage.tsx`
- **Route:** `/checkout`
- **Purpose:** Single-page checkout with direct order creation.
- **State Variables:**
  - `shippingAddress: ShippingAddress` — Full recipient details (`fullName`, `phone`, `email`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`).
  - `paymentMethod: PaymentMethod` — Selected method: `'razorpay'` (Online) or `'cod'` (Cash on Delivery).
  - `isProcessing: boolean` — Checkout submission in progress.
  - `termsAgreed: boolean` — Order confirmation consent.
- **Process:**
  1. Validates address fields and phone number.
  2. If Razorpay: calls `paymentService.createRazorpayOrder`, simulates gateway settlement, and calls `paymentService.verifyPayment`.
  3. Calls `orderService.createOrder` with complete payload.
  4. Clears the cart via `clearCart()`.
  5. Navigates to `/orders/:id` with a success toast.

### `OrdersPage.tsx`
- **Route:** `/orders`
- **Purpose:** Customer order ledger.
- **State Variables:**
  - `orders: Order[]` — List of past and current orders.
  - `loading: boolean` — Fetching state.
- **Features:** Order cards displaying status pills (`In Transit`, `Confirmed`, `Delivered`), item summaries, tracking numbers, and direct links to details.

### `OrderDetailPage.tsx`
- **Route:** `/orders/:id`
- **Purpose:** Granular order tracking and proof-of-purchase receipt.
- **State Variables:**
  - `order: Order | null` — Retrieved order record.
  - `loading: boolean` — Fetching state.
- **Features:**
  - Interactive chronological shipment timeline (`Order Confirmed` → `Bench Tested & Packed` → `Shipped via Blue Dart` → `In Transit` → `Out for Delivery` → `Delivered`).
  - Active Blue Dart AWB tracking number with quick-copy action.
  - Printable receipt layout (`window.print()`).

### `AccountPage.tsx`
- **Route:** `/account`
- **Purpose:** User profile overview, phone/email verification status cards, address management, and recent order history.

---

## 8. Services & API Abstraction Layer (`src/services/`)

All data access, external gateway interactions, and storage persistence are decoupled from React components into dedicated singleton services.

```
React Component / Context
         │
         ▼
src/services/*.ts
         │
    ┌────┴──────────────────────────┐
    ▼                               ▼
LocalStorage (Browser)     External APIs / Simulated Network
```

### 1. `apiConfig.ts`
- **`API_BASE_URL`**: Base URL pointing to `/api` or `import.meta.env.VITE_API_BASE_URL`.
- **`STORAGE_KEYS`**: Centralized keys for `localStorage`:
  - `AUTH_TOKEN`: `'idiot_pedals_auth_token'`
  - `AUTH_USER`: `'idiot_pedals_user'`
  - `CART`: `'idiot_pedals_cart'`
  - `ORDERS`: `'idiot_pedals_orders'`
- **`sleep(ms = 400)`**: Utility helper resolving after `ms` to provide realistic async latency.

### 2. `authService.ts`
- **`getCurrentUser(): Promise<User | null>`**: Reads and parses cached user from storage.
- **`login(dto: LoginDTO): Promise<User>`**: Validates email/password and saves session.
- **`register(dto: RegisterDTO): Promise<User>`**: Creates and persists a new user profile.
- **`googleLogin(): Promise<User>`**: Creates and returns a verified Google user.
- **`verifyEmail(code: string): Promise<boolean>`**: Verifies email OTP.
- **`verifyPhone(otp: string): Promise<boolean>`**: Verifies SMS OTP.
- **`logout(): Promise<void>`**: Clears session credentials.

### 3. `orderService.ts`
- **`getOrders(userId?: string): Promise<Order[]>`**: Retrieves orders associated with the user.
- **`getOrderById(orderId: string): Promise<Order | null>`**: Finds a single order by ID.
- **`createOrder(payload): Promise<Order>`**: Assembles items, calculates total, generates a unique `IP-XXXXXX` order ID and Blue Dart AWB, builds the initial shipment timeline, and stores the order.

### 4. `paymentService.ts`
- **`createRazorpayOrder(amount, receipt): Promise<RazorpayOrderResponse>`**: Prepares a Razorpay order payload with currency `INR` and amount in paise.
- **`verifyPayment(payload): Promise<{ success: boolean, message: string }>`**: Validates Razorpay payment signature.

### 5. `shippingService.ts`
- **`getShipmentStatus(trackingNumber): Promise<ShipmentTrackingInfo>`**: Returns logistics checkpoint scans (origin, transit hub, estimated arrival).
- **`checkPincodeDeliverability(pincode): Promise<{ deliverable, estDays, codAvailable }>`**: Validates 6-digit Indian PIN codes.

### 6. `userService.ts`
- **`getProfile(): Promise<User | null>`**: Fetches current user profile.
- **`updateProfile(updates): Promise<User>`**: Updates user fields (name, phone, etc.) in storage.

---

## 9. Web Audio API & Real-Time DSP Engine

The audio engine in `src/components/pedal/SoundDemoSection.tsx` produces real-time guitar tones using the browser's native **Web Audio API** without external audio samples or network requests.

### Audio Graph Architecture

```
[ OscillatorNode ] ──(Sawtooth/Triangle Wave)──┐
                                               ▼
                                      [ WaveShaperNode ]  ──(Analog Diode Clipping Curve)
                                               ▼
                                     [ BiquadFilterNode ] ──(Tone Lowpass Filter: 800Hz - 5.3kHz)
                                               ▼
                                         [ GainNode ]     ──(Master Vol & Dynamic Attack/Decay Envelope)
                                               ▼
                                     [ AudioDestination ] ──(Speaker Output)
```

### DSP Functions & Parameters

1. **Distortion Transfer Curve Generator (`makeDistortionCurve(amount: number)`)**:
   Generates a non-linear mathematical sigmoid transfer function across 44,100 samples using:
   $$f(x) = \frac{(3 + k) \cdot x \cdot 20^\circ}{\pi + k \cdot |x|}$$
   This approximates the soft-clipping saturation of germanium and silicon diodes.

2. **Note Sequencer (`scheduleNote()`)**:
   - Generates notes along the **E Pentatonic / Blues scale**:
     - *Riff:* `164.81 Hz (E3)`, `196.00 Hz (G3)`, `220.00 Hz (A3)`, `246.94 Hz (B3)`, `293.66 Hz (D4)`, `329.63 Hz (E4)`
     - *Chords:* Root drone intervals `110 Hz (A2)`, `146.83 Hz (D3)`, `164.81 Hz (E3)`
     - *Lead:* Higher octave bends `329.63 Hz (E4)` to `659.25 Hz (E5)`
   - Dynamically ramps the `GainNode` with an exponential attack (30ms) and exponential decay (260ms) to model the physical pluck of a guitar string.

3. **True Bypass Mode**:
   When `isBypassed === true`:
   - Oscillator shifts to a soft `triangle` wave.
   - Distortion gain drops to 0 (linear transfer).
   - Lowpass filter opens to `3500 Hz`.

---

## 10. Type Definitions & Data Contracts (`src/types/index.ts`)

```typescript
// Authentication & User
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

// E-Commerce Line Item
export interface CartItem {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
}

// Payment & Logistics
export type PaymentMethod = 'razorpay' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus =
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderTimelineStep {
  title: string;
  timestamp: string;
  completed: boolean;
  current?: boolean;
  description: string;
}

export interface Order {
  id: string;
  userId: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  shippingAddress: ShippingAddress;
  courierName?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  timeline: OrderTimelineStep[];
}

// Audio Demo Presets
export interface AudioSamplePreset {
  id: string;
  name: string;
  style: string;
  description: string;
  riffType: 'riff' | 'lead' | 'chords' | 'garage';
  gainLevel: number;
  toneLevel: number;
  volLevel: number;
}
```

---

## 11. Design Tokens & Styling System

The application uses Tailwind CSS v4 with custom font families and brand colors defined in `src/index.css`:

### Color Palette

| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| **Warm Ivory** | `#F3EFE6` | Enclosure finish, primary headline text, bright badges |
| **Stage Black** | `#0B0B0A` | Background backdrop, contrast panels, chassis cavities |
| **Warm Charcoal** | `#171513` | Component card surfaces, input fields, subtle borders |
| **Pedal Red** | `#D91E18` | Primary call-to-action buttons, active LED glow, highlights |
| **Vintage Muted** | `#8C857A` | Subtitles, secondary metadata, inactive borders, labels |
| **Amber / Gold** | `#D4AF37` | Premium accent, circuit traces, star ratings |

### Typography

- **Headlines & Serif Accents:** `Cinzel`, serif (`font-cinzel`)
- **Technical Readouts & Metadata:** `Space Grotesk`, monospace/sans (`font-mono-tech`)
- **Body Text:** System Sans (`font-sans`)
- **Handmade Signature / Brand:** `Caveat`, cursive (`font-script`)

---

## 12. Developer Workflows & Extension Guide

### Running Locally
```bash
# Install dependencies
npm install

# Start Vite dev server on port 3000
npm run dev

# Run TypeScript compilation check
npm run lint

# Build production bundle
npm run build
```

### Adding a New Guitar Pedal
1. Add the pedal definition to `src/data.ts`.
2. Add a new `CartItem` constant or database entry in `src/context/CartContext.tsx`.
3. Create a dedicated route or dynamic parameter (`/product/:id`) in `src/App.tsx`.
4. Add audio sample presets to `PRESETS` in `src/components/pedal/SoundDemoSection.tsx`.

### Connecting to a Real Backend API
The service layer in `src/services/` is pre-configured with the standard REST contract. To connect to an active API server:
1. Set `VITE_API_BASE_URL=https://api.yourdomain.com` in your environment.
2. In `src/services/authService.ts`, replace `localStorage` calls with standard `fetch()` or `axios` calls using `API_BASE_URL`.
3. In `src/services/orderService.ts`, point `createOrder` to your `POST /api/orders` endpoint.
4. Pass standard JWT authentication tokens in the `Authorization: Bearer <token>` header via `STORAGE_KEYS.AUTH_TOKEN`.
