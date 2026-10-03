import config from '../config/config.js'
import { sendMail } from './mailer.service.js'
/*
 * Default-export access to the same gate, used ONLY by
 * sendAdminRefundAlertEmail below so tests can simulate a provider outage
 * with mock.method. Production behavior is identical to sendMail.
 */
import mailer from './mailer.service.js'
import { logger } from '../utils/logger.js'

const escapeHtml = (value) => {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

const formatMoney = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
    }).format(amount)
}

const formatAddress = (address) => {
    return [
        address.name,
        address.addressLine1,
        address.addressLine2,
        address.city,
        address.state,
        address.postalCode,
        address.country,
    ]
        .filter(Boolean)
        .map(escapeHtml)
        .join('<br>')
}

const buildAdminOrderHtml = (order) => {
    const currency = order.pricing.currency

    const itemsHtml = order.items
        .map((item) => {
            return `
                <tr>
                    <td style="padding:12px;border-bottom:1px solid #e5e5e5;">
                        <strong>${escapeHtml(item.name)}</strong>
                        <br>
                        <span style="font-size:12px;color:#777;">
                            SKU: ${escapeHtml(item.sku)}
                        </span>
                    </td>

                    <td style="padding:12px;border-bottom:1px solid #e5e5e5;text-align:center;">
                        ${item.quantity}
                    </td>

                    <td style="padding:12px;border-bottom:1px solid #e5e5e5;text-align:right;">
                        ${formatMoney(item.unitPrice.amount, currency)}
                    </td>

                    <td style="padding:12px;border-bottom:1px solid #e5e5e5;text-align:right;">
                        ${formatMoney(item.total.amount, currency)}
                    </td>
                </tr>
            `
        })
        .join('')

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>New IDIOT Pedals Order</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f4f4f4;
    font-family:Arial,Helvetica,sans-serif;
    color:#171717;
">

    <div style="
        max-width:720px;
        margin:40px auto;
        background:#ffffff;
        border-radius:12px;
        overflow:hidden;
        border:1px solid #e5e5e5;
    ">

        <!-- Header -->

        <div style="
            padding:28px;
            background:#111111;
            color:#ffffff;
        ">

            <div style="
                font-size:24px;
                font-weight:800;
                letter-spacing:2px;
            ">
                IDIOT
            </div>

            <div style="
                margin-top:6px;
                font-size:13px;
                color:#bbbbbb;
                letter-spacing:1px;
            ">
                PEDALS
            </div>

        </div>

        <!-- Main -->

        <div style="padding:32px;">

            <h1 style="
                margin:0 0 8px;
                font-size:24px;
            ">
                New Order Received
            </h1>

            <p style="
                margin:0 0 28px;
                color:#666666;
            ">
                A new order has been successfully created.
            </p>

            <!-- Order summary -->

            <div style="
                padding:20px;
                background:#f7f7f7;
                border-radius:8px;
                margin-bottom:28px;
            ">

                <table width="100%" cellpadding="0" cellspacing="0">

                    <tr>
                        <td style="padding:5px 0;color:#777;">
                            Order Number
                        </td>

                        <td style="
                            padding:5px 0;
                            text-align:right;
                            font-weight:bold;
                        ">
                            ${escapeHtml(order.orderNumber)}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:5px 0;color:#777;">
                            Order Status
                        </td>

                        <td style="
                            padding:5px 0;
                            text-align:right;
                        ">
                            ${escapeHtml(order.orderStatus)}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:5px 0;color:#777;">
                            Payment Method
                        </td>

                        <td style="
                            padding:5px 0;
                            text-align:right;
                            font-weight:bold;
                        ">
                            ${escapeHtml(order.payment.method)}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:5px 0;color:#777;">
                            Payment Status
                        </td>

                        <td style="
                            padding:5px 0;
                            text-align:right;
                        ">
                            ${escapeHtml(order.payment.status)}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:5px 0;color:#777;">
                            Created
                        </td>

                        <td style="
                            padding:5px 0;
                            text-align:right;
                        ">
                            ${new Date(order.createdAt).toLocaleString('en-IN')}
                        </td>
                    </tr>

                </table>

            </div>

            <!-- Customer -->

            <h2 style="
                font-size:18px;
                margin:0 0 12px;
            ">
                Customer
            </h2>

            <div style="
                padding:16px;
                border:1px solid #e5e5e5;
                border-radius:8px;
                margin-bottom:28px;
            ">

                <strong>
                    ${escapeHtml(order.customer.name)}
                </strong>

                <br>

                <a href="mailto:${escapeHtml(order.customer.email)}">
                    ${escapeHtml(order.customer.email)}
                </a>

                <br>

                ${escapeHtml(order.customer.phone)}

            </div>

            <!-- Products -->

            <h2 style="
                font-size:18px;
                margin:0 0 12px;
            ">
                Ordered Products
            </h2>

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                    border-collapse:collapse;
                    margin-bottom:28px;
                "
            >

                <thead>

                    <tr style="background:#f7f7f7;">

                        <th style="
                            padding:12px;
                            text-align:left;
                            font-size:13px;
                        ">
                            Product
                        </th>

                        <th style="
                            padding:12px;
                            text-align:center;
                            font-size:13px;
                        ">
                            Qty
                        </th>

                        <th style="
                            padding:12px;
                            text-align:right;
                            font-size:13px;
                        ">
                            Unit Price
                        </th>

                        <th style="
                            padding:12px;
                            text-align:right;
                            font-size:13px;
                        ">
                            Total
                        </th>

                    </tr>

                </thead>

                <tbody>
                    ${itemsHtml}
                </tbody>

            </table>

            <!-- Pricing -->

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="margin-bottom:28px;"
            >

                <tr>
                    <td style="padding:6px 0;color:#777;">
                        Subtotal
                    </td>

                    <td style="padding:6px 0;text-align:right;">
                        ${formatMoney(order.pricing.subtotal, currency)}
                    </td>
                </tr>

                <tr>
                    <td style="padding:6px 0;color:#777;">
                        Shipping
                    </td>

                    <td style="padding:6px 0;text-align:right;">
                        ${formatMoney(order.pricing.shipping, currency)}
                    </td>
                </tr>

                <tr>
                    <td style="padding:6px 0;color:#777;">
                        Discount
                    </td>

                    <td style="padding:6px 0;text-align:right;">
                        -${formatMoney(order.pricing.discount, currency)}
                    </td>
                </tr>

                <tr>
                    <td style="
                        padding:14px 0 0;
                        border-top:2px solid #111;
                        font-size:18px;
                        font-weight:bold;
                    ">
                        Total
                    </td>

                    <td style="
                        padding:14px 0 0;
                        border-top:2px solid #111;
                        text-align:right;
                        font-size:18px;
                        font-weight:bold;
                    ">
                        ${formatMoney(order.pricing.total, currency)}
                    </td>
                </tr>

            </table>

            <!-- Shipping -->

            <h2 style="
                font-size:18px;
                margin:0 0 12px;
            ">
                Shipping Address
            </h2>

            <div style="
                padding:16px;
                border:1px solid #e5e5e5;
                border-radius:8px;
                line-height:1.6;
            ">
                ${formatAddress(order.shippingAddress)}
            </div>

        </div>

        <!-- Footer -->

        <div style="
            padding:20px 32px;
            background:#f7f7f7;
            color:#777;
            font-size:12px;
        ">
            IDIOT Pedals — Internal Order Notification
        </div>

    </div>

</body>
</html>
`
}

const buildAdminOrderText = (order) => {
    const currency = order.pricing.currency

    const items = order.items
        .map(
            (item) =>
                `${item.name} (${item.sku}) x ${item.quantity} = ${formatMoney(
                    item.total.amount,
                    currency
                )}`
        )
        .join('\n')

    const address = [
        order.shippingAddress.name,
        order.shippingAddress.addressLine1,
        order.shippingAddress.addressLine2,
        order.shippingAddress.city,
        order.shippingAddress.state,
        order.shippingAddress.postalCode,
        order.shippingAddress.country,
    ]
        .filter(Boolean)
        .join(', ')

    return `
IDIOT PEDALS — NEW ORDER

Order Number: ${order.orderNumber}
Order Status: ${order.orderStatus}
Payment Method: ${order.payment.method}
Payment Status: ${order.payment.status}
Created: ${new Date(order.createdAt).toLocaleString('en-IN')}

CUSTOMER
Name: ${order.customer.name}
Email: ${order.customer.email}
Phone: ${order.customer.phone}

PRODUCTS
${items}

PRICING
Subtotal: ${formatMoney(order.pricing.subtotal, currency)}
Shipping: ${formatMoney(order.pricing.shipping, currency)}
Discount: ${formatMoney(order.pricing.discount, currency)}
Total: ${formatMoney(order.pricing.total, currency)}

SHIPPING ADDRESS
${address}
`
}

const sendAdminOrderEmail = async (order) => {
    try {
        /*
         * Delivery goes through the mailer gate: it honours
         * EMAIL_NOTIFICATIONS_ENABLED and, in tests, records the message in the
         * in-memory outbox instead of calling Resend.
         */
        const result = await sendMail({
            channel: 'resend',
            kind: 'admin-order',
            from: config.RESEND_FROM,
            to: [config.ADMIN_ORDER_EMAIL],
            subject: `New IDIOT Pedals Order — ${order.orderNumber}`,
            html: buildAdminOrderHtml(order),
            text: buildAdminOrderText(order),
            idempotencyKey: `admin-order-${order._id.toString()}`,
        })

        logger.info(
            { orderNumber: order.orderNumber, messageId: result?.id ?? null },
            'Admin order email dispatched'
        )

        return result
    } catch (error) {
        /*
         * A failed notification must never fail the order; the caller already
         * persists the order before this runs.
         */
        logger.error(
            { err: error, orderNumber: order.orderNumber },
            'Failed to send admin order email'
        )

        return null
    }
}

/**
 * Late-capture refund alert.
 *
 * Fires when money arrives for an already-terminal (cancelled) order: the
 * payment is recorded and flagged needsRefund, but nothing moves the money
 * back automatically — a human must refund from the Razorpay dashboard. This
 * email is that human's work ticket.
 *
 * Same contract as sendAdminOrderEmail: never throws (delivery failures are
 * logged with a code only), returns the transport result or null.
 */
const sendAdminRefundAlertEmail = async (order, { razorpayPaymentId, amountMinor, currency = 'INR', refundReason }) => {
    try {
        const amountMajor = amountMinor / 100

        const text =
`A payment was captured for an already-cancelled order and needs a MANUAL REFUND.

Order: ${order.orderNumber} (${order._id.toString()})
Razorpay payment id: ${razorpayPaymentId}
Amount captured: ${formatMoney(amountMajor, currency)}
Reason flag: ${refundReason}

Action required: refund manually from the Razorpay dashboard (Payments -> this payment id -> Refund). Nothing in the app moves the money back automatically; the order stays flagged needsRefund until you confirm the refund there.`

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Manual refund needed</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f4f4f4;
    font-family:Arial,Helvetica,sans-serif;
    color:#222;
">
    <p><strong>Order:</strong> ${escapeHtml(order.orderNumber)} (${escapeHtml(order._id.toString())})</p>
    <p><strong>Razorpay payment id:</strong> ${escapeHtml(razorpayPaymentId)}</p>
    <p><strong>Amount captured:</strong> ${escapeHtml(formatMoney(amountMajor, currency))}</p>
    <p><strong>Reason flag:</strong> ${escapeHtml(refundReason)}</p>
    <p><strong>Action required:</strong> refund manually from the Razorpay dashboard (Payments -&gt; this payment id -&gt; Refund). Nothing in the app moves the money back automatically; the order stays flagged needsRefund until you confirm the refund there.</p>
</body>
</html>`

        const result = await mailer.sendMail({
            channel: 'resend',
            kind: 'admin-refund-alert',
            from: config.RESEND_FROM,
            to: [config.ADMIN_ORDER_EMAIL],
            subject: `Manual refund needed — ${order.orderNumber} (${formatMoney(amountMajor, currency)})`,
            html,
            text,
            idempotencyKey: `admin-refund-${order._id.toString()}`,
        })

        logger.info(
            { orderNumber: order.orderNumber, messageId: result?.id ?? null },
            'Admin refund alert dispatched'
        )

        return result
    } catch (error) {
        /*
         * A failed notification must never fail the order; the caller already
         * persists the order before this runs.
         */
        logger.error(
            { err: error, orderNumber: order.orderNumber },
            'Failed to send admin refund alert'
        )

        return null
    }
}

export {
    escapeHtml,
    sendAdminOrderEmail,
    sendAdminRefundAlertEmail,
}