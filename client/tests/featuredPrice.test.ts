import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FEATURED_PRODUCT_SLUG, priceLabelFor } from '../src/hooks/useNeonFuzzBox';
import type { Product } from '../src/types';

/**
 * The marketing price rule.
 *
 * These cover the three states the hook can be in — loaded, failed/absent and
 * empty — because the failure mode being guarded against is showing a customer a
 * number that is not the catalogue price.
 *
 * Rendering is not covered here: the project has no DOM test environment and
 * adding one would mean new dependencies.
 */

const productWithPrice = (price: number): Product =>
  ({
    id: '507f1f77bcf86cd799439011',
    name: 'Neon Fuzz Box',
    slug: FEATURED_PRODUCT_SLUG,
    sku: 'IDIOT-NFB-001',
    description: 'Analog fuzz.',
    price,
    currency: 'INR',
    stock: 10,
    reservedStock: 0,
    availableStock: 10,
    status: 'active',
    images: [],
    audio: [],
    specifications: {},
  }) as Product;

test('the featured pedal is identified by slug, never by price', () => {
  assert.equal(FEATURED_PRODUCT_SLUG, 'neon-fuzz-box');
});

test('loaded: the label is the catalogue price formatted en-IN', () => {
  assert.equal(priceLabelFor(productWithPrice(2399)), '2,399');
  assert.equal(priceLabelFor(productWithPrice(49999)), '49,999');
  assert.equal(priceLabelFor(productWithPrice(999.5)), '999.5');
});

test('empty catalogue / missing slug: no price at all, never a fallback', () => {
  assert.equal(priceLabelFor(null), null);
});

test('failed fetch: still no price, and no number is invented', () => {
  // The hook resolves a failure to `product: null`, which reaches this function.
  const label = priceLabelFor(null);
  assert.equal(label, null);
  assert.notEqual(label, '2,399');
});

test('a genuinely free product shows zero rather than nothing', () => {
  // 0 came from the API, so it is a real price and must be displayed as such.
  assert.equal(priceLabelFor(productWithPrice(0)), '0');
});
