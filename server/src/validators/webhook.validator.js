const validateRazorpayWebhook = (req, res, next) => {
  const { event, payload } = req.body || {};

  if (!event || typeof event !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook event.",
    });
  }

  if (!payload || typeof payload !== "object") {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook payload.",
    });
  }

  return next();
};

export default validateRazorpayWebhook;