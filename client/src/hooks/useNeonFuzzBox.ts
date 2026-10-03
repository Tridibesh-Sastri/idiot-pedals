import { useEffect, useState } from 'react';

import { getActiveProducts } from '../services/productService';
import type { Product } from '../types';

/** The marketing pages feature this pedal. Identified by slug, never by price. */
export const FEATURED_PRODUCT_SLUG = 'neon-fuzz-box';

interface FeaturedState {
  product: Product | null;
  /** True once a fetch has settled, successfully or not. */
  loaded: boolean;
}

/*
 * One fetch for the whole app.
 *
 * Every marketing component that shows the featured pedal price reads this
 * module-level cache instead of calling the API itself, so the home page makes a
 * single products request no matter how many components ask. Subscribers are
 * notified when the fetch settles.
 */
let state: FeaturedState = { product: null, loaded: false };
let inFlight: Promise<FeaturedState> | null = null;

const subscribers = new Set<(next: FeaturedState) => void>();

const settle = (next: FeaturedState) => {
  state = next;
  for (const notify of subscribers) notify(next);
};

const fetchFeatured = (): Promise<FeaturedState> => {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      /*
       * A failure is NOT an error state here: the pricing rule is "show no price
       * at all" rather than a fallback number, so the caller only needs to know
       * that the product could not be resolved.
       */
      const products = await getActiveProducts(50);
      return { product: products.find((entry) => entry.slug === FEATURED_PRODUCT_SLUG) ?? null, loaded: true };
    } catch {
      return { product: null, loaded: true };
    } finally {
      inFlight = null;
    }
  })().then((next) => {
    settle(next);
    return next;
  });

  return inFlight;
};

/**
 * The pricing rule, as a pure function so it can be tested without a DOM.
 *
 * A missing product, an empty catalogue or a failed fetch all resolve to null:
 * a wrong price is worse than no price. There is deliberately no fallback.
 */
export const priceLabelFor = (product: Product | null): string | null =>
  product ? product.price.toLocaleString('en-IN') : null;

export interface FeaturedProduct {
  product: Product | null;
  loading: boolean;
  /**
   * `₹2,399` style label from the catalogue price, or **null** when the product
   * is not loaded / the catalogue is empty / the slug is missing. There is
   * deliberately no fallback price: a wrong number is worse than no number.
   */
  priceLabel: string | null;
  /** Where a buy button should go: the real product, or the catalogue. */
  href: string;
}

export const useNeonFuzzBox = (): FeaturedProduct => {
  const [snapshot, setSnapshot] = useState<FeaturedState>(state);

  useEffect(() => {
    let active = true;

    const notify = (next: FeaturedState) => {
      if (active) setSnapshot(next);
    };

    subscribers.add(notify);

    if (state.loaded) {
      notify(state);
    } else {
      void fetchFeatured();
    }

    return () => {
      active = false;
      subscribers.delete(notify);
    };
  }, []);

  const product = snapshot.product;

  return {
    product,
    loading: !snapshot.loaded,
    priceLabel: priceLabelFor(product),
    // Indexing by ObjectId: the detail page validates a Mongo id, not a slug.
    href: product ? `/products/${product.id}` : '/products',
  };
};

export default useNeonFuzzBox;
