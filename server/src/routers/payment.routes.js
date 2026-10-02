import express from "express";

import authenticateMiddleware from "../middlewares/authenticate.js";
import {createRazorpayPaymentValidator, verifyRazorpayPaymentValidator} from "../validators/payment.validator.js";
import validate from "../middlewares/validate.js";
import { createRateLimiter } from "../middlewares/rateLimiter.js";

import {
  createRazorpayPayment,
  verifyRazorpayPaymentController
} from "../controllers/payment.controller.js";


const router = express.Router();

/*
 * Payment endpoints are the most attractive target for abuse, so they get
 * their own strict allowance on top of the global API limiter.
 *
 * Create also makes an outbound Razorpay API call, which must not be
 * amplified by a retry loop or a double-clicked button.
 */
const paymentCreateRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many payment attempts. Please try again later.",
});

const paymentVerifyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many payment verification attempts. Please try again later.",
});

router.post(
  "/razorpay/create",
  authenticateMiddleware,
  paymentCreateRateLimiter,
  createRazorpayPaymentValidator,
  validate,
  createRazorpayPayment
);

router.post(
  "/razorpay/verify",
  authenticateMiddleware,
  paymentVerifyRateLimiter,
  verifyRazorpayPaymentValidator,
  validate,
  verifyRazorpayPaymentController
);

export default router;