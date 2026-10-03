/**
 * Unit tests for verification copy and resend countdown pure helpers.
 *
 *   node --import tsx --test tests/verifyHelpers.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  verifyCopyFor,
  resendCountdownLabel,
  ViewState,
} from '../src/lib/verifyHelpers';

test('resendCountdownLabel handles 0, negative, fractional, and positive seconds', () => {
  assert.equal(resendCountdownLabel(0), 'Resend email');
  assert.equal(resendCountdownLabel(-1), 'Resend email');
  assert.equal(resendCountdownLabel(-15.4), 'Resend email');
  assert.equal(resendCountdownLabel(12.8), 'Resend again in 12s');
  assert.equal(resendCountdownLabel(0.9), 'Resend email');
  assert.equal(resendCountdownLabel(60), 'Resend again in 60s');
  assert.equal(resendCountdownLabel(45), 'Resend again in 45s');
});

test('verifyCopyFor: expired ignores server message and never says only already used', () => {
  const serverMsg = 'It may have already been used';
  const copy = verifyCopyFor('expired', serverMsg);

  assert.ok(copy);
  assert.equal(copy.title, 'Link Expired');
  assert.equal(
    copy.body,
    'This verification link has expired. Resend a fresh link below. Only the newest email works.'
  );
  assert.doesNotMatch(copy.body, /may have already been used/i);
});

test('verifyCopyFor: invalid ignores server message and explains replacement/expiry', () => {
  const serverMsg = 'It may have already been used';
  const copy = verifyCopyFor('invalid', serverMsg);

  assert.ok(copy);
  assert.equal(copy.title, 'Invalid Link');
  assert.equal(
    copy.body,
    'This link does not match any pending verification. It may be invalid, expired, or replaced by a newer email. Only the newest email works. If you already verified, sign in. Otherwise resend a fresh link below or register again.'
  );
  assert.notEqual(copy.body, serverMsg);
});

test('verifyCopyFor: verified and already_verified use server message or honest fallback', () => {
  const verifiedDefault = verifyCopyFor('verified', '');
  assert.ok(verifiedDefault);
  assert.equal(verifiedDefault.title, 'Email Verified');
  assert.equal(
    verifiedDefault.body,
    'Your account has been created. You can now sign in to the workbench.'
  );

  const verifiedCustom = verifyCopyFor('verified', 'Custom welcome message');
  assert.ok(verifiedCustom);
  assert.equal(verifiedCustom.body, 'Custom welcome message');

  const alreadyDefault = verifyCopyFor('already_verified', '');
  assert.ok(alreadyDefault);
  assert.equal(alreadyDefault.title, 'Already Verified');
  assert.equal(
    alreadyDefault.body,
    'This email address already has a verified account. Try signing in instead.'
  );

  const alreadyCustom = verifyCopyFor('already_verified', 'Account already active');
  assert.ok(alreadyCustom);
  assert.equal(alreadyCustom.body, 'Account already active');
});

test('verifyCopyFor: no_token and error return appropriate copy', () => {
  const noToken = verifyCopyFor('no_token', '');
  assert.ok(noToken);
  assert.equal(noToken.title, 'Verify Email');
  assert.match(noToken.body, /registration email/i);

  const errorDefault = verifyCopyFor('error', '');
  assert.ok(errorDefault);
  assert.equal(errorDefault.title, 'Verification Failed');
  assert.match(errorDefault.body, /Please try again/i);

  const errorCustom = verifyCopyFor('error', 'Network timeout');
  assert.ok(errorCustom);
  assert.equal(errorCustom.body, 'Network timeout');
});

test('verifyCopyFor: no settled view other than error offers a same-token retry', () => {
  const nonErrorSettled: ViewState[] = [
    'verified',
    'already_verified',
    'expired',
    'invalid',
    'no_token',
  ];

  for (const view of nonErrorSettled) {
    const copy = verifyCopyFor(view, 'Some server response');
    assert.ok(copy, `expected copy for ${view}`);
    // "Try again" or retrying the same link must not be offered to the user
    assert.doesNotMatch(
      copy.body,
      /try again with this link|retry this token|click the link again/i,
      `${view} must not offer same-token retry`
    );
  }

  // Only 'error' suggests trying again (for transport failures)
  const errorCopy = verifyCopyFor('error', '');
  assert.ok(errorCopy);
  assert.match(errorCopy.body, /try again/i);
});

test('verifyCopyFor: transient states return null', () => {
  assert.equal(verifyCopyFor('idle', ''), null);
  assert.equal(verifyCopyFor('loading', ''), null);
});
