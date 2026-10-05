/**
 * Shared contact-field rules (lib/validation).
 *
 * The phone rule mirrors the server exactly (10 digits starting 6-9), so a
 * form pass can never become a server 400. Spaces and dashes are stripped;
 * nothing else is.
 *
 * Run: node --import tsx --test tests/validation.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidPhone,
  isValidPinCode,
  normalizePhoneDigits,
  normalizePinCode,
  validateContactFields,
  ORDER_CONTACT_CAPS,
  PROFILE_CONTACT_CAPS,
  type ContactFields,
} from '../src/lib/validation';

describe('phone validation', () => {
  it('accepts valid 10-digit Indian mobiles', () => {
    assert.equal(isValidPhone('9876543210'), true);
    assert.equal(isValidPhone('6123456789'), true);
  });

  it('strips spaces and dashes only', () => {
    assert.equal(normalizePhoneDigits('98765 43210'), '9876543210');
    assert.equal(normalizePhoneDigits('987-654-3210'), '9876543210');
    assert.equal(isValidPhone('98765 43210'), true);
  });

  it('rejects anything else, including parens and plus signs', () => {
    assert.equal(isValidPhone('0123456789'), false);
    assert.equal(isValidPhone('987654321'), false);
    assert.equal(isValidPhone('98765432101'), false);
    assert.equal(isValidPhone('(987) 654-3210'), false);
    assert.equal(isValidPhone('+919876543210'), false);
    assert.equal(isValidPhone(''), false);
    assert.equal(isValidPhone('abcdefghij'), false);
  });
});

describe('PIN code validation', () => {
  it('accepts exactly 6 digits', () => {
    assert.equal(isValidPinCode('700001'), true);
    assert.equal(normalizePinCode('700 001'), '700001');
    assert.equal(isValidPinCode('700 001'), true);
  });

  it('rejects 5, 7 and non-digit PINs', () => {
    assert.equal(isValidPinCode('70000'), false);
    assert.equal(isValidPinCode('7000001'), false);
    assert.equal(isValidPinCode(''), false);
    assert.equal(isValidPinCode('abcdef'), false);
  });
});

describe('validateContactFields', () => {
  const validFields: ContactFields = {
    name: 'Rahul Sharma',
    phone: '9876543210',
    addressLine1: '123 MG Road',
    city: 'Burdwan',
    state: 'West Bengal',
    postalCode: '713101',
  };

  it('passes on valid fields with no errors', () => {
    const errors = validateContactFields(validFields);
    assert.deepEqual(errors, {});
  });

  it('rejects invalid phone numbers: 0123456789 and 123', () => {
    const err0 = validateContactFields({ ...validFields, phone: '0123456789' });
    assert.equal(err0.phone, 'Enter a valid 10-digit Indian phone number.');

    const err123 = validateContactFields({ ...validFields, phone: '123' });
    assert.equal(err123.phone, 'Enter a valid 10-digit Indian phone number.');
  });

  it('rejects invalid PIN codes: 12345 and 1234567', () => {
    const errShort = validateContactFields({ ...validFields, postalCode: '12345' });
    assert.equal(errShort.postalCode, 'Enter a valid 6-digit PIN code.');

    const errLong = validateContactFields({ ...validFields, postalCode: '1234567' });
    assert.equal(errLong.postalCode, 'Enter a valid 6-digit PIN code.');
  });

  it('rejects when each required field is empty', () => {
    assert.equal(validateContactFields({ ...validFields, name: '' }).name, 'Name is required.');
    assert.equal(validateContactFields({ ...validFields, name: '   ' }).name, 'Name is required.');

    assert.equal(
      validateContactFields({ ...validFields, phone: '' }).phone,
      'Enter a valid 10-digit Indian phone number.'
    );

    assert.equal(
      validateContactFields({ ...validFields, addressLine1: '' }).addressLine1,
      'Address line 1 is required.'
    );
    assert.equal(
      validateContactFields({ ...validFields, addressLine1: '   ' }).addressLine1,
      'Address line 1 is required.'
    );

    assert.equal(validateContactFields({ ...validFields, city: '' }).city, 'City is required.');
    assert.equal(validateContactFields({ ...validFields, city: '   ' }).city, 'City is required.');

    assert.equal(validateContactFields({ ...validFields, state: '' }).state, 'State is required.');
    assert.equal(validateContactFields({ ...validFields, state: '   ' }).state, 'State is required.');

    assert.equal(
      validateContactFields({ ...validFields, postalCode: '' }).postalCode,
      'Enter a valid 6-digit PIN code.'
    );
  });

  it('rejects over-cap lengths for ORDER_CONTACT_CAPS', () => {
    const overName = validateContactFields(
      { ...validFields, name: 'A'.repeat(ORDER_CONTACT_CAPS.name + 1) },
      ORDER_CONTACT_CAPS
    );
    assert.equal(overName.name, 'Name is too long.');

    const overAddr = validateContactFields(
      { ...validFields, addressLine1: 'A'.repeat(ORDER_CONTACT_CAPS.addressLine1 + 1) },
      ORDER_CONTACT_CAPS
    );
    assert.equal(overAddr.addressLine1, 'Address line 1 is too long.');

    const overCity = validateContactFields(
      { ...validFields, city: 'A'.repeat(ORDER_CONTACT_CAPS.city + 1) },
      ORDER_CONTACT_CAPS
    );
    assert.equal(overCity.city, 'City is too long.');

    const overState = validateContactFields(
      { ...validFields, state: 'A'.repeat(ORDER_CONTACT_CAPS.state + 1) },
      ORDER_CONTACT_CAPS
    );
    assert.equal(overState.state, 'State is too long.');
  });

  it('rejects over-cap lengths for PROFILE_CONTACT_CAPS', () => {
    const overName = validateContactFields(
      { ...validFields, name: 'A'.repeat(PROFILE_CONTACT_CAPS.name + 1) },
      PROFILE_CONTACT_CAPS
    );
    assert.equal(overName.name, 'Name is too long.');

    const overAddr = validateContactFields(
      { ...validFields, addressLine1: 'A'.repeat(PROFILE_CONTACT_CAPS.addressLine1 + 1) },
      PROFILE_CONTACT_CAPS
    );
    assert.equal(overAddr.addressLine1, 'Address line 1 is too long.');

    const overCity = validateContactFields(
      { ...validFields, city: 'A'.repeat(PROFILE_CONTACT_CAPS.city + 1) },
      PROFILE_CONTACT_CAPS
    );
    assert.equal(overCity.city, 'City is too long.');

    const overState = validateContactFields(
      { ...validFields, state: 'A'.repeat(PROFILE_CONTACT_CAPS.state + 1) },
      PROFILE_CONTACT_CAPS
    );
    assert.equal(overState.state, 'State is too long.');
  });
});
