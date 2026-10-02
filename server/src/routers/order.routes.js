import express from "express";

import authenticateMiddleware from "../middlewares/authenticate.js";

import {
  createOrder,
  getOrders,
  getOrderById
} from "../controllers/order.controller.js";

import {createOrderValidator, getOrdersValidator, validateOrderId  } from "../validators/order.validator.js";
import validate from "../middlewares/validate.js";

const router = express.Router();

router.post(
  "/",
  authenticateMiddleware,
  createOrderValidator,
  validate,
  createOrder
);

router.get(
    "/",
    authenticateMiddleware,
    getOrdersValidator,
    validate,
    getOrders
);

// Single order — owner-only. Returns 404 (not 403) for another user's order.
router.get(
    "/:orderId",
    authenticateMiddleware,
    validateOrderId,
    validate,
    getOrderById
);

export default router;