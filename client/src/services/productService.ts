import { ApiError, publicApi } from '../lib/api';
import { normalizeProduct, normalizeProducts } from '../lib/normalize';
import type { Pagination, Product } from '../types';

export interface ProductQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'out_of_stock';
  search?: string;
  sort?: 'createdAt' | '-createdAt' | 'name' | '-name' | 'price' | '-price';
}

interface ProductsEnvelope {
  data?: { products?: unknown; pagination?: Pagination };
}

interface ProductEnvelope {
  data?: { product?: unknown };
}

/**
 * Product catalogue served by GET /api/products. Public endpoint — no auth.
 */
export async function getProducts(query: ProductQuery = {}): Promise<{
  products: Product[];
  pagination: Pagination | null;
}> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.sort) params.set('sort', query.sort);

  const search = params.toString();
  const envelope = await publicApi.get<ProductsEnvelope>(`/products${search ? `?${search}` : ''}`);

  return {
    products: normalizeProducts(envelope?.data?.products),
    pagination: envelope?.data?.pagination ?? null,
  };
}

/** Convenience: the shop listing (active products only). */
export async function getActiveProducts(limit = 50): Promise<Product[]> {
  const { products } = await getProducts({ status: 'active', limit, sort: '-createdAt' });
  return products;
}

/**
 * Single product by Mongo id. A missing product degrades to a typed
 * `not_found` ApiError so pages can render a real 404 state.
 */
export async function getProductById(id: string): Promise<Product> {
  if (!id) throw new ApiError('not_found', 'That pedal could not be found.');

  try {
    const envelope = await publicApi.get<ProductEnvelope>(`/products/${encodeURIComponent(id)}`);
    const product = normalizeProduct(envelope?.data?.product);

    if (!product) {
      throw new ApiError('not_found', 'That pedal could not be found.', 404);
    }

    return product;
  } catch (error) {
    // A malformed/legacy id (e.g. an old slug) makes the backend respond 400
    // "Invalid product ID." — on a product page that is really a 404.
    if (error instanceof ApiError && error.kind === 'validation') {
      throw new ApiError('not_found', 'That pedal could not be found.', 404);
    }
    throw error;
  }
}
