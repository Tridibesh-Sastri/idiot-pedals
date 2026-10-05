/**
 * Shared validation patterns (single source of truth).
 *
 * The phone rule mirrors the client-side rule exactly (10 digits starting
 * 6-9): anything else passes the form only to fail with a 400. The PIN rule
 * is the 6-digit Indian postal code the checkout form enforces.
 */

export const INDIAN_PHONE_RE = /^[6-9]\d{9}$/

export const INDIAN_PINCODE_RE = /^\d{6}$/
