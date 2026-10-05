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

export interface ContactFields {
  name: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface ContactFieldCaps {
  name: number;
  addressLine1: number;
  city: number;
  state: number;
}

/** Server caps for order shipping addresses (order.validator.js). */
export const ORDER_CONTACT_CAPS: ContactFieldCaps = {
  name: 150,
  addressLine1: 500,
  city: 100,
  state: 100,
};

/** Server caps for profile address book entries (user.model.js). */
export const PROFILE_CONTACT_CAPS: ContactFieldCaps = {
  name: 100,
  addressLine1: 200,
  city: 100,
  state: 100,
};

/**
 * Required + pattern + length rules for a contact/address block, mirroring
 * the server validators exactly (never stricter: over-long values fail here
 * with the same message the server would send).
 */
export function validateContactFields(
  fields: ContactFields,
  caps: ContactFieldCaps = ORDER_CONTACT_CAPS
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields.name.trim()) errors.name = 'Name is required.';
  else if (fields.name.trim().length > caps.name) errors.name = 'Name is too long.';

  if (!isValidPhone(fields.phone)) errors.phone = 'Enter a valid 10-digit Indian phone number.';

  if (!fields.addressLine1.trim()) errors.addressLine1 = 'Address line 1 is required.';
  else if (fields.addressLine1.trim().length > caps.addressLine1) {
    errors.addressLine1 = 'Address line 1 is too long.';
  }

  if (!fields.city.trim()) errors.city = 'City is required.';
  else if (fields.city.trim().length > caps.city) errors.city = 'City is too long.';

  if (!fields.state.trim()) errors.state = 'State is required.';
  else if (fields.state.trim().length > caps.state) errors.state = 'State is too long.';

  if (!isValidPinCode(fields.postalCode)) errors.postalCode = 'Enter a valid 6-digit PIN code.';

  return errors;
}
