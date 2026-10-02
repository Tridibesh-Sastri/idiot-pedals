import crypto from "crypto";

import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import {
    sendAdminOrderEmail,
} from './order.email.service.js'

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

  // --------------------------------------------------
  // 2. Make sure every requested product exists
  // --------------------------------------------------

  const productMap = new Map(
    products.map((product) => [
      product._id.toString(),
      product,
    ])
  );

  const orderItems = [];

  let subtotal = 0;

  // --------------------------------------------------
  // 3. Validate products and calculate authoritative
  //    order values
  // --------------------------------------------------

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

    const availableStock =
      product.stock - product.reservedStock;

    if (requestedItem.quantity > availableStock) {
      const error = new Error(
        `Insufficient stock for "${product.name}".`
      );

      error.statusCode = 409;

      throw error;
    }

    const unitPrice = product.price;
    const quantity = requestedItem.quantity;
    const itemTotal = unitPrice * quantity;

    subtotal += itemTotal;

    orderItems.push({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      quantity,
      unitPrice: {
        amount: unitPrice,
        currency: product.currency,
      },
      total: {
        amount: itemTotal,
        currency: product.currency,
      },
    });
  }

  // --------------------------------------------------
  // 4. Calculate order-level pricing
  // --------------------------------------------------

  const shipping = 0;
  const discount = 0;

  const total =
    subtotal +
    shipping -
    discount;

  // --------------------------------------------------
  // 5. Create internal order
  // --------------------------------------------------

  const order = await Order.create({
    orderNumber: generateOrderNumber(),

    userId,

    items: orderItems,

    pricing: {
      subtotal,
      shipping,
      discount,
      total,
      currency: "INR",
    },

    customer,

    shippingAddress,

    payment: {
      method: paymentMethod,
      status: "pending",
    },

    orderStatus: "pending",
  });

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

export {
  createOrder,
  getUserOrders
};