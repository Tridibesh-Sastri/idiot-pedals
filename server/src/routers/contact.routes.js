import express from "express";

import config from "../config/config.js";
import { submitContact } from "../controllers/contact.controller.js";
import { contactValidator } from "../validators/contact.validator.js";
import { createRateLimiter } from "../middlewares/rateLimiter.js";
import { ipKeyGenerator } from "express-rate-limit";

const router = express.Router();

/*
 * Route-only 10kb body cap. This router is mounted before the global
 * express.json() (webhook pattern), so it parses with its own limit.
 */
router.use(
  express.json({
    limit: "10kb",
  })
);

/*
 * Abuse limits, all tunable in config.js (per-instance, like every limiter
 * here). Limits are read live (not captured at import) so the caps stay
 * tunable without a restart. Order matters: cheapest checks first.
 */
const contactIpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: () => config.CONTACT_RATE_IP_MAX,
  message: "Too many messages. Please try again later.",
});

const contactEmailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: () => config.CONTACT_RATE_EMAIL_MAX,
  message: "Too many messages from this address. Please try again later.",
  keyGenerator: (req) =>
    `contact:${String(req.body?.email ?? "")
      .trim()
      .toLowerCase() || ipKeyGenerator(req.ip)}`,
});

const contactDailyLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  // Read live (not captured at import) so the cap stays tunable without a
  // restart; identical behavior in production.
  limit: () => config.CONTACT_RATE_DAILY_MAX,
  message: "Too many messages today. Please try again tomorrow.",
  keyGenerator: () => "contact:daily",
});

router.post(
  "/",
  contactIpLimiter,
  contactEmailLimiter,
  contactDailyLimiter,
  contactValidator,
  submitContact
);

export default router;
