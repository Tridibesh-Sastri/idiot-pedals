import {
  verifyRazorpayWebhookSignature,
  processRazorpayWebhook,
} from "../services/webhook.service.js";

const razorpayWebhookController = async (
  req,
  res,
  next
) => {
  try {
    const signature =
      req.get("x-razorpay-signature");

    const eventId =
      req.get("x-razorpay-event-id");

    const event = req.body?.event;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing Razorpay webhook event ID.",
      });
    }

    const isValid =
      verifyRazorpayWebhookSignature({
        rawBody: req.rawBody,
        signature,
      });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Razorpay webhook signature.",
      });
    }

    if (!event) {
      return res.status(400).json({
        success: false,
        message:
          "Missing Razorpay webhook event.",
      });
    }

    const result =
      await processRazorpayWebhook({
        eventId,
        event,
        payload: req.body,
      });

    return res.status(200).json({
        success: true,
        processed: !result.alreadyProcessed && !result.ignored,
        ignored: result.ignored ?? false,
        duplicate: result.alreadyProcessed ?? false,
    });
  } catch (error) {
    next(error);
  }
};

export default razorpayWebhookController;