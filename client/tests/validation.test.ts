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
