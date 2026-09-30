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

const verifyPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const generatedSignature = crypto
    .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return generatedSignature === razorpaySignature;
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