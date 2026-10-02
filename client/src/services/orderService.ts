import { ApiError, api } from '../lib/api';
import { normalizeOrder, normalizeOrders } from '../lib/normalize';
import type { Order, PaymentMethod, ServerOrder, ShippingAddress } from '../types';

export interface CreateOrderInput {
  items: { productId: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  shippingAddress: ShippingAddress;
}

export interface GetOrdersQuery {
  page?: number;
  limit?: number;
  status?: string;
}

interface OrderEnvelope {
  message?: string;
  order?: ServerOrder;
}

interface OrdersEnvelope {
  message?: string;
  data?: {
    orders?: unknown;
    pagination?: { page?: number; limit?: number; total?: number; totalPages?: number; hasNextPage?: boolean };
  };
}

/**
 * OrderService — backed by the Express order API.
 *
 * Create sends productId + quantity ONLY. Prices/totals are computed by the
 * server from its own catalogue; the client never sends a price.
 */
/**
 * Backend product ids are Mongo ObjectIds. Legacy/mock cart lines such as
 * "neon-fuzz-box" (persisted in localStorage before the catalogue moved to the
 * API) would otherwise reach the server and come back as a generic
 * "Invalid product ID" 400. Reject them here with an actionable message.
 */
const MONGO_OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

class OrderService {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const hasInvalidItem = (input.items ?? []).some(
      (item) =>
        !item ||
        typeof item.productId !== 'string' ||
        !MONGO_OBJECT_ID_PATTERN.test(item.productId)
    );

    if (hasInvalidItem) {
      throw new ApiError(
        'validation',
        'Some items in your cart are no longer available. Please re-add items to your cart.'
      );
    }

    const items = input.items
      .filter((item) => item && typeof item.productId === 'string' && item.productId.length > 0)
      .map((item) => ({ productId: item.productId, quantity: Math.max(1, Math.trunc(item.quantity)) }));

    if (items.length === 0) {
      throw new ApiError('validation', 'No valid products in checkout. Please re-add items to your cart.');
    }

    const { shippingAddress } = input;

    const envelope = await api.post<OrderEnvelope>('/order', {
      items,
      paymentMethod: input.paymentMethod,
      customer: {
        name: shippingAddress.fullName,
        email: shippingAddress.email,
        phone: shippingAddress.phone,
      },
      shippingAddress: {
        name: shippingAddress.fullName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        ...(shippingAddress.addressLine2 ? { addressLine2: shippingAddress.addressLine2 } : {}),
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'India',
      },
    });

    const order = normalizeOrder(envelope?.order);
    if (!order) {
      throw new ApiError('server', 'The order was created but the server response could not be read.');
    }
    return order;
  }

  async getOrders(query: GetOrdersQuery = {}): Promise<Order[]> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.status) params.set('status', query.status);

    const search = params.toString();
    const envelope = await api.get<OrdersEnvelope>(`/order${search ? `?${search}` : ''}`);
    return normalizeOrders(envelope?.data?.orders);
  }

  /**
   * The backend exposes no GET /api/order/:id, so detail is derived from the
   * user-scoped list. Walks paginated pages (bounded) to find the order.
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    if (!orderId) return null;

    const limit = 50;
    let page = 1;
    const maxPages = 5;

    while (page <= maxPages) {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const envelope = await api.get<OrdersEnvelope>(`/order?${params.toString()}`);
      const orders = normalizeOrders(envelope?.data?.orders);

      const match = orders.find((order) => order.id === orderId || order.serverId === orderId);
      if (match) return match;

      const hasNext = envelope?.data?.pagination?.hasNextPage;
      if (!hasNext || orders.length === 0) return null;
      page += 1;
    }

    return null;
  }
}

// Export singleton instance
export const orderService = new OrderService();
