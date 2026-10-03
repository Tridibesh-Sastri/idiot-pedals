import { ApiError, api } from "../lib/api";
import { normalizeOrder, normalizeOrders } from "../lib/normalize";
import type {
  Order,
  PaymentMethod,
  ServerOrder,
  ShippingAddress,
} from "../types";

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
    pagination?: {
      page?: number;
      limit?: number;
      total?: number;
      totalPages?: number;
      hasNextPage?: boolean;
    };
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
        typeof item.productId !== "string" ||
        !MONGO_OBJECT_ID_PATTERN.test(item.productId),
    );

    if (hasInvalidItem) {
      throw new ApiError(
        "validation",
        "Some items in your cart are no longer available. Please re-add items to your cart.",
      );
    }

    const items = input.items
      .filter(
        (item) =>
          item &&
          typeof item.productId === "string" &&
          item.productId.length > 0,
      )
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, Math.trunc(item.quantity)),
      }));

    if (items.length === 0) {
      throw new ApiError(
        "validation",
        "No valid products in checkout. Please re-add items to your cart.",
      );
    }

    const { shippingAddress } = input;

    const envelope = await api.post<OrderEnvelope>("/order", {
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
        ...(shippingAddress.addressLine2
          ? { addressLine2: shippingAddress.addressLine2 }
          : {}),
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || "India",
      },
    });

    const order = normalizeOrder(envelope?.order);
    if (!order) {
      throw new ApiError(
        "server",
        "The order was created but the server response could not be read.",
      );
    }
    return order;
  }

  async getOrders(query: GetOrdersQuery = {}): Promise<Order[]> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.status) params.set("status", query.status);

    const search = params.toString();
    const envelope = await api.get<OrdersEnvelope>(
      `/order${search ? `?${search}` : ""}`,
    );
    return normalizeOrders(envelope?.data?.orders);
  }

  /**
   * Single order detail via GET /api/order/:id.
   *
   * The endpoint is owner-scoped and returns 404 for another user's order (never
   * 403), so a 404 maps to "not found" rather than an error screen.
   *
   * Either identifier works: the backend accepts the Mongo ObjectId or the
   * human-readable order number that the UI links with.
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    if (!orderId) return null;

    try {
      const envelope = await api.get<{ data?: { order?: unknown } }>(
        `/order/${encodeURIComponent(orderId)}`,
      );

      const order = envelope?.data?.order;
      return order ? normalizeOrder(order) : null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  /**
   * POST /api/order/:id/cancel — owner-scoped, idempotent. Only works while
   * the order is still pending/pending-payment; the server returns 409 once
   * it's paid or already in fulfillment, and 404 for a missing/foreign order.
   */
  async cancelOrder(orderId: string): Promise<Order> {
    const envelope = await api.post<{
      message?: string;
      data?: { order?: ServerOrder };
    }>(`/order/${encodeURIComponent(orderId)}/cancel`, {});

    const order = normalizeOrder(envelope?.data?.order);
    if (!order) {
      throw new ApiError(
        "server",
        "The order was cancelled but the server response could not be read.",
      );
    }
    return order;
  }
}

// Export singleton instance
export const orderService = new OrderService();
