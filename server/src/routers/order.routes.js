import express from "express";

import authenticateMiddleware from "../middlewares/authenticate.js";

import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
} from "../controllers/order.controller.js";

import {
  createOrderValidator,
  getOrdersValidator,
  validateOrderId,
} from "../validators/order.validator.js";
import validate from "../middlewares/validate.js";
import { createRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

/*
 * Order creation is money-moving and reserves stock on every attempt, so it
 * gets its own strict allowance on top of the global API limiter (same
 * createRateLimiter factory as login/register/payment/webhook).
 *
 * Keyed per authenticated user rather than per IP: users behind shared mobile
 * NAT would otherwise share one budget. Falls back to IP only if the user is
 * somehow absent (authenticate runs first, so this is defensive).
 */
const orderCreateRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many order attempts. Please try again later.",
  keyGenerator: (req) => String(req.user?.userId ?? req.ip),
});

router.post(
  "/",
  authenticateMiddleware,
  orderCreateRateLimiter,
  createOrderValidator,
  validate,
  createOrder,
);

router.get(
  "/",
  authenticateMiddleware,
  getOrdersValidator,
  validate,
  getOrders,
);
// Single order — owner-only. Returns 404 (not 403) for another user's order.
router.get(
  "/:orderId",
  authenticateMiddleware,
  validateOrderId,
  validate,
  getOrderById,
);
router.post(
  "/:orderId/cancel",
  authenticateMiddleware,
  validateOrderId,
  validate,
  cancelOrder
);


export default router;
