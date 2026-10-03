/**
 * Normalisers: convert raw Express API payloads into the app's view models.
 *
 * The UI must never depend on server-specific field names (`_id`,
 * `emailVerified`, `pricing.*`, `unitPrice.amount`). Everything funnels through
 * here so a missing/renamed field degrades to a safe default instead of an
 * unhandled exception.
 */

import type {
  CartItem,
  Order,
  OrderStatus,
  OrderTimelineStep,
  Product,
  ServerOrder,
  ServerProduct,
  ServerUser,
  ShippingAddress,
  User,
  UserAddress,
} from '../types';

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
/** Optional numeric field: returns undefined for missing or invalid input. */
const asOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/* -------------------------------------------------------------------------- */
/* User                                                                        */
/* -------------------------------------------------------------------------- */

export function normalizeAddress(raw: unknown): UserAddress | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const name = asString(record.name).trim();
  const addressLine1 = asString(record.addressLine1).trim();
  if (!name && !addressLine1) return null;

  return {
    id: asString(record.id) || asString(record._id) || undefined,
    label: asString(record.label) || undefined,
    name,
    phone: asString(record.phone),
    addressLine1,
    addressLine2: asString(record.addressLine2) || undefined,
    city: asString(record.city),
    state: asString(record.state),
    postalCode: asString(record.postalCode),
    country: asString(record.country, 'India') || 'India',
    isDefault: Boolean(record.isDefault),
  };
}

export function normalizeUser(raw: ServerUser | null | undefined): User | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = asString(raw._id) || asString(raw.id);
  const email = asString(raw.email);
  if (!id && !email) return null;

  return {
    id,
    name: asString(raw.name, 'Player One') || 'Player One',
    email,
    phone: asString(raw.phone),
    role: raw.role === 'admin' ? 'admin' : 'customer',
    isEmailVerified: Boolean(raw.emailVerified),
    isPhoneVerified: Boolean(raw.phoneVerified),
    addresses: asArray<unknown>(raw.addresses)
      .map(normalizeAddress)
      .filter((entry): entry is UserAddress => entry !== null),
    createdAt: asString(raw.createdAt) || undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Product                                                                     */
/* -------------------------------------------------------------------------- */

export function normalizeProduct(raw: ServerProduct | null | undefined): Product | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = asString(raw._id) || asString(raw.id);
  const name = asString(raw.name);
  if (!id || !name) return null;

  const stock = asNumber(raw.stock, 0);
  const reservedStock = asNumber(raw.reservedStock, 0);
  const status = raw.status === 'inactive' || raw.status === 'out_of_stock' ? raw.status : 'active';

  return {
    id,
    name,
    slug: asString(raw.slug),
    sku: asString(raw.sku),
    description: asString(raw.description),
    price: asNumber(raw.price, 0),
    // Optional: absent or unusable values become undefined (never 0).
    compareAtPrice: asOptionalNumber(raw.compareAtPrice),
    currency: asString(raw.currency, 'INR') || 'INR',
    stock,
    reservedStock,
    availableStock: Math.max(0, stock - reservedStock),
    status,
    images: asArray<unknown>(raw.images).filter((image): image is string => typeof image === 'string'),
    model3D: raw.model3D && typeof raw.model3D === 'object' ? raw.model3D : undefined,
    audio: asArray<{ name?: unknown; url?: unknown }>(raw.audio)
      .map((entry) => ({ name: asString(entry?.name), url: asString(entry?.url) }))
      .filter((entry) => entry.url.length > 0),
    specifications:
      raw.specifications && typeof raw.specifications === 'object' && !Array.isArray(raw.specifications)
        ? (raw.specifications as Record<string, unknown>)
        : {},
    createdAt: asString(raw.createdAt) || undefined,
  };
}

export function normalizeProducts(raw: unknown): Product[] {
  return asArray<ServerProduct>(raw)
    .map(normalizeProduct)
    .filter((entry): entry is Product => entry !== null);
}

export function toCartItem(product: Product, quantity = 1): CartItem {
  return {
    id: product.id,
    name: product.name,
    subtitle: product.sku || product.slug || product.description.slice(0, 64),
    price: product.price,
    quantity,
    image: product.images[0] ?? '',
    slug: product.slug,
    currency: product.currency,
    availableStock: product.availableStock,
  };
}

/* -------------------------------------------------------------------------- */
/* Order                                                                       */
/* -------------------------------------------------------------------------- */

