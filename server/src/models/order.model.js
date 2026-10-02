import mongoose from "mongoose";

const ORDER_NUMBER_MAX_LENGTH = 64;
const NAME_MAX_LENGTH = 150;
const EMAIL_MAX_LENGTH = 254;
const PHONE_MAX_LENGTH = 20;
const ADDRESS_MAX_LENGTH = 500;
const POSTAL_MAX_LENGTH = 20;
const SKU_MAX_LENGTH = 64;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const moneySchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Amount must be a finite number.",
      },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: CURRENCY_PATTERN,
    },
  },
  { _id: false, strict: true }
);

const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: NAME_MAX_LENGTH,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: PHONE_MAX_LENGTH,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: ADDRESS_MAX_LENGTH,
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: ADDRESS_MAX_LENGTH,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: POSTAL_MAX_LENGTH,
    },
    country: {
      type: String,
      required: true,
      default: "India",
      trim: true,
      maxlength: 100,
    },
  },
  { _id: false, strict: true }
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Snapshot fields: preserve what the customer actually ordered.
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: NAME_MAX_LENGTH,
    },

    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: SKU_MAX_LENGTH,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer.",
      },
    },

    unitPrice: {
      type: moneySchema,
      required: true,
    },

    total: {
      type: moneySchema,
      required: true,
    },
  },
  { _id: false, strict: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: ORDER_NUMBER_MAX_LENGTH,
      immutable: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      immutable: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0 && items.length <= 100,
        message: "An order must contain between 1 and 100 items.",
      },
    },

    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
        validate: {
          validator: Number.isFinite,
          message: "Subtotal must be a finite number.",
        },
      },
      shipping: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      discount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
        validate: {
          validator: Number.isFinite,
          message: "Total must be a finite number.",
        },
      },
      currency: {
        type: String,
        required: true,
        default: "INR",
        uppercase: true,
        trim: true,
        match: CURRENCY_PATTERN,
      },
    },

    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: NAME_MAX_LENGTH,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: EMAIL_MAX_LENGTH,
        match: EMAIL_PATTERN,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
        maxlength: PHONE_MAX_LENGTH,
      },
    },

    shippingAddress: {
      type: addressSchema,
      required: true,
    },

    payment: {
      method: {
        type: String,
        enum: ["razorpay", "cod"],
        required: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "authorized",
          "paid",
          "failed",
          "refunded",
        ],
        default: "pending",
        index: true,
      },

      razorpayOrderId: {
        type: String,
        trim: true,
        maxlength: 100,
        sparse: true,
        unique: true,
      },

      razorpayPaymentId: {
        type: String,
        trim: true,
        maxlength: 100,
        sparse: true,
        unique: true,
      },
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    minimize: false,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ "payment.status": 1, createdAt: -1 });

/*
 * Mongoose 9 runs pre hooks as promises — there is no callback `next` argument.
 */
orderSchema.pre("validate", function () {
  if (!this.items?.length) {
    return;
  }

  const currency = this.pricing?.currency;
  let calculatedSubtotal = 0;

  for (const item of this.items) {
    if (item.unitPrice?.currency !== currency || item.total?.currency !== currency) {
      this.invalidate(
        "items",
        "All order item currencies must match the order currency."
      );
      continue;
    }

    const expectedTotal = item.unitPrice.amount * item.quantity;

    if (Math.abs(expectedTotal - item.total.amount) > 0.01) {
      this.invalidate(
        "items",
        `Item total does not match quantity × unit price for SKU ${item.sku}.`
      );
    }

    calculatedSubtotal += expectedTotal;
  }

  if (Math.abs(calculatedSubtotal - this.pricing.subtotal) > 0.01) {
    this.invalidate(
      "pricing.subtotal",
      "Order subtotal does not match the item totals."
    );
  }

  const expectedOrderTotal =
    this.pricing.subtotal + this.pricing.shipping - this.pricing.discount;

  if (expectedOrderTotal < 0 || Math.abs(expectedOrderTotal - this.pricing.total) > 0.01) {
    this.invalidate(
      "pricing.total",
      "Order total does not match subtotal + shipping - discount."
    );
  }

});

const orderModel =
  mongoose.models.Order || mongoose.model("Order", orderSchema);

export default orderModel;
