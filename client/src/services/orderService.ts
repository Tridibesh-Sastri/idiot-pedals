import { Order, CartItem, ShippingAddress, PaymentMethod } from '../types';
import { STORAGE_KEYS, sleep } from './apiConfig';

/**
 * Pre-seeded sample order to provide instant tracking and receipt demonstration
 * without requiring the user to immediately submit an order.
 */
const INITIAL_ORDERS: Order[] = [
  {
    id: 'IP-884210',
    userId: 'usr_ip_01',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'neon-fuzz-box',
        name: 'Neon Fuzz Box',
        subtitle: 'Vintage Germanium/Silicon Hybrid Circuit',
        price: 2499,
        originalPrice: 3499,
        quantity: 1,
        image: '/assets/pedal_preview.jpg',
      },
    ],
    subtotal: 2499,
    shippingFee: 0,
    total: 2499,
    status: 'in_transit',
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    paymentId: 'pay_Nf9Xp02K9872',
    courierName: 'Shiprocket / Blue Dart Express',
    trackingNumber: 'BD-88920145IN',
    estimatedDelivery: 'Tomorrow by 6:00 PM',
    shippingAddress: {
      fullName: 'Arjun Sen',
      phone: '+91 98301 23456',
      email: 'arjun.sen@guitarist.in',
      addressLine1: 'Flat 4B, Harmony Heights, 14 Lake Temple Road',
      addressLine2: 'Near Southern Avenue',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700029',
      country: 'India',
    },
    timeline: [
      {
        title: 'Order Confirmed',
        timestamp: 'Yesterday, 10:20 AM',
        completed: true,
        description: 'Payment verified via Razorpay. Direct workshop ticket generated.',
      },
      {
        title: 'Bench Tested & Packed',
        timestamp: 'Yesterday, 3:45 PM',
        completed: true,
        description: 'Quality tested on 9V power and audio analyzer. Packed with protective foam & guitar pick.',
      },
      {
        title: 'Shipped via Shiprocket',
        timestamp: 'Today, 8:15 AM',
        completed: true,
        description: 'Handed over to Blue Dart Express hub. AWB: BD-88920145IN.',
      },
      {
        title: 'In Transit',
        timestamp: 'Today, 4:30 PM',
        completed: true,
        current: true,
        description: 'Shipment has departed regional transit facility towards delivery hub.',
      },
      {
        title: 'Out for Delivery',
        timestamp: 'Expected Tomorrow',
        completed: false,
        description: 'Courier agent assigned for doorstep delivery.',
      },
      {
        title: 'Delivered',
        timestamp: 'Pending Delivery',
        completed: false,
        description: 'Package delivered to recipient with OTP confirmation.',
      },
    ],
  },
];

/**
 * OrderService Class
 *
 * Manages customer order placement, order lookup, and persistent storage
 * in browser localStorage.
 */
class OrderService {
  /**
   * Reads stored orders from localStorage or seeds the default sample orders
   */
  private getStoredOrders(): Order[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
        return INITIAL_ORDERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ORDERS;
    }
  }

  /**
   * Writes orders array to localStorage
   */
  private setStoredOrders(orders: Order[]) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  /**
   * Retrieves orders for a specific user, or all orders if no userId is supplied
   */
  async getOrders(userId?: string): Promise<Order[]> {
    await sleep(300);
    const orders = this.getStoredOrders();
    if (userId) {
      return orders.filter((o) => o.userId === userId || o.userId === 'usr_ip_01');
    }
    return orders;
  }

  /**
   * Fetches a specific order by its unique ID (e.g. "IP-884210")
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    await sleep(250);
    const orders = this.getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    return order || null;
  }

  /**
   * Creates a new customer order, computes financial totals,
   * generates tracking numbers, initializes the shipment tracking timeline,
   * and saves it to localStorage.
   *
   * @param payload Order details including items, address, and payment method
   * @returns Newly created Order object
   */
  async createOrder(payload: {
    userId: string;
    items: CartItem[];
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    paymentId?: string;
  }): Promise<Order> {
    await sleep(600);

    const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = 0; // Free nationwide shipping for launch
    const total = subtotal + shippingFee;

    // Generate a human-readable order ID with "IP-" prefix
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const orderId = `IP-${randomNum}`;

    const newOrder: Order = {
      id: orderId,
      userId: payload.userId,
      createdAt: new Date().toISOString(),
      items: payload.items,
      subtotal,
      shippingFee,
      total,
      status: 'confirmed',
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentMethod === 'razorpay' ? 'paid' : 'pending',
      paymentId: payload.paymentId || (payload.paymentMethod === 'cod' ? undefined : `pay_${Date.now()}`),
      shippingAddress: payload.shippingAddress,
      courierName: 'Shiprocket / Blue Dart Surface',
      trackingNumber: `BD-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
      estimatedDelivery: 'Within 3-4 Business Days',
      timeline: [
        {
          title: 'Order Confirmed',
          timestamp: 'Just now',
          completed: true,
          current: true,
          description:
            payload.paymentMethod === 'cod'
              ? 'Order placed with Cash on Delivery. Verification pending.'
              : 'Payment verified successfully. Workbench order queued.',
        },
        {
          title: 'Bench Testing & Assembly',
          timestamp: 'Upcoming',
          completed: false,
          description: 'Each pedal is individually calibrated and tested before dispatch.',
        },
        {
          title: 'Handover to Courier',
          timestamp: 'Upcoming',
          completed: false,
          description: 'Package picked up by courier with live tracking.',
        },
        {
          title: 'In Transit',
          timestamp: 'Upcoming',
          completed: false,
          description: 'Transit through logistics network.',
        },
        {
          title: 'Delivered',
          timestamp: 'Upcoming',
          completed: false,
          description: 'Direct to your door.',
        },
      ],
    };

    // Prepend to orders list and persist
    const orders = this.getStoredOrders();
    orders.unshift(newOrder);
    this.setStoredOrders(orders);

    return newOrder;
  }
}

// Export singleton instance
export const orderService = new OrderService();
