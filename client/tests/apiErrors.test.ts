/**
 * Client-side error copy mapping.
 *
 * The backend rejects payment on a cancelled/expired order with its raw
 * state-machine message ("Illegal order status transition: ..."). That wording
 * must never reach checkout UI — describeApiError replaces it with reassurance.
 *
 *   node --import tsx --test tests/apiErrors.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError, describeApiError } from '../src/lib/api';

test('a cancelled-order state-machine rejection maps to the friendly payment message', () => {
  const error = new ApiError(
    'conflict',
    'Illegal order status transition: cancelled -> confirmed',
    409
  );

  const message = describeApiError(error);

  assert.equal(
    message,
    "This order is no longer available for payment. If you were charged, contact us and we'll sort it out immediately."
  );
  assert.doesNotMatch(message, /illegal|transition/i);
});

test('other 409 conflict messages still pass through untouched', () => {
  const error = new ApiError(
    'conflict',
    'One or more items do not have enough stock available.',
    409
  );

  assert.equal(
    describeApiError(error),
    'One or more items do not have enough stock available.'
  );
});

test('the same backend wording without a 409 status is not relabelled', () => {
  const error = new ApiError(
    'server',
    'Illegal order status transition: cancelled -> confirmed',
    500
  );

  assert.equal(
    describeApiError(error),
    'Illegal order status transition: cancelled -> confirmed'
  );
});
