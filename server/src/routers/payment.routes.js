import express from "express";

import authenticateMiddleware from "../middlewares/authenticate.js";
import {createRazorpayPaymentValidator, verifyRazorpayPaymentValidator} from "../validators/payment.validator.js";
import validate from "../middlewares/validate.js";

import {
  createRazorpayPayment,
  verifyRazorpayPaymentController
} from "../controllers/payment.controller.js";


const router = express.Router();

router.post(
  "/razorpay/create",
  authenticateMiddleware,
  createRazorpayPaymentValidator,
  validate,
  createRazorpayPayment
);

router.post(
  "/razorpay/verify",
  authenticateMiddleware,
  verifyRazorpayPaymentValidator,
  validate,
  verifyRazorpayPaymentController
);

export default router;