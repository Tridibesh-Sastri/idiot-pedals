import crypto from "crypto";
import razorpay from "./razorpay.client.js";
import config from "../../config/config.js";

const createOrder = async ({
  amount,
  currency = "INR",
  receipt,
  notes = {},
}) => {
  const order = await razorpay.orders.create({
    amount,
    currency,
    receipt,
    notes,
  });

  return order;
};

const HEX_SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;

/**
 * Constant-time comparison of two hex signatures.
 *
 * A plain `===` short-circuits on the first differing byte, which leaks how
 * much of a forged signature was correct. Buffers must be equal length for
 * timingSafeEqual, and the length check itself must not depend on secret data —
 * both signatures here are fixed-size SHA-256 hex digests, so a length mismatch
 * only means "malformed input".
 */
const timingSafeCompareHex = (expectedHex, receivedHex) => {
  if (
    typeof expectedHex !== "string" ||
    typeof receivedHex !== "string"
  ) {
    return false;
  }

  if (!HEX_SIGNATURE_PATTERN.test(expectedHex)) {
    return false;
  }

  if (!HEX_SIGNATURE_PATTERN.test(receivedHex)) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedHex, "hex"),
    Buffer.from(receivedHex, "hex")
  );
};

const verifyPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  if (
    typeof razorpayOrderId !== "string" ||
    typeof razorpayPaymentId !== "string"
  ) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return timingSafeCompareHex(generatedSignature, razorpaySignature);
};

const fetchPayment = async (paymentId) => {
  const payment = await razorpay.payments.fetch(paymentId);

  return payment;
};

export {
  createOrder,
  verifyPaymentSignature,
  fetchPayment,
};