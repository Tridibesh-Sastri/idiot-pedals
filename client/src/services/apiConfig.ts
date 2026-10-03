/**
 * Base API Configuration & Persistence Constants
 *
 * The only place that reads build-time API configuration. Never hardcode a
 * development host, port, or tunnel URL anywhere else in the app.
 */

const readEnv = (key: string): string | undefined => {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const value = env?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

/**
 * Base URL for REST API endpoints.
 * Set `VITE_API_BASE_URL` per environment; defaults to a same-origin `/api`
 * prefix (which a dev proxy or production reverse proxy can forward).
 */
export const API_BASE_URL = (readEnv('VITE_API_BASE_URL') ?? '/api').replace(/\/+$/, '');

/*
 * Dev-only guard rail.
 *
 * With neither setting present the app falls back to the same-origin `/api`
 * prefix, and nothing forwards it: the Vite dev server answers every unknown
 * path with index.html, so requests "succeed" with HTML and the UI can only show
 * a generic load error. That is confusing enough to be worth one loud warning.
 * Production builds are unaffected (this only fires under `import.meta.env.DEV`).
 */
const DEV_ENV = (import.meta as unknown as { env?: { DEV?: boolean } }).env;

if (DEV_ENV?.DEV && !readEnv('VITE_API_BASE_URL') && !readEnv('VITE_API_PROXY_TARGET')) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Idiot Pedals] No API target is configured, so /api requests will hit the Vite dev server ' +
      'and return HTML instead of JSON. Fix it with one setting: copy client/.env.example to ' +
      'client/.env.local, set VITE_API_PROXY_TARGET=http://localhost:5000, then restart the dev server.'
  );
}

/**
 * Razorpay *publishable* key id. This is intentionally public (it is required
 * by Razorpay Checkout in the browser). The secret key must never reach the
 * client bundle.
 */
export const RAZORPAY_KEY_ID = readEnv('VITE_RAZORPAY_KEY_ID') ?? '';

/**
 * Standard keys used to store data in browser localStorage.
 * Centralizing them prevents typographical bugs across services.
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'idiot_pedals_auth_token',
  AUTH_USER: 'idiot_pedals_user',
  CART: 'idiot_pedals_cart',
  ORDERS: 'idiot_pedals_orders',
} as const;

/**
 * Asynchronous utility used only by the local (non-API) shipping estimator.
 */
export const sleep = (ms = 400): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
