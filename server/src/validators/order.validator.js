import { body, param, query,validationResult } from "express-validator";
import mongoose from "mongoose";
import { INDIAN_PHONE_RE, INDIAN_PINCODE_RE } from "./patterns.js";

export const createOrderValidator = [
  body("items")
    .isArray({ min: 1, max: 100 })
    .withMessage("Order must contain between 1 and 100 items."),

  body("items.*.productId")
    .isMongoId()
    .withMessage("Invalid product ID."),

  body("items.*.quantity")
    .isInt({ min: 1, max: 100 })
    .withMessage("Quantity must be an integer between 1 and 100."),

  body("paymentMethod")
    .isIn(["razorpay", "cod"])
    .withMessage("Payment method must be razorpay or cod."),

  body("customer.name")
    .trim()
    .notEmpty()
    .withMessage("Customer name is required.")
    .isLength({ max: 150 })
    .withMessage("Customer name is too long."),

  body("customer.email")
    .trim()
    .isEmail()
    .withMessage("Valid customer email is required.")
    .normalizeEmail(),

  body("customer.phone")
    .trim()
    .notEmpty()
    .withMessage("Customer phone is required.")
    .matches(INDIAN_PHONE_RE)
    .withMessage("Enter a valid 10-digit Indian phone number.")
    .bail()
    .isLength({ max: 20 })
    .withMessage("Customer phone is too long."),

  body("shippingAddress.name")
    .trim()
    .notEmpty()
    .withMessage("Shipping name is required.")
    .isLength({ max: 150 }),

  body("shippingAddress.phone")
    .trim()
    .notEmpty()
    .withMessage("Shipping phone is required.")
    .matches(INDIAN_PHONE_RE)
    .withMessage("Enter a valid 10-digit Indian phone number for shipping.")
    .bail()
    .isLength({ max: 20 }),

  body("shippingAddress.addressLine1")
    .trim()
    .notEmpty()
    .withMessage("Address line 1 is required.")
    .isLength({ max: 500 }),

  body("shippingAddress.addressLine2")
    .optional()
    .trim()
    .isLength({ max: 500 }),

  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required.")
    .isLength({ max: 100 }),

  body("shippingAddress.state")
    .trim()
    .notEmpty()
    .withMessage("State is required.")
    .isLength({ max: 100 }),

  body("shippingAddress.postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required.")
    .matches(INDIAN_PINCODE_RE)
    .withMessage("Enter a valid 6-digit PIN code.")
    .bail()
    .isLength({ max: 20 }),

  body("shippingAddress.country")
    .optional()
    .trim()
    .isLength({ max: 100 }),

    (req, res, next)=>{
        const error = validationResult(req)

            if (!error.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request',
                    errors: error.array({
                        onlyFirstError: true,
                    }),
                })
            }
    
        next()
    }
];

export const getOrdersValidator = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer.")
        .toInt(),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Limit must be between 1 and 50.")
        .toInt(),

    query("status")
        .optional()
        .isIn([
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "returned",
            "refunded",
        ])
        .withMessage("Invalid order status."),
];

/*
 * ============================================================================
 * GET /api/order/:orderId
 * ============================================================================
 *
 * The identifier may be the internal Mongo ObjectId or the human-readable order
 * number (`IP-...`), because order links in the UI carry the order number. Both
 * forms are strictly validated before reaching the database; ownership is
 * enforced in the service (`userId` always comes from the authenticated token).
 */

const ORDER_NUMBER_PATTERN = /^IP-[A-Za-z0-9-]{4,64}$/;

export const validateOrderId = [
    param("orderId")
        .custom((value) => {
            if (typeof value !== "string") {
                throw new Error("Invalid order ID.");
            }

            if (mongoose.isValidObjectId(value)) return true;
            if (ORDER_NUMBER_PATTERN.test(value)) return true;

            throw new Error("Invalid order ID.");
        }),
];
