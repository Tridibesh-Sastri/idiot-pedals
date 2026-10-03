import Order from "../models/order.model.js";
import {
  createOrder as createRazorpayOrder,
  verifyPaymentSignature,
  fetchPayment,
} from "../integrations/razorpay/razorpay.service.js";

import { toMinor } from "../utils/money.js";
import { logger } from "../utils/logger.js";
import {
  ORDER_STATUS,
  applyTransition,
} from "../domain/orderStateMachine.js";

/** Authoritative paise total, falling back for documents predating `totalMinor`. */
const orderTotalMinor = (order) =>
  order.pricing.totalMinor ?? toMinor(order.pricing.total);


const createRazorpayPaymentOrder = async ({ orderId, userId }) => {
  // 1. Find the internal order belonging to this user
  const order = await Order.findOne({
    _id: orderId,
    userId,
  });

  if (!order) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify this order is actually using Razorpay
  if (order.payment.method !== "razorpay") {
    const error = new Error(
      "This order is not configured for Razorpay payment.",
    );

    error.statusCode = 400;
    throw error;
  }

  // 3. Payment must still be pending
  if (order.payment.status !== "pending") {
    const error = new Error("This order is not available for payment.");

    error.statusCode = 409;
    throw error;
  }

  // v1 specific INR currency only check
  if (order.pricing.currency !== "INR") {
    const error = new Error("Only INR payments are supported.");

    error.statusCode = 400;
    throw error;
  }

  // 4. Idempotency: an order gets exactly one Razorpay order.
  //
  // A double-clicked "Pay" button must not create two Razorpay orders. We
  // return the stored one when it exists, and when two requests race we let the
  // database decide the winner (conditional update on razorpayOrderId: null)
  // and return the winner's id to both callers.
  if (order.payment.razorpayOrderId) {
    return {
      order,
      razorpayOrderId: order.payment.razorpayOrderId,
      amount: orderTotalMinor(order),
      currency: order.pricing.currency,
    };
  }

  // 5. Get the authoritative amount from our own database (integer paise)
  const amount = orderTotalMinor(order);

  // 6. Create Razorpay order
  const razorpayOrder = await createRazorpayOrder({
    amount,
    currency: order.pricing.currency,
    receipt: order.orderNumber,
    notes: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    },
  });

  // 7. Persist Razorpay's order ID only if another request has not already won
  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      "payment.razorpayOrderId": null,
    },
    {
      $set: { "payment.razorpayOrderId": razorpayOrder.id },
    },
    { new: true },
  );

  if (!claimed) {
    const winner = await Order.findById(order._id);

    logger.info(
      {
        orderNumber: order.orderNumber,
        razorpayOrderId: winner?.payment.razorpayOrderId,
      },
      "Concurrent create-payment call reused the existing Razorpay order",
    );

    return {
      order: winner,
      razorpayOrderId: winner.payment.razorpayOrderId,
      amount: orderTotalMinor(order),
      currency: order.pricing.currency,
    };
  }

  return {
    order: claimed,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  };
};

const verifyRazorpayPayment = async ({
  orderId,
  userId,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature,
}) => {
  const order = await Order.findOne({
    _id: orderId,
    userId,
  });

  if (!order) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  if (order.payment.method !== "razorpay") {
    const error = new Error(
      "This order is not configured for Razorpay payment.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!order.payment.razorpayOrderId) {
    const error = new Error("Razorpay order has not been created.");
    error.statusCode = 400;
    throw error;
  }

  // IMPORTANT:
  // Do NOT trust the razorpayOrderId sent by the frontend.
  // Use the one stored in our database.
  const trustedRazorpayOrderId = order.payment.razorpayOrderId;

  if (trustedRazorpayOrderId !== razorpayOrderId) {
    const error = new Error("Razorpay order ID mismatch.");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Signature first: it is a local HMAC check (no provider round-trip), so a
   * forged or malformed callback is rejected before we spend a network call.
   * The signature is computed over the order id from OUR database, which is what
   * binds it to this specific order.
   */
  const isValid = verifyPaymentSignature({
    razorpayOrderId: trustedRazorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!isValid) {
    const error = new Error("Invalid Razorpay payment signature.");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Replay handling, also without a network call.
   *
   *  - Same payment id replayed on an already-paid order: idempotent success.
   *  - A DIFFERENT payment id against an already-paid order: reject, otherwise
   *    one order could be settled by an unrelated payment.
   */
  if (order.payment.status === "paid") {
    if (
      order.payment.razorpayPaymentId &&
      order.payment.razorpayPaymentId !== razorpayPaymentId
    ) {
      const error = new Error(
        "This order has already been paid with a different payment.",
      );
      error.statusCode = 409;
      throw error;
    }

    /*
     * Marking the returned document lets the caller tell a real confirmation
     * apart from a client retry, so a retry does not re-send the admin email.
     */
    order.alreadyPaid = true;

    return order;
  }

  // One Razorpay payment may only ever settle one internal order.
  const paymentAlreadyUsed = await Order.findOne({
    "payment.razorpayPaymentId": razorpayPaymentId,
    _id: { $ne: order._id },
  })
    .select("_id")
    .lean();

  if (paymentAlreadyUsed) {
    const error = new Error(
      "This Razorpay payment has already been applied to another order.",
    );
    error.statusCode = 409;
    throw error;
  }

  /*
   * Only now talk to the provider: we must confirm server-side that the payment
   * really is captured and for the right amount before touching our own state.
   */
  const razorpayPayment = await fetchPayment(razorpayPaymentId);

  if (razorpayPayment.order_id !== trustedRazorpayOrderId) {
    const error = new Error("Razorpay payment does not belong to this order.");
    error.statusCode = 400;
    throw error;
  }

  //validate amount (integer paise, authoritative)
  const expectedAmount = orderTotalMinor(order);

  if (razorpayPayment.amount !== expectedAmount) {
    const error = new Error(
      "Razorpay payment amount does not match the order.",
    );
    error.statusCode = 400;
    throw error;
  }

  // validate currency
  if (razorpayPayment.currency !== order.pricing.currency) {
    const error = new Error(
      "Razorpay payment currency does not match the order.",
    );
    error.statusCode = 400;
    throw error;
  }

  // check razorpay payment status
  if (razorpayPayment.status !== "captured") {
    const error = new Error("Razorpay payment has not been captured.");
    error.statusCode = 409;
    throw error;
  }

  order.payment.razorpayPaymentId = razorpayPaymentId;
  order.payment.status = "paid";

  /*
   * Confirmed, NOT fulfilled. The provider webhook is the source of truth and
   * is the only thing allowed to finalize the order; a client-triggered verify
   * must not be able to do it alone.
   */
  applyTransition(order, ORDER_STATUS.CONFIRMED);

  await order.save();

  logger.info(
    {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.payment.status,
    },
    "Payment verified",
  );

  // Notify admin AFTER payment state is persisted.

  return order;
};

export { createRazorpayPaymentOrder, verifyRazorpayPayment };
