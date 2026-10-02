import mongoose from "mongoose";

import { toMinor } from "../utils/money.js";

const ORDER_NUMBER_MAX_LENGTH = 64;
const NAME_MAX_LENGTH = 150;
const EMAIL_MAX_LENGTH = 254;
const PHONE_MAX_LENGTH = 20;
const ADDRESS_MAX_LENGTH = 500;
const POSTAL_MAX_LENGTH = 20;
const SKU_MAX_LENGTH = 64;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lossless integer minor-unit (paise) amount. Optional so documents written
 * before this field existed still validate; when present it must be a safe
 * integer.
 */
const minorUnitsField = () => ({
  type: Number,
  min: 0,
  validate: {
    validator: (value) =>
      value === undefined || value === null || Number.isSafeInteger(value),
    message: "Amount (minor units) must be a safe integer.",
  },
});

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
    /*
     * Exact integer minor units (paise). `amount` remains the major-unit value
     * the API has always returned; `amountMinor` is the lossless integer that
     * all money arithmetic and payment-provider calls use, so totals can never
     * drift through binary floating point.
     */
    amountMinor: {
      type: Number,
      min: 0,
      validate: {
        validator: (value) =>
          value === undefined || value === null || Number.isSafeInteger(value),
        message: "Amount (minor units) must be a safe integer.",
      },
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
      /* Lossless integer paise counterparts of the four amounts above. */
      subtotalMinor: minorUnitsField(),
      shippingMinor: minorUnitsField(),
      discountMinor: minorUnitsField(),
      totalMinor: minorUnitsField(),
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

      /* Why a payment ended in `failed` (e.g. payment_failed, reservation_expired). */
      failureReason: {
        type: String,
        trim: true,
        maxlength: 100,
      },
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "fulfilled",
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

    /*
     * Inventory reservation bookkeeping. `stockReservedAt` is set when the
     * reservation is taken; the cron job releases reservations whose payment
     * never arrived. `stockConsumedAt` records the permanent decrement that
     * happens when the order is fulfilled.
     */
    stockReservedAt: {
      type: Date,
      default: null,
    },

    stockReleasedAt: {
      type: Date,
      default: null,
    },

    stockConsumedAt: {
      type: Date,
      default: null,
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
 *
 * Every money check is an exact integer comparison in paise. The old ±0.01
 * float tolerance is gone: a total is either exactly right or it is rejected.
 */
orderSchema.pre("validate", function () {
  if (!this.items?.length) {
    return;
  }

  const currency = this.pricing?.currency;
  let calculatedSubtotalMinor = 0;

  const minorFromAmount = (amount) => {
    try {
      return toMinor(amount);
    } catch (error) {
      return null;
    }
  };

  /*
   * When both representations are present they must agree, which catches a
   * document whose major-unit amount was altered after the integer was derived.
   */
  const resolveItemMinor = (amount, minor, fieldLabel) => {
    const derived = minorFromAmount(amount);

    if (derived === null) {
      this.invalidate("items", `Invalid money amount on ${fieldLabel}.`);
      return null;
    }

    if (minor !== undefined && minor !== null && minor !== derived) {
      this.invalidate(
        "items",
        `Minor units do not match the major amount on ${fieldLabel}.`
      );
      return null;
    }

    return derived;
  };

  for (const item of this.items) {
    if (item.unitPrice?.currency !== currency || item.total?.currency !== currency) {
      this.invalidate(
        "items",
        "All order item currencies must match the order currency."
      );
      continue;
    }

    const unitPriceMinor = resolveItemMinor(
      item.unitPrice.amount,
      item.unitPrice.amountMinor,
      `the unit price of SKU ${item.sku}`
    );

    const itemTotalMinor = resolveItemMinor(
      item.total.amount,
      item.total.amountMinor,
      `the total of SKU ${item.sku}`
    );

    if (unitPriceMinor === null || itemTotalMinor === null) {
      continue;
    }

    const expectedTotalMinor = unitPriceMinor * item.quantity;

    if (expectedTotalMinor !== itemTotalMinor) {
      this.invalidate(
        "items",
        `Item total does not match quantity × unit price for SKU ${item.sku}.`
      );
    }

    calculatedSubtotalMinor += expectedTotalMinor;
  }

  const subtotalMinor =
    this.pricing.subtotalMinor ?? minorFromAmount(this.pricing.subtotal);
  const shippingMinor =
    this.pricing.shippingMinor ?? minorFromAmount(this.pricing.shipping);
  const discountMinor =
    this.pricing.discountMinor ?? minorFromAmount(this.pricing.discount);
  const totalMinor =
    this.pricing.totalMinor ?? minorFromAmount(this.pricing.total);

  if (
    subtotalMinor === null ||
    shippingMinor === null ||
    discountMinor === null ||
    totalMinor === null
  ) {
    this.invalidate("pricing", "Order pricing contains a non-finite amount.");
    return;
  }

  if (subtotalMinor !== calculatedSubtotalMinor) {
    this.invalidate(
      "pricing.subtotal",
      "Order subtotal does not match the item totals."
    );
  }

  const expectedOrderTotalMinor =
    subtotalMinor + shippingMinor - discountMinor;

  if (expectedOrderTotalMinor < 0 || expectedOrderTotalMinor !== totalMinor) {
    this.invalidate(
      "pricing.total",
      "Order total does not match subtotal + shipping - discount."
    );
  }
});

const orderModel =
  mongoose.models.Order || mongoose.model("Order", orderSchema);

export default orderModel;
