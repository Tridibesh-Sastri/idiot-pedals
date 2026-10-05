/**
 * List paid-but-unshipped orders (plus refund flags) for fulfilment.
 *
 * Read-only: opens one connection, prints a plain table, exits. Never writes
 * to the database. Never prints secrets, URIs, tokens, hashes or full
 * payment ids — only the operational fields below.
 *
 * An order counts as open when it still needs handling: a Razorpay order
 * whose payment is captured, or any COD order, that has not reached a
 * terminal fulfilment state. Status names come from order.model.js.
 *
 *   node scripts/list-open-orders.mjs
 */
import mongoose from 'mongoose';

import config from '../src/config/config.js';
import orderModel from '../src/models/order.model.js';

const OPEN_STATUSES = ['pending', 'confirmed', 'fulfilled', 'processing'];

const oneLineAddress = (address = {}) =>
  [
    address.name,
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(', ');

const itemsSummary = (items = []) =>
  items
    .map((item) => `${item?.name ?? '?'} x ${item?.quantity ?? '?'}`)
    .join('; ');

const columns = [
  ['order', (order) => order.orderNumber ?? '?'],
  ['placed', (order) => (order.createdAt instanceof Date ? order.createdAt.toISOString() : '?')],
  ['status', (order) => order.orderStatus ?? '?'],
  ['pay', (order) => `${order.payment?.method ?? '?'}:${order.payment?.status ?? '?'}`],
  ['customer', (order) => order.customer?.name ?? '?'],
  ['phone', (order) => order.customer?.phone ?? order.shippingAddress?.phone ?? '?'],
  ['ship-to', (order) => oneLineAddress(order.shippingAddress)],
  ['items', (order) => itemsSummary(order.items)],
  ['total', (order) => String(order.pricing?.total ?? '?')],
  ['refund?', (order) => (order.needsRefund ? `YES (${order.refundReason ?? 'no reason'})` : 'no')],
];

await mongoose.connect(config.MONGO_URI);

const orders = await orderModel
  .find({
    $and: [
      {
        $or: [
          { 'payment.status': 'paid' },
          { 'payment.method': 'cod' },
        ],
      },
      { orderStatus: { $in: OPEN_STATUSES } },
    ],
  })
  .sort({ createdAt: 1 })
  .lean();

if (orders.length === 0) {
  console.log('No open orders.');
} else {
  const widths = columns.map(([header, read], index) =>
    Math.max(
      header.length,
      ...orders.map((order) => String(read(order) ?? '').length)
    ) + (index === 0 ? 0 : 2)
  );

  const line = (cells) =>
    cells
      .map((cell, index) => String(cell ?? '').padEnd(widths[index]).slice(0, widths[index]))
      .join('')
      .trimEnd();

  console.log(line(columns.map(([header]) => header.toUpperCase())));
  for (const order of orders) {
    console.log(line(columns.map(([, read]) => read(order))));
  }
  console.log(`\n${orders.length} open order(s).`);
}

await mongoose.disconnect();
