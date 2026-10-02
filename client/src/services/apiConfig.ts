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
