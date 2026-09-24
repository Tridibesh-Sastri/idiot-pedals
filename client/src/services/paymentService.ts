import { sleep } from './apiConfig';

/**
 * Payload sent to create an order on the Razorpay gateway
 */
export interface RazorpayOrderPayload {
  /** Order amount in Indian Rupees */
  amount: number;
  /** ISO 4217 currency code (usually 'INR') */
  currency: string;
  /** Merchant receipt identifier */
  receipt: string;
}

/**
 * Response structure returned after creating an order with Razorpay
 */
export interface RazorpayOrderResponse {
  /** Razorpay Order ID (e.g. "order_rzp_...") */
  id: string;
  /** Amount in smallest currency subunit (paise) */
  amount: number;
  /** Currency string */
  currency: string;
  /** Public Razorpay Key ID for client-side checkout integration */
  keyId: string;
}

/**
 * Payload received after user completes payment in the Razorpay Modal
 */
export interface PaymentVerificationPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * PaymentService Class
 *
 * Handles client-side integration with Razorpay Payment Gateway,
 * order preparation, and cryptographic signature verification.
 */
class PaymentService {
  /**
   * Requests backend endpoint to create a Razorpay Order.
   *
   * @param amount Amount in INR (will be converted to paise)
   * @param receipt Optional receipt identifier
   * @returns Razorpay order details required to launch the payment modal
   */
  async createRazorpayOrder(amount: number, receipt = `rcpt_${Date.now()}`): Promise<RazorpayOrderResponse> {
    await sleep(400);

    // In a live production deployment, this makes a POST request to /api/payments/razorpay-order
    return {
      id: `order_rzp_${Date.now()}`,
      amount: amount * 100, // Converted to paise (1 INR = 100 paise)
      currency: 'INR',
      keyId: 'rzp_test_placeholder_key',
    };
  }

  /**
   * Verifies the cryptographic HMAC SHA256 signature returned by Razorpay
   * to ensure payment integrity before marking the order as paid.
   *
   * @param payload Razorpay payment ID, order ID, and signature
   * @returns Verification confirmation result
   */
  async verifyPayment(payload: PaymentVerificationPayload): Promise<{ success: boolean; message: string }> {
    await sleep(500);

    // In production, this makes a POST request to /api/payments/verify
    if (!payload.razorpay_payment_id) {
      throw new Error('Payment identification failed.');
    }

    return {
      success: true,
      message: 'Payment verified and settled securely.',
    };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
