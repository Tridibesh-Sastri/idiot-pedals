import express from "express";

import razorpayWebhookController from "../controllers/webhook.controller.js";

import validateRazorpayWebhook from "../validators/webhook.validator.js"
import { createRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

/*
 * Webhooks are server-to-server, so the allowance is generous: Razorpay retries
 * deliveries, and throttling a legitimate retry would lose a payment event. The
 * limiter is here to bound a flood, not to shape normal traffic.
 */
const webhookRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: "Too many webhook deliveries.",
});

const razorpayRawBody = express.raw({
  type: "application/json",
  limit: "100kb",
});

const parseRazorpayWebhook = (req, res, next) => {
  try {
    req.rawBody = req.body;

    req.body = JSON.parse(
      req.rawBody.toString("utf8")
    );

    next();
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook JSON payload.",
    });
  }
};

router.post(
  "/razorpay",
  webhookRateLimiter,
  razorpayRawBody,
  parseRazorpayWebhook,
  validateRazorpayWebhook,
  razorpayWebhookController
);

export default router;