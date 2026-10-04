/**
 * Contact form error copy mapping.
 *
 * The contact endpoint answers 400 (field detail), 429 (limiter message) or
 * 503/5xx (generic). The mapping below keeps raw backend internals out of the
 * UI while preserving the actionable cases.
 *
 *   node --import tsx --test tests/contactForm.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../src/lib/api';
import { contactSubmitError } from '../src/pages/ContactPage';

test('400 surfaces the field-level message', () => {
  const error = new ApiError('validation', 'Invalid request', 400, [
    { field: 'message', message: 'Message must be between 10 and 2000 characters.' },
  ]);

  assert.equal(
    contactSubmitError(error),
    'message: Message must be between 10 and 2000 characters.'
  );
});

test('429 surfaces the limiter message when present', () => {
  const error = new ApiError(
    'rate_limited',
    'Too many messages from this address. Please try again later.',
    429
  );

  assert.equal(
    contactSubmitError(error),
    'Too many messages from this address. Please try again later.'
  );
});

test('429 without a message falls back to generic copy', () => {
  const error = new ApiError('rate_limited', '', 429);

  assert.equal(
    contactSubmitError(error),
    'Too many messages sent. Please wait a while and try again later.'
  );
});

test('5xx and network errors map to the generic message', () => {
  assert.equal(
    contactSubmitError(new ApiError('server', 'Internal server error', 500)),
    'Could not send your message right now. Please try again later.'
  );
  assert.equal(
    contactSubmitError(new ApiError('network', 'Could not reach the workbench server.')),
    'Could not send your message right now. Please try again later.'
  );
  assert.equal(
    contactSubmitError(new Error('boom')),
    'Could not send your message right now. Please try again later.'
  );
});
