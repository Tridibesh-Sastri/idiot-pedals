/**
 * Contact-field rules shared by checkout, account and register.
 *
 * The phone rule mirrors the server exactly (10 digits starting 6-9):
 * anything else passes the form only to fail with a 400.
 */

/** Server rule, kept in one place: 10 digits, first digit 6-9. */
export const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

/** Strip spaces and dashes only — no other magic. */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/[\s-]/g, '');
}

export function isValidPhone(input: string): boolean {
  return INDIAN_PHONE_RE.test(normalizePhoneDigits(input));
}

/** Digits only (length is validated separately, inputs cap at 6 chars). */
export function normalizePinCode(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidPinCode(input: string): boolean {
  return normalizePinCode(input).length === 6;
}
