import express from "express";

import authenticateMiddleware from "../middlewares/authenticate.js";

import {
  createOrder,
} from "../controllers/order.controller.js";

import createOrderValidator from "../validators/order.validator.js";
import validate from "../middlewares/validate.js";

const router = express.Router();

router.post(
  "/",
  authenticateMiddleware,
  createOrderValidator,
  validate,
  createOrder
);

export default router;