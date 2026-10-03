import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FEATURED_PRODUCT_SLUG, compareAtLabelFor, hasRealDiscount, priceLabelFor, savingsLabelFor } from '../src/hooks/useNeonFuzzBox';
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

/* -------------------------------------------------------------------------- */
/* compareAtPrice: the strikethrough and the saving                            */
/* -------------------------------------------------------------------------- */

const productWithCompareAt = (price: number, compareAtPrice?: number | null): Product => {
  const product = productWithPrice(price);

  if (compareAtPrice === undefined) return product;

  return { ...product, compareAtPrice: compareAtPrice as number };
};

test('loaded: 2399 with a compare-at of 3499 gives "3,499" and "1,100"', () => {
  const product = productWithCompareAt(2399, 3499);

  assert.equal(priceLabelFor(product), '2,399');
  assert.equal(compareAtLabelFor(product), '3,499');
  assert.equal(savingsLabelFor(product), '1,100');
  assert.equal(hasRealDiscount(product), true);
});

test('absent compareAtPrice: no strikethrough, no saving', () => {
  const product = productWithCompareAt(2399);

  assert.equal(compareAtLabelFor(product), null);
  assert.equal(savingsLabelFor(product), null);
  assert.equal(hasRealDiscount(product), false);
});

test('null compareAtPrice: no strikethrough, no saving', () => {
  const product = productWithCompareAt(2399, null);

  assert.equal(compareAtLabelFor(product), null);
  assert.equal(savingsLabelFor(product), null);
  assert.equal(hasRealDiscount(product), false);
});

test('savings of zero or less are null, so "Save ₹0" can never render', () => {
  const equal = productWithCompareAt(2399, 2399);
  assert.equal(hasRealDiscount(equal), false);
  assert.equal(savingsLabelFor(equal), null);
  assert.equal(compareAtLabelFor(equal), null);

  const lower = productWithCompareAt(2399, 1999);
  assert.equal(hasRealDiscount(lower), false);
  assert.equal(savingsLabelFor(lower), null);
  assert.equal(compareAtLabelFor(lower), null);
});

test('a failed fetch or empty catalogue shows neither price nor saving', () => {
  for (const product of [null]) {
    assert.equal(priceLabelFor(product), null);
    assert.equal(compareAtLabelFor(product), null);
    assert.equal(savingsLabelFor(product), null);
    assert.equal(hasRealDiscount(product), false);
  }
});

test('the discount is computed in integer paise, not floats', () => {
  // 2399.99 -> 239999 paise, 2499.99 -> 249999 paise: exactly 10.00 saved.
  const product = productWithCompareAt(2399.99, 2499.99);

  assert.equal(compareAtLabelFor(product), '2,499.99');
  assert.equal(savingsLabelFor(product), '100');

  // A sub-paise difference is not a discount.
  const tooClose = productWithCompareAt(2399, 2399.001);
  assert.equal(hasRealDiscount(tooClose), false);
  assert.equal(savingsLabelFor(tooClose), null);
});
