import crypto from "node:crypto";

import config from "../config/config.js";
import Order from "../models/order.model.js";
import WebhookEvent from "../models/webhookEvent.model.js";

const verifyRazorpayWebhookSignature = ({
  rawBody,
  signature,
}) => {
  if (!Buffer.isBuffer(rawBody)) {
    return false;
  }

  if (!signature || typeof signature !== "string") {
    return false;
  }

  const expectedSignature = crypto
    .createHmac(
      "sha256",
      config.RAZORPAY_WEBHOOK_SECRET
    )
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(
    expectedSignature,
    "utf8"
  );

  const receivedBuffer = Buffer.from(
    signature,
    "utf8"
  );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
};

const processPaymentCaptured = async ({
  payload,
}) => {
  const payment =
    payload?.payload?.payment?.entity;

  if (!payment) {
    const error = new Error(
      "payment.captured payload is missing payment entity."
    );

    error.statusCode = 400;
    throw error;
  }

  const {
    id: razorpayPaymentId,
    order_id: razorpayOrderId,
    amount,
    currency,
    status,
  } = payment;

  if (!razorpayPaymentId || !razorpayOrderId) {
    const error = new Error(
      "Razorpay payment payload is incomplete."
    );

    error.statusCode = 400;
    throw error;
  }

  const order = await Order.findOne({
    "payment.razorpayOrderId": razorpayOrderId,
  });

  if (!order) {
    const error = new Error(
      "Internal order for Razorpay order was not found."
    );

    error.statusCode = 404;
    throw error;
  }

  const expectedAmount =
    Math.round(order.pricing.total * 100);

  if (amount !== expectedAmount) {
    const error = new Error(
      "Webhook payment amount does not match the internal order."
    );

    error.statusCode = 400;
    throw error;
  }

  if (currency !== order.pricing.currency) {
    const error = new Error(
      "Webhook payment currency does not match the internal order."
    );

    error.statusCode = 400;
    throw error;
  }

  if (status !== "captured") {
    const error = new Error(
      "Razorpay payment is not captured."
    );

    error.statusCode = 409;
    throw error;
  }

  // Idempotent state transition.
  if (order.payment.status === "paid") {
    return order;
  }

  order.payment.razorpayPaymentId =
    razorpayPaymentId;

  order.payment.status = "paid";

  order.orderStatus = "confirmed";

  await order.save();

  return order;
};

const processPaymentFailed = async ({
  payload,
}) => {
  const payment =
    payload?.payload?.payment?.entity;

  if (!payment) {
    const error = new Error(
      "payment.failed payload is missing payment entity."
    );

    error.statusCode = 400;
    throw error;
  }

  const {
    order_id: razorpayOrderId,
  } = payment;

  if (!razorpayOrderId) {
    const error = new Error(
      "Razorpay failed payment payload is missing order ID."
    );

    error.statusCode = 400;
    throw error;
  }

  const order = await Order.findOne({
    "payment.razorpayOrderId": razorpayOrderId,
  });

  if (!order) {
    const error = new Error(
      "Internal order for Razorpay order was not found."
    );

    error.statusCode = 404;
    throw error;
  }

  /*
   * Do not cancel the order here.
   *
   * The customer may retry payment.
   */
  if (order.payment.status !== "paid") {
    order.payment.status = "failed";

    await order.save();
  }

  return order;
};

const processRazorpayWebhook = async ({
  eventId,
  event,
  payload,
}) => {
  let webhookEvent;

  /*
   * -------------------------------------------------------
   * 1. Check whether this event was already processed
   * -------------------------------------------------------
   */
  webhookEvent = await WebhookEvent.findOne({
    eventId,
  });

  /*
   * A successfully processed event is permanently idempotent.
   */
  if (webhookEvent?.status === "processed") {
    return {
      alreadyProcessed: true,
      retried: false,
    };
  }

  /*
   * -------------------------------------------------------
   * 2. Existing failed event
   * -------------------------------------------------------
   *
   * Allow Razorpay to retry a previously failed event.
   */
  if (webhookEvent?.status === "failed") {
    webhookEvent.status = "processing";
    webhookEvent.errorMessage = undefined;

    await webhookEvent.save();
  }

  /*
   * -------------------------------------------------------
   * 3. New event
   * -------------------------------------------------------
   */
  if (!webhookEvent) {
    try {
      webhookEvent = await WebhookEvent.create({
        eventId,
        event,
        status: "processing",
      });
    } catch (error) {
      /*
       * Another request may have created the same event
       * between our findOne() and create().
       */
      if (error?.code === 11000) {
        webhookEvent = await WebhookEvent.findOne({
          eventId,
        });

        /*
         * If the other request already completed it,
         * treat this delivery as a duplicate.
         */
        if (webhookEvent?.status === "processed") {
          return {
            alreadyProcessed: true,
            retried: false,
          };
        }

        /*
         * If the other request is still processing,
         * don't process the same event concurrently.
         */
        if (webhookEvent?.status === "processing") {
          return {
            alreadyProcessed: true,
            retried: false,
          };
        }

        /*
         * If it failed, we'll retry below.
         */
      } else {
        throw error;
      }
    }
  }

  /*
   * -------------------------------------------------------
   * 4. Process event
   * -------------------------------------------------------
   */
  try {
    let result;

    switch (event) {
      case "payment.captured":
        result = await processPaymentCaptured({
          payload,
        });
        break;

      case "payment.failed":
        result = await processPaymentFailed({
          payload,
        });
        break;

      default:
        webhookEvent.status = "ignored";
        webhookEvent.processedAt = new Date();
        webhookEvent.errorMessage = undefined;
        
        await webhookEvent.save();
        
        return {
            alreadyProcessed: false,
            ignored: true,
            retried: false,
        };
    }

    /*
     * -------------------------------------------------------
     * 5. Mark successful processing
     * -------------------------------------------------------
     */
    webhookEvent.status = "processed";
    webhookEvent.processedAt = new Date();
    webhookEvent.errorMessage = undefined;

    await webhookEvent.save();

    return {
      alreadyProcessed: false,
      retried: false,
      result,
    };
  } catch (error) {
    /*
     * -------------------------------------------------------
     * 6. Failed processing
     * -------------------------------------------------------
     *
     * Keep the event in the database so we have an audit
     * trail, but leave it retryable.
     */
    webhookEvent.status = "failed";
    webhookEvent.errorMessage =
      error.message?.slice(0, 1000);

    await webhookEvent.save();

    throw error;
  }
};

export {
  verifyRazorpayWebhookSignature,
  processRazorpayWebhook,
};