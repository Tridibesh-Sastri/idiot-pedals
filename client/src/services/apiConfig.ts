/**
 * Base API Configuration & Persistence Constants
 *
 * Provides the base URL for REST API endpoints, centralized localStorage keys,
 * and an asynchronous delay simulator to model real-world network round-trips.
 */

// Base endpoint pointing to Express backend or environment variable
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL) ||
  '/api';

/**
 * Standard keys used to store data in browser localStorage.
 * Centralizing them prevents typographical bugs across services.
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'idiot_pedals_auth_token',
  AUTH_USER: 'idiot_pedals_user',
  CART: 'idiot_pedals_cart',
  ORDERS: 'idiot_pedals_orders',
};

/**
 * Asynchronous utility function to simulate realistic network latency.
 *
 * @param ms Duration in milliseconds to delay execution (default: 400ms)
 * @returns Promise that resolves after the specified duration
 */
export const sleep = (ms = 400): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
