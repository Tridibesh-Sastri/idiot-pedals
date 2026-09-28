import nodemailer from "nodemailer";
import config from "../config/config.js";

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,

  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASSWORD,
  },
});

export const sendVerificationEmail = async ({
  name,
  email,
  token,
}) => {
  const verificationUrl =
    `${config.FRONTEND_URL}/verify-email?token=${encodeURIComponent(
      token
    )}`;

  await transporter.sendMail({
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

        <p>Hi ${name},</p>

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