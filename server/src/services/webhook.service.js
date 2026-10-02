import crypto from "node:crypto";

import config from "../config/config.js";
import Order from "../models/order.model.js";
import WebhookEvent from "../models/webhookEvent.model.js";

import { toMinor } from "../utils/money.js";
import { logger } from "../utils/logger.js";
import {
  ORDER_STATUS,
  applyTransition,
} from "../domain/orderStateMachine.js";
import {
  consumeReservedStock,
  releaseReservedStock,
} from "./stock.service.js";

/** Authoritative paise total, falling back for documents predating `totalMinor`. */
const orderTotalMinor = (order) =>
  order.pricing.totalMinor ?? toMinor(order.pricing.total);

const orderStockLines = (order) =>
  order.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

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

  const expectedAmount = orderTotalMinor(order);

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

  /*
   * Idempotent state transition.
   *
   * The webhook is the source of truth, so it is the only path allowed to
   * finalize fulfilment. A repeat delivery is a no-op.
   */
  if (order.payment.status === "paid" && order.stockConsumedAt) {
    return order;
  }

  const wasAlreadyPaid = order.payment.status === "paid";

  if (!order.payment.razorpayPaymentId) {
    order.payment.razorpayPaymentId = razorpayPaymentId;
  }

  if (!wasAlreadyPaid) {
    order.payment.status = "paid";
    applyTransition(order, ORDER_STATUS.CONFIRMED);
  }

  // pending/confirmed -> fulfilled (webhook-only transition)
  applyTransition(order, ORDER_STATUS.FULFILLED);

  /*
   * Fulfilment permanently consumes the reservation: `stock` and
   * `reservedStock` both drop by the ordered quantity.
   */
  if (!order.stockConsumedAt) {
    await consumeReservedStock(orderStockLines(order));
    order.stockConsumedAt = new Date();
  }

  await order.save();

  logger.info(
    {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.payment.status,
    },
    "Webhook fulfilled order",
  );

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
   * A failed payment must not hold inventory. The reservation is released and
   * the order moves to a terminal state; the customer retries by placing a new
   * order, which takes a fresh reservation.
   */
  if (order.payment.status !== "paid") {
    order.payment.status = "failed";
    order.payment.failureReason = "payment_failed";

    applyTransition(order, ORDER_STATUS.CANCELLED);

    if (!order.stockReleasedAt) {
      await releaseReservedStock(orderStockLines(order));
      order.stockReleasedAt = new Date();
    }

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