/**
 * Phase 1 — client-side checkout guard.
 *
 * Legacy cart lines persisted before the catalogue moved to the API (for example
 * "neon-fuzz-box") must be rejected locally with an actionable message instead
 * of being sent to the server as an invalid ObjectId.
 *
 *   node --import tsx --test tests/orderService.guard.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { orderService } from '../src/services/orderService';
import { ApiError } from '../src/lib/api';
import type { ShippingAddress } from '../src/types';

const shippingAddress: ShippingAddress = {
  fullName: 'Test Player',
  email: 'test@mailhost.test',
  phone: '9000000001',
  addressLine1: '1 Test Street',
  city: 'Kolkata',
  state: 'West Bengal',
  postalCode: '700001',
  country: 'India',
};

const VALID_OBJECT_ID = 'a'.repeat(24);

const expectValidationError = (error: unknown) => {
  assert.ok(error instanceof ApiError, 'expected an ApiError');
  assert.equal(error.kind, 'validation');
  assert.match(error.message, /re-add items to your cart/i);
  return true;
};

test('rejects a legacy non-ObjectId productId with an actionable message', async () => {
  await assert.rejects(
    () =>
      orderService.createOrder({
        items: [{ productId: 'neon-fuzz-box', quantity: 1 }],
        paymentMethod: 'cod',
        shippingAddress,
      }),
    expectValidationError
  );
});

test('rejects the whole cart when one line is a legacy id', async () => {
  await assert.rejects(
    () =>
      orderService.createOrder({
        items: [
          { productId: VALID_OBJECT_ID, quantity: 1 },
          { productId: 'neon-fuzz-box', quantity: 1 },
        ],
        paymentMethod: 'cod',
        shippingAddress,
      }),
    expectValidationError
  );
});

test('rejects other malformed id shapes (short, non-hex, prototype-looking)', async () => {
  for (const productId of [
    '',
    'abc',
    'a'.repeat(23),
    'a'.repeat(25),
    'zzzzzzzzzzzzzzzzzzzzzzzz',
    '__proto__',
    'constructor',
  ]) {
    await assert.rejects(
      () =>
        orderService.createOrder({
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'cod',
          shippingAddress,
        }),
      expectValidationError
    );
  }
});

test('a well-formed ObjectId passes the guard (it is not rejected as validation)', async () => {
  await assert.rejects(
    () =>
      orderService.createOrder({
        items: [{ productId: VALID_OBJECT_ID, quantity: 1 }],
        paymentMethod: 'cod',
        shippingAddress,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError, 'expected an ApiError');
      // The guard let it through, so the failure must be the (unreachable)
      // network call, not a validation rejection.
      assert.notEqual(error.kind, 'validation');
      return true;
    }
  );
});
