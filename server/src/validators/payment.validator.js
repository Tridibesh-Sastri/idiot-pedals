import { body } from "express-validator";

export const createRazorpayPaymentValidator = [
  body("orderId")
    .isMongoId()
    .withMessage("Invalid order ID."),
];

export const verifyRazorpayPaymentValidator = [
  body("orderId")
    .isMongoId()
    .withMessage("Invalid order ID."),

  body("razorpayPaymentId")
    .isString()
    .notEmpty()
    .withMessage("Razorpay payment ID is required."),

  body("razorpayOrderId")
    .isString()
    .notEmpty()
    .withMessage("Razorpay order ID is required."),

  body("razorpaySignature")
    .isString()
    .notEmpty()
    .withMessage("Razorpay signature is required."),
];