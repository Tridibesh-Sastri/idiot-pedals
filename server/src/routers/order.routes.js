import express from "express";

import authenticateMiddleware from "../middlewares/authenticate.js";

import {
  createOrder,
  getOrders
} from "../controllers/order.controller.js";

import {createOrderValidator, getOrdersValidator  } from "../validators/order.validator.js";
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

export default router;