const ORDER_STEPS: { key: OrderStatus; title: string; description: string }[] = [
  { key: 'pending', title: 'Order Placed', description: 'Order received and awaiting confirmation.' },
  { key: 'confirmed', title: 'Order Confirmed', description: 'Payment confirmation recorded.' },
  { key: 'processing', title: 'Bench Assembly', description: 'Your pedal is being assembled and bench tested.' },
  { key: 'shipped', title: 'Shipped', description: 'Handed over to the courier.' },
  { key: 'in_transit', title: 'In Transit', description: 'In transit through the logistics network.' },
  { key: 'out_for_delivery', title: 'Out for Delivery', description: 'Courier agent assigned for delivery.' },
  { key: 'delivered', title: 'Delivered', description: 'Delivered to the recipient.' },
];

const STATUS_ORDER: OrderStatus[] = ORDER_STEPS.map((step) => step.key);

/** Builds a sensible tracking timeline from the server's single status field. */
export function buildOrderTimeline(status: OrderStatus, createdAt: string): OrderTimelineStep[] {
  if (status === 'cancelled' || status === 'returned' || status === 'refunded') {
    return [
      {
        title: 'Order Placed',
        timestamp: createdAt ? new Date(createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '',
        completed: true,
        description: 'Order was created.',
      },
      {
        title: status === 'cancelled' ? 'Order Cancelled' : status === 'returned' ? 'Order Returned' : 'Order Refunded',
        timestamp: '',
        completed: true,
        current: true,
        description:
          status === 'cancelled'
            ? 'This order was cancelled.'
            : status === 'returned'
              ? 'This order was returned.'
              : 'This order was refunded.',
      },
    ];
  }

  const currentIndex = Math.max(0, STATUS_ORDER.indexOf(status));

  return ORDER_STEPS.map((step, index) => ({
    title: step.title,
    timestamp: index === 0 && createdAt ? new Date(createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : index <= currentIndex ? 'Completed' : 'Upcoming',
    completed: index <= currentIndex,
    current: index === currentIndex,
    description: step.description,
  }));
}

export function normalizeOrder(raw: ServerOrder | null | undefined): Order | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = asString(raw.orderNumber) || asString(raw._id) || asString(raw.id);
  if (!id) return null;

  const createdAt = asString(raw.createdAt);
  const status: OrderStatus = raw.orderStatus ?? 'pending';
  const items: CartItem[] = asArray<NonNullable<ServerOrder['items']>[number]>(raw.items).map((item, index) => ({
    id: asString(item?.productId) || `${id}-item-${index}`,
    name: asString(item?.name, 'Pedal'),
    subtitle: asString(item?.sku),
    price: asNumber(item?.unitPrice?.amount, 0),
    quantity: Math.max(1, asNumber(item?.quantity, 1)),
    image: '',
    currency: asString(item?.unitPrice?.currency, 'INR') || 'INR',
  }));

  const shippingAddress: ShippingAddress = {
    fullName: asString(raw.shippingAddress?.name) || asString(raw.customer?.name),
    phone: asString(raw.shippingAddress?.phone) || asString(raw.customer?.phone),
    email: asString(raw.customer?.email),
    addressLine1: asString(raw.shippingAddress?.addressLine1),
    addressLine2: asString(raw.shippingAddress?.addressLine2) || undefined,
    city: asString(raw.shippingAddress?.city),
    state: asString(raw.shippingAddress?.state),
    postalCode: asString(raw.shippingAddress?.postalCode),
    country: asString(raw.shippingAddress?.country, 'India') || 'India',
  };

  return {
    id,
    serverId: asString(raw._id) || undefined,
    orderNumber: id,
    userId: asString(raw.userId),
    createdAt,
    items,
    subtotal: asNumber(raw.pricing?.subtotal, 0),
    shippingFee: asNumber(raw.pricing?.shipping, 0),
    total: asNumber(raw.pricing?.total, 0),
    currency: asString(raw.pricing?.currency, 'INR') || 'INR',
    status,
    paymentMethod: raw.payment?.method === 'cod' ? 'cod' : 'razorpay',
    paymentStatus: raw.payment?.status ?? 'pending',
    paymentId: asString(raw.payment?.razorpayPaymentId) || undefined,
    shippingAddress,
    timeline: buildOrderTimeline(status, createdAt),
  };
}

export function normalizeOrders(raw: unknown): Order[] {
  return asArray<ServerOrder>(raw)
    .map(normalizeOrder)
    .filter((entry): entry is Order => entry !== null);
}
