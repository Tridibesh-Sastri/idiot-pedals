import crypto from "node:crypto";

import config from "../config/config.js";
import Order from "../models/order.model.js";
import WebhookEvent from "../models/webhookEvent.model.js";

import { toMinor } from "../utils/money.js";
import { logger } from "../utils/logger.js";
import {
  ORDER_STATUS,
  applyTransition,
  isTerminal,
} from "../domain/orderStateMachine.js";
import {
  consumeReservedStock,
  releaseReservedStock,
} from "./stock.service.js";
import { sendAdminOrderEmail } from "./order.email.service.js";

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
  if (order.payment.status === "paid" && (order.stockConsumedAt || order.needsRefund)) {
    return order;
  }

  /*
   * Late capture: the money arrived for an order that is already terminal
   * (cancelled, typically because its stock reservation expired first).
   *
   * The payment must never be dropped — it is recorded, flagged for refund and
   * logged. The delivery still succeeds (200) so the provider stops retrying;
   * only a signature failure is a 4xx.
   */
  if (isTerminal(order.orderStatus)) {
    if (!order.payment.razorpayPaymentId) {
      order.payment.razorpayPaymentId = razorpayPaymentId;
    }

    order.payment.status = "paid";
    order.needsRefund = true;
    order.refundReason = "captured_after_cancellation";

    await order.save();

    logger.error(
      {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.payment.status,
        needsRefund: order.needsRefund,
      },
      "Payment captured for a cancelled order; flagged for refund"
    );

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

  /*
   * Admin notification for webhook-only fulfillment. When verify ran first the
   * order is already paid on entry (wasAlreadyPaid) and verify already sent
   * this email, so only notify when the webhook is the first confirmer.
   * Fire-and-forget like every other admin-email call site: sendAdminOrderEmail
   * swallows its own errors, so fulfillment can never depend on mail.
   */
  if (!wasAlreadyPaid) {
    void sendAdminOrderEmail(order);
  }

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

/**
 * How long a claim may sit in `processing` before another delivery may take it
 * over. This covers the crash case: if the process died after claiming but
 * before finishing, the event would otherwise be stuck forever and the payment
 * would never be applied.
 */
const STALE_CLAIM_MS = 5 * 60 * 1000

/**
 * Atomically claims an event for processing.
 *
 * Claiming is what makes concurrent deliveries safe: exactly one caller can
 * hold an event in `processing`, and every other delivery of the same id is
 * acknowledged without doing the work.
 *
 *   - a `failed` event can be re-claimed, so provider retries still work
 *   - a claim stuck in `processing` past STALE_CLAIM_MS can be re-claimed, so a
 *     crash mid-processing does not lose the event
 *   - otherwise we try to CREATE the event; a duplicate-key error means another
 *     delivery got there first, so we do not claim it
 */
const claimWebhookEvent = async ({ eventId, event }) => {
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS)

  const retryable = await WebhookEvent.findOneAndUpdate(
    {
      eventId,
      $or: [
        { status: "failed" },
        { status: "processing", updatedAt: { $lte: staleBefore } },
      ],
    },
    { $set: { status: "processing", errorMessage: undefined } },
    { returnDocument: "after" }
  );

  if (retryable) {
    return { webhookEvent: retryable, claimed: true, retried: true };
  }

  try {
    const created = await WebhookEvent.create({
      eventId,
      event,
      status: "processing",
    });

    return { webhookEvent: created, claimed: true, retried: false };
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    // Another delivery already owns (or finished) this event.
    const existing = await WebhookEvent.findOne({ eventId });

    return { webhookEvent: existing, claimed: false, retried: false };
  }
};

const processRazorpayWebhook = async ({
  eventId,
  event,
  payload,
}) => {
  /*
   * -------------------------------------------------------
   * 1. Claim the event
   * -------------------------------------------------------
   *
   * A delivery that cannot claim the event does no work and is acknowledged:
   * either it is already processed/ignored, or another delivery is handling it
   * right now. This is what keeps a duplicate delivery from fulfilling twice.
   */
  const { webhookEvent, claimed, retried } = await claimWebhookEvent({
    eventId,
    event,
  });

  if (!claimed) {
    return {
      alreadyProcessed: true,
      retried: false,
      ignored: webhookEvent?.status === "ignored",
    };
  }

  /*
   * -------------------------------------------------------
   * 2. Process event
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