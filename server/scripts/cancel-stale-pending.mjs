/**
 * Release stock reservations held by abandoned pending orders.
 *
 * An order that is still `pending` with `payment.status: 'pending'` holds the
 * stock it reserved (`stockReservedAt` set, `stockReleasedAt` null). Normally the
 * scheduled sweep in src/jobs/releaseExpiredStock.js clears those, and a
 * `payment.failed` webhook releases immediately. This script is the manual
 * equivalent, for when the job has not run or you want to see what it would do.
 *
 * DRY RUN BY DEFAULT — it only reads. Pass --apply to actually change data.
 *
 *   node scripts/cancel-stale-pending.mjs                 # report only
 *   node scripts/cancel-stale-pending.mjs --apply         # release + cancel
 *   node scripts/cancel-stale-pending.mjs --older-than 5  # minutes, default 15
 *
 * Refuses to run against production. Never prints the Mongo URI or any secret.
 */
import mongoose from 'mongoose';

import config from '../src/config/config.js';
import orderModel from '../src/models/order.model.js';
import { releaseExpiredReservations } from '../src/services/stock.service.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

const olderThanArg = args.indexOf('--older-than');
const olderThanMinutes =
  olderThanArg !== -1 && args[olderThanArg + 1] !== undefined
    ? Number(args[olderThanArg + 1])
    : config.STOCK_RESERVATION_TTL_MS / 60000;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!Number.isFinite(olderThanMinutes) || olderThanMinutes <= 0) {
  fail('--older-than must be a positive number of minutes.');
}

if (config.IS_PRODUCTION) {
  fail('Refusing to run with NODE_ENV=production. This script touches live stock.');
}

await mongoose.connect(config.MONGO_URI);

const databaseName = mongoose.connection.name ?? '';

if (databaseName.toLowerCase().includes('prod')) {
  await mongoose.disconnect();
  fail(`Refusing to run against a database named "${databaseName}".`);
}

const cutoff = new Date(Date.now() - olderThanMinutes * 60000);

// Mirrors the filter used by releaseExpiredReservations, so the dry run lists
// exactly what --apply would change.
const staleFilter = {
  orderStatus: 'pending',
  'payment.status': 'pending',
  stockReservedAt: { $ne: null, $lte: cutoff },
  stockReleasedAt: null,
};

console.log(`database: ${databaseName}`);
console.log(`mode: ${apply ? 'APPLY (data will change)' : 'DRY RUN (read only)'}`);
console.log(`cutoff: pending orders older than ${olderThanMinutes} minute(s)\n`);

const stale = await orderModel
  .find(staleFilter)
  .select('_id orderNumber items stockReservedAt')
  .sort({ stockReservedAt: 1 })
  .lean();

if (stale.length === 0) {
  console.log('Nothing to do: no stale pending orders.');
} else {
  console.log(`${stale.length} stale pending order(s):`);

  for (const order of stale) {
    const units = (order.items ?? []).reduce((total, item) => total + (item.quantity ?? 0), 0);

    console.log(
      `  - ${order.orderNumber} | ${units} unit(s) | reserved at ${
        order.stockReservedAt ? new Date(order.stockReservedAt).toISOString() : 'unknown'
      }`
    );
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to release these reservations.');
  }
}

if (apply && stale.length > 0) {
  const summary = await releaseExpiredReservations({ now: new Date() });

  console.log(`\nreleased: ${summary?.released ?? 0}, cancelled: ${summary?.cancelled ?? 0}`);
}

await mongoose.disconnect();
