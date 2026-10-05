/**
 * Checkout contact selection (selectCheckoutContact).
 *
 * The User type promises a string phone and an address array, but any
 * un-normalised shape (stale cache, future producer) must degrade to empty
 * instead of throwing — this is what crashed checkout for phoneless users.
 *
 * Run: node --import tsx --test tests/checkoutContact.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildSavedAddressEntry, selectCheckoutContact } from '../src/pages/CheckoutPage';
import type { User } from '../src/types';

const address = (overrides = {}) => ({
  id: 'addr-1',
  label: 'Home',
  name: 'Test User',
  phone: '9876543210',
  addressLine1: '1 Test Street',
  addressLine2: '',
  city: 'Kolkata',
  state: 'West Bengal',
  postalCode: '700001',
  country: 'India',
  isDefault: false,
  ...overrides,
});

const userWith = (overrides = {}) =>
  ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    phone: '9876543210',
    role: 'customer',
    isEmailVerified: true,
    isPhoneVerified: false,
    addresses: [],
    ...overrides,
  }) as User;

describe('selectCheckoutContact', () => {
  it('a user object with no phone and no addresses does not throw', () => {
    const bare = { phone: undefined, addresses: undefined } as unknown as User;

    const selection = selectCheckoutContact(bare);

    assert.equal(selection.phone, '');
    assert.equal(selection.address, null);
    assert.equal(selection.hasPhone, false);
    assert.equal(selection.hasAddress, false);
  });

  it('null or undefined user degrades to empty', () => {
    for (const user of [null, undefined]) {
      const selection = selectCheckoutContact(user);
      assert.equal(selection.phone, '');
      assert.equal(selection.address, null);
      assert.equal(selection.hasPhone, false);
      assert.equal(selection.hasAddress, false);
    }
  });

  it('prefers the default address over the first one', () => {
    const user = userWith({
      addresses: [address({ id: 'a', isDefault: false }), address({ id: 'b', isDefault: true })],
    });

    const selection = selectCheckoutContact(user);

    assert.equal(selection.address?.id, 'b');
    assert.equal(selection.hasAddress, true);
    assert.equal(selection.phone, '9876543210');
    assert.equal(selection.hasPhone, true);
  });

  it('falls back to the first address when none is default', () => {
    const user = userWith({ addresses: [address({ id: 'a' }), address({ id: 'b' })] });

    assert.equal(selectCheckoutContact(user).address?.id, 'a');
  });

  it('skips null entries inside the address list', () => {
    const user = userWith({ addresses: [null, address({ id: 'b' })] });

    assert.equal(selectCheckoutContact(user).address?.id, 'b');
  });

  it('blank phone counts as missing', () => {
    const user = userWith({ phone: '   ' });

    const selection = selectCheckoutContact(user);

    assert.equal(selection.phone, '   ');
    assert.equal(selection.hasPhone, false);
  });
});

describe('buildSavedAddressEntry', () => {
  const fields = {
    name: 'Test User',
    phone: '9876543210',
    addressLine1: '1 Test Street',
    addressLine2: '',
    city: 'Kolkata',
    state: 'West Bengal',
    postalCode: '700001',
  };

  it('labels the first saved address Home and makes it default', () => {
    const entry = buildSavedAddressEntry(fields, 0);

    assert.equal(entry.label, 'Home');
    assert.equal(entry.isDefault, true);
    assert.equal(entry.country, 'India');
    assert.equal(entry.phone, '9876543210');
  });

  it('labels later addresses distinctly without forcing default', () => {
    const entry = buildSavedAddressEntry(fields, 2);

    assert.equal(entry.label, 'Address 3');
    assert.equal(entry.isDefault, false);
  });
});
