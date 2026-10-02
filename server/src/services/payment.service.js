import Order from "../models/order.model.js";
import {
  createOrder as createRazorpayOrder,
  verifyPaymentSignature,
  fetchPayment,
} from "../integrations/razorpay/razorpay.service.js";


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

  // 4. Don't create another Razorpay order if one already exists
  if (order.payment.razorpayOrderId) {
    return {
      order,
      razorpayOrderId: order.payment.razorpayOrderId,
      amount: Math.round(order.pricing.total * 100),
      currency: order.pricing.currency,
    };
  }

  // 5. Get the authoritative amount from MongoDB
  const amount = Math.round(order.pricing.total * 100);

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

  // 7. Save Razorpay's order ID
  order.payment.razorpayOrderId = razorpayOrder.id;

  await order.save();

  return {
    order,
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

  const razorpayPayment = await fetchPayment(razorpayPaymentId);

  if (razorpayPayment.order_id !== trustedRazorpayOrderId) {
    const error = new Error("Razorpay payment does not belong to this order.");
    error.statusCode = 400;
    throw error;
  }

  //validate amount
  const expectedAmount = Math.round(order.pricing.total * 100);

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

  if (order.payment.status === "paid") {
    return order;
  }

  order.payment.razorpayPaymentId = razorpayPaymentId;
  order.payment.status = "paid";
  order.orderStatus = "confirmed";

await order.save();

  // Notify admin AFTER payment state is persisted.

  return order;
};

export { createRazorpayPaymentOrder, verifyRazorpayPayment };
