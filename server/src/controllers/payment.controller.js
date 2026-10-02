import {
  createRazorpayPaymentOrder,
  verifyRazorpayPayment,
} from "../services/payment.service.js";

import {
    sendAdminOrderEmail,
} from '../services/order.email.service.js'

const createRazorpayPayment = async (req, res, next) => {
  try {
    const result = await createRazorpayPaymentOrder({
      orderId: req.body.orderId,
      userId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      payment: {
        razorpayOrderId: result.razorpayOrderId,
        amount: result.amount,
        currency: result.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyRazorpayPaymentController = async (req, res, next) => {
  try {
    const order = await verifyRazorpayPayment({
      orderId: req.body.orderId,
      userId: req.user.userId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpayOrderId: req.body.razorpayOrderId,
      razorpaySignature: req.body.razorpaySignature,
    });

    void sendAdminOrderEmail(order);

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      payment: {
        status: order.payment.status,
        razorpayOrderId: order.payment.razorpayOrderId,
        razorpayPaymentId: order.payment.razorpayPaymentId,
      },
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    next(error);
  }
};

export {
  createRazorpayPayment,
  verifyRazorpayPaymentController,
};