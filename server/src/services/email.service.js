import config from "../config/config.js";
import { sendMail } from "./mailer.service.js";
import { escapeHtml } from "./order.email.service.js";

/**
 * Verification email for a newly registered account.
 *
 * Delivery goes through the mailer gate, so this respects
 * EMAIL_NOTIFICATIONS_ENABLED and can never reach SMTP during tests.
 */
export const sendVerificationEmail = async ({name,email,token,}) => {
  const verificationUrl =`${config.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

  return sendMail({
    channel: "smtp",
    kind: "email-verification",

    from: config.EMAIL_FROM,

    to: email,

    subject: "Verify your IDIOT Pedals account",

    text: `
Hi ${name},

Thanks for registering with IDIOT Pedals.

Verify your email address using this link:

${verificationUrl}

This verification link expires soon and can only be used once.

If you did not create this account, you can ignore this email.

IDIOT Pedals
`,

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6">

        <h2>Verify your IDIOT Pedals account</h2>

        <p>Hi ${escapeHtml(name)},</p>

        <p>
          Thanks for registering with IDIOT Pedals.
        </p>

        <p>
          <a
            href="${verificationUrl}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#c52d27;
              color:white;
              text-decoration:none;
            "
          >
            Verify Email
          </a>
        </p>

        <p>
          This verification link expires soon
          and can only be used once.
        </p>

        <p>
          If you did not create this account,
          you can ignore this email.
        </p>

        <p>
          IDIOT Pedals
        </p>

      </div>
    `,
  });
};