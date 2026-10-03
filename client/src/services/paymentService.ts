import { ApiError, api } from '../lib/api';
import { RAZORPAY_KEY_ID } from './apiConfig';

/**
 * Razorpay integration.
 *
 * Flow (all server-authoritative):
 *   1. POST /api/payments/razorpay/create  { orderId }        -> razorpay order
 *   2. Razorpay Checkout modal (hosted — no card data in React state)
 *   3. POST /api/payments/razorpay/verify  { orderId, razorpayPaymentId,
 *      razorpayOrderId, razorpaySignature }
 *
 * The order is NEVER treated as paid from the client callback alone: only a
 * successful verify response (which the backend cross-checks against Razorpay
 * and the stored order) marks it paid. The webhook remains the source of truth.
 */

/* -------------------------------------------------------------------------- */
/* Razorpay SDK typings (minimal)                                              */
/* -------------------------------------------------------------------------- */

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void; escape?: boolean; confirm_close?: boolean };
}

interface RazorpayInstance {
  open: () => void;
  close?: () => void;
  on?: (event: string, handler: (payload: unknown) => void) => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const SDK_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface RazorpayOrderDetails {
  razorpayOrderId: string;
  /** Amount in the smallest currency subunit (paise). Provided by the server. */
  amount: number;
  currency: string;
}

export interface VerifyPaymentInput {
  /** Internal (Mongo) order id — never the Razorpay order id. */
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResult {
  status: string;
  orderStatus?: string;
  message: string;
}

export type RazorpayOutcome =
  | { type: 'verified'; result: VerifyPaymentResult }
  | { type: 'dismissed' }
  | { type: 'failed'; error: ApiError };

export interface PayWithRazorpayParams {
  orderId: string;
  amountLabel: string;
  prefill: { name: string; email: string; contact: string };
}

/* -------------------------------------------------------------------------- */
/* SDK loader                                                                  */
/* -------------------------------------------------------------------------- */

let sdkPromise: Promise<void> | null = null;

function loadRazorpaySdk(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else reject(new ApiError('network', 'The payment gateway could not be initialised. Please try again.'));
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new ApiError('network', 'Could not load the payment gateway. Check your connection and try again.'));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
}

/* -------------------------------------------------------------------------- */
/* Service                                                                     */
/* -------------------------------------------------------------------------- */

class PaymentService {
  /** Asks the backend to create (or reuse) a Razorpay order for our order. */
  async createRazorpayOrder(orderId: string): Promise<RazorpayOrderDetails> {
    if (!orderId) {
      throw new ApiError('validation', 'A confirmed order is required before starting payment.');
    }

    const envelope = await api.post<{
      payment?: { razorpayOrderId?: string; amount?: number; currency?: string };
    }>('/payments/razorpay/create', { orderId });

    const razorpayOrderId = envelope?.payment?.razorpayOrderId;
    const amount = envelope?.payment?.amount;
    const currency = envelope?.payment?.currency;

    if (typeof razorpayOrderId !== 'string' || !razorpayOrderId || typeof amount !== 'number') {
      throw new ApiError('server', 'The payment gateway returned an unexpected response. Please try again.');
    }

    return { razorpayOrderId, amount, currency: currency ?? 'INR' };
  }

  /**
   * Server-side verification. This is the ONLY thing that may mark an order as
   * paid — the Razorpay client callback alone proves nothing.
   */
  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const envelope = await api.post<{
      message?: string;
      payment?: { status?: string };
      orderStatus?: string;
    }>('/payments/razorpay/verify', {
      orderId: input.orderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpayOrderId: input.razorpayOrderId,
      razorpaySignature: input.razorpaySignature,
    });

    return {
      status: envelope?.payment?.status ?? 'paid',
      orderStatus: envelope?.orderStatus,
      message: envelope?.message ?? 'Payment verified successfully.',
    };
  }

  /**
   * Full create -> modal -> verify cycle. Resolves once the outcome is known so
   * the caller never has to inspect the Razorpay callback itself.
   */
  async payWithRazorpay(params: PayWithRazorpayParams): Promise<RazorpayOutcome> {
    if (!RAZORPAY_KEY_ID) {
      throw new ApiError(
        'server',
        'Online payments are not configured. Set VITE_RAZORPAY_KEY_ID for this environment.'
      );
    }

    const details = await this.createRazorpayOrder(params.orderId);
    await loadRazorpaySdk();

    const Razorpay = window.Razorpay;
    if (!Razorpay) {
      throw new ApiError('network', 'The payment gateway could not be loaded. Please try again.');
    }

    return new Promise<RazorpayOutcome>((resolve) => {
      let settled = false;
      let handlerStarted = false;

      const finish = (outcome: RazorpayOutcome) => {
        if (settled) return;
        settled = true;
        resolve(outcome);
      };

      const instance = new Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: details.amount,
        currency: details.currency,
        name: 'IDIOT Pedals',
        description: `Order ${params.amountLabel}`,
        order_id: details.razorpayOrderId,
        prefill: params.prefill,
        theme: { color: '#FF5E1E' },
        handler: (response) => {
          handlerStarted = true;

          // Verify server-side before reporting success to the caller.
          this.verifyPayment({
            orderId: params.orderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then((result) => finish({ type: 'verified', result }))
            .catch((error) =>
              finish({
                type: 'failed',
                error:
                  error instanceof ApiError
                    ? error
                    : new ApiError('unknown', 'We could not verify your payment. Please contact support.'),
              })
            );
        },
        modal: {
          ondismiss: () => {
            if (handlerStarted) return; // payment went through; verify is in flight
            finish({ type: 'dismissed' });
          },
        },
      });

      instance.open();
    });
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
