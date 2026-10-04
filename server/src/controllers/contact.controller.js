import config from "../config/config.js";
import mailer from "../services/mailer.service.js";
import { escapeHtml } from "../services/order.email.service.js";
import { logger } from "../utils/logger.js";

const SUCCESS_MESSAGE =
  "Thanks — your message is on its way to the workbench team.";

const submitContact = async (req, res, next) => {
  try {
    /*
     * Honeypot: bots fill the hidden "website" field. Answer with the exact
     * same success a real submission gets, and send nothing.
     */
    if (typeof req.body?.website === "string" && req.body.website.length > 0) {
      return res.status(200).json({
        success: true,
        message: SUCCESS_MESSAGE,
      });
    }

    const name = req.body.name;
    const email = req.body.email;
    const subject = req.body.subject;
    const message = req.body.message;

    await mailer.sendMail({
      channel: "resend",
      kind: "contact",
      from: config.RESEND_FROM,
      to: [config.ADMIN_ORDER_EMAIL],
      replyTo: email,
      subject: `[Contact] ${subject}`,
      text:
        `New contact inquiry (${subject})\n` +
        `From: ${escapeHtml(name)} <${escapeHtml(email)}>\n\n` +
        `${escapeHtml(message)}`,
      html:
        `<p><strong>New contact inquiry (${escapeHtml(subject)})</strong></p>` +
        `<p>From: ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>` +
        `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
    });

    return res.status(200).json({
      success: true,
      message: SUCCESS_MESSAGE,
    });
  } catch (error) {
    /*
     * Provider failure: generic 503. Log only the error type and request id —
     * never the message body, name or email.
     */
    logger.error(
      {
        code: error?.code ?? error?.name ?? "MAIL_SEND_FAILED",
        requestId: req.id,
      },
      "Contact inquiry email failed"
    );

    return res.status(503).json({
      success: false,
      message: "Could not send your message right now. Please try again later.",
    });
  }
};

export { submitContact };
