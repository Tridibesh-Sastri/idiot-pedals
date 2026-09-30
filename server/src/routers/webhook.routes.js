// import express from "express";

// import razorpayWebhookController from "../controllers/webhook.controller.js";

// const router = express.Router();

// router.post(
//   "/razorpay",
//   express.raw({
//     type: "application/json",
//     limit: "100kb",
//   }),
//   razorpayWebhookController
// );

// export default router;

import express from "express";

import razorpayWebhookController from "../controllers/webhook.controller.js";

const router = express.Router();

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
  razorpayRawBody,
  parseRazorpayWebhook,
  razorpayWebhookController
);

// console.log('webhookrouter is running')

export default router;