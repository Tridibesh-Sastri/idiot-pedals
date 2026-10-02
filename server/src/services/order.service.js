import crypto from "crypto";

import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import {
    sendAdminOrderEmail,
} from './order.email.service.js'

import { multiplyMinor, toMajor, toMinor } from "../utils/money.js";
import {
    releaseReservedStock,
    reserveOrderStock,
} from "./stock.service.js";

/** Mirrors the order line quantity bounds enforced by the schema. */
const MAX_ITEM_QUANTITY = 100;

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `IP-${timestamp}-${random}`;
};

const createOrder = async ({
  userId,
  items,
  paymentMethod,
  customer,
  shippingAddress,
}) => {
  // --------------------------------------------------
  // 1. Load all requested products
  // --------------------------------------------------

  const productIds = items.map((item) => item.productId);

  const products = await Product.find({
    _id: { $in: productIds },
  }).lean();

  const productMap = new Map(
    products.map((product) => [
      product._id.toString(),
      product,
    ])
  );

  const orderItems = [];

  let subtotalMinor = 0;

  // --------------------------------------------------
  // 2. Build authoritative line items
  // --------------------------------------------------
  //
  // Every amount here is derived from the database price in integer paise.
  // Any price the client may have sent is never read — it is not part of the
  // line-item contract at all.

  for (const requestedItem of items) {
    const product = productMap.get(
      requestedItem.productId.toString()
    );

    if (!product) {
      const error = new Error(
        "One or more requested products were not found."
      );

      error.statusCode = 404;

      throw error;
    }

    if (product.status !== "active") {
      const error = new Error(
        `Product "${product.name}" is not available for purchase.`
      );

      error.statusCode = 409;

      throw error;
    }

    const quantity = requestedItem.quantity;

    /*
     * Defence in depth: the validator and the schema both enforce this, but a
     * non-integer quantity here would corrupt the paise arithmetic.
     */
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ITEM_QUANTITY
    ) {
      const error = new Error(
        `Quantity for "${product.name}" must be a whole number between 1 and ${MAX_ITEM_QUANTITY}.`
      );

      error.statusCode = 400;
      error.code = "INVALID_QUANTITY";

      throw error;
    }

    const unitPriceMinor = toMinor(product.price);
    const itemTotalMinor = multiplyMinor(unitPriceMinor, quantity);

    subtotalMinor += itemTotalMinor;

    orderItems.push({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      quantity,
      unitPrice: {
        amount: toMajor(unitPriceMinor),
        amountMinor: unitPriceMinor,
        currency: product.currency,
      },
      total: {
        amount: toMajor(itemTotalMinor),
        amountMinor: itemTotalMinor,
        currency: product.currency,
      },
    });
  }

  // --------------------------------------------------
  // 3. Calculate order-level pricing (integer paise)
  // --------------------------------------------------

  const shippingMinor = 0;
  const discountMinor = 0;

  const totalMinor = subtotalMinor + shippingMinor - discountMinor;

  // --------------------------------------------------
  // 4. Reserve inventory atomically
  // --------------------------------------------------
  //
  // The conditional findOneAndUpdate inside reserveOrderStock is what makes
  // concurrent orders for the last unit safe: exactly one caller matches the
  // availability filter. If any line fails, whatever was already reserved in
  // this call is released before the error propagates.

  const reserved = await reserveOrderStock(
    orderItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))
  );

  // --------------------------------------------------
  // 5. Persist the order
  // --------------------------------------------------

  let order;

  try {
    order = await Order.create({
      orderNumber: generateOrderNumber(),

      userId,

      items: orderItems,

      pricing: {
        subtotal: toMajor(subtotalMinor),
        shipping: toMajor(shippingMinor),
        discount: toMajor(discountMinor),
        total: toMajor(totalMinor),
        currency: "INR",
        subtotalMinor,
        shippingMinor,
        discountMinor,
        totalMinor,
      },

      customer,

      shippingAddress,

      payment: {
        method: paymentMethod,
        status: "pending",
      },

      orderStatus: "pending",

      stockReservedAt: new Date(),
    });
  } catch (error) {
    /*
     * The order did not persist, so the reservation must not be held. Without
     * this the unit would stay reserved until the expiry job ran.
     */
    await releaseReservedStock(reserved);

    throw error;
  }

  // --------------------------------------------------
  // 6. Notify admin
  // --------------------------------------------------
  //
  // Email failure must NEVER cause the order itself
  // to fail because the order has already been persisted.
  //

  if(order.payment.method === "cod"){
    void sendAdminOrderEmail(order)
  }
  

  return order;
};

const getUserOrders = async ({
    userId,
    page = 1,
    limit = 10,
    status,
}) => {
    const filter = {
        userId,
    };

    if (status) {
        filter.orderStatus = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        Order.countDocuments(filter),
    ]);

    return {
        orders,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1,
        },
    };
};

/**
 * Fetches a single order that belongs to `userId`.
 *
 * Ownership is part of the query, so a valid id belonging to somebody else
 * returns null — the caller answers 404, never 403 (no existence oracle).
 */
const getUserOrderById = async ({ userId, orderId }) =>
  Order.findOne({
    _id: orderId,
    userId,
  }).lean();

export {
  createOrder,
  getUserOrders,
  getUserOrderById
};