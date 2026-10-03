export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  dryUrl: string;
  processedUrl: string;
}

export interface PedalComponentSpec {
  id: string;
  name: string;
  description: string;
  technicalSpecs: string[];
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export type UserRole = 'customer' | 'admin';

export interface UserAddress {
  id?: string;
  label?: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

/** Client-normalised user (server returns `emailVerified` / `_id`). */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  addresses: UserAddress[];
  createdAt?: string;
}

/** Raw shape returned by the Express API. */
export interface ServerUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  addresses?: UserAddress[];
  role?: UserRole;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export type ProductStatus = 'active' | 'inactive' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  /**
   * Optional display-only "was" price, rendered as a strikethrough. It is never
   * an input to a money calculation: order totals, payment amounts and stock all
   * derive from `price` alone.
   */
  compareAtPrice?: number;
  currency: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  status: ProductStatus;
  images: string[];
  model3D?: { url?: string; poster?: string };
  audio: { name: string; url: string }[];
  specifications: Record<string, unknown>;
  createdAt?: string;
}

/** Raw shape returned by GET /api/products. */
export interface ServerProduct {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  sku?: string;
  description?: string;
  price?: number;
  /** Optional display-only "was" price as returned by the API (may be null). */
  compareAtPrice?: number | null;
  currency?: string;
  stock?: number;
  reservedStock?: number;
  status?: ProductStatus;
  images?: string[];
  model3D?: { url?: string; poster?: string };
  audio?: { name?: string; url?: string }[];
  specifications?: Record<string, unknown>;
  createdAt?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/* -------------------------------------------------------------------------- */
/* Cart                                                                        */
/* -------------------------------------------------------------------------- */

export interface CartItem {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  slug?: string;
  currency?: string;
  availableStock?: number;
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

export type PaymentMethod = 'razorpay' | 'cod';
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderTimelineStep {
  title: string;
  timestamp: string;
  completed: boolean;
  current?: boolean;
  description: string;
}

export interface Order {
  id: string;
  /** Mongo ObjectId — required when talking to the payment endpoints. */
  serverId?: string;
  orderNumber: string;
  userId: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  shippingAddress: ShippingAddress;
  courierName?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  timeline: OrderTimelineStep[];
}

/** Raw shape returned by POST /api/order and GET /api/order. */
export interface ServerOrder {
  _id?: string;
  id?: string;
  orderNumber?: string;
  userId?: string;
  createdAt?: string;
  items?: {
    productId?: string;
    name?: string;
    sku?: string;
    quantity?: number;
    unitPrice?: { amount?: number; currency?: string };
    total?: { amount?: number; currency?: string };
  }[];
  pricing?: { subtotal?: number; shipping?: number; discount?: number; total?: number; currency?: string };
  customer?: { name?: string; email?: string; phone?: string };
  shippingAddress?: {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  payment?: { method?: PaymentMethod; status?: PaymentStatus; razorpayOrderId?: string; razorpayPaymentId?: string };
  orderStatus?: OrderStatus;
}

export interface AudioSamplePreset {
  id: string;
  name: string;
  style: string;
  description: string;
  riffType: 'riff' | 'lead' | 'chords' | 'garage';
  gainLevel: number;
  toneLevel: number;
  volLevel: number;
}
