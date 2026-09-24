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

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
}

export type PaymentMethod = 'razorpay' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus =
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

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
  userId: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
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
