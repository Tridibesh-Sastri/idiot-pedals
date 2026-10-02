import mongoose from "mongoose";
import { PHONE_RE, PINCODE_RE, paiseValidator, intValidator } from "./validators.js";

const { Schema } = mongoose;

const money = (opts = {}) => ({ type: Number, min: 0, validate: paiseValidator, ...opts });

// Allowed orderStatus moves. Anything not listed is rejected.
export const ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled", "expired"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "rto", "returned"],
  delivered: ["returned"],
  cancelled: ["refunded"],
  returned: ["refunded"],
  rto: ["refunded"],
  expired: [],
  refunded: [],
};

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    hsnCode: { type: String, trim: true },
    gstRate: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 1, validate: intValidator },
    unitPrice: money({ required: true }), // paise, snapshot at order time
    total: money({ required: true }), // paise = unitPrice * quantity
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },

    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Order must have at least one item",
      },
    },

    pricing: {
      subtotal: money({ required: true }),
      shipping: money({ default: 0 }),
      codFee: money({ default: 0 }),
      discount: money({ default: 0 }),
      total: money({ required: true }),
      currency: { type: String, enum: ["INR"], default: "INR" },
    },

    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true, match: [PHONE_RE, "Invalid phone"] },
    },

    shippingAddress: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true, match: [PHONE_RE, "Invalid phone"] },
      addressLine1: { type: String, required: true, trim: true },
      addressLine2: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true, match: [PINCODE_RE, "Invalid pincode"] },
      country: { type: String, default: "India" },
    },

    payment: {
      method: { type: String, enum: ["razorpay", "cod"], required: true },
      status: {
        type: String,
        enum: ["pending", "authorized", "paid", "failed", "refunded"],
        default: "pending",
      },
      razorpayOrderId: { type: String, trim: true },
      razorpayPaymentId: { type: String, trim: true },
      paidAt: Date,
      refund: {
        razorpayRefundId: { type: String, trim: true },
        amount: money(),
        status: { type: String, enum: ["none", "pending", "processed", "failed"], default: "none" },
        refundedAt: Date,
      },
    },

    orderStatus: {
      type: String,
      enum: Object.keys(ORDER_TRANSITIONS),
      default: "pending",
    },

    statusHistory: [
      {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: String,
        _id: false,
      },
    ],

    // Stock lifecycle guard: makes release/commit idempotent (only one can ever win)
    stockState: { type: String, enum: ["reserved", "committed", "released"], default: "reserved" },
    reservationExpiresAt: Date,

    cod: {
      otpVerified: { type: Boolean, default: false },
      confirmedAt: Date,
    },

    cancelReason: { type: String, trim: true, maxlength: 500 },
    invoiceNumber: { type: String, trim: true },

    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment" },
  },
  { timestamps: true }
);

// Server-side money integrity: totals must add up exactly
orderSchema.pre("validate", function () {
  const p = this.pricing;
  if (!p || !this.items || this.items.length === 0) return;

  let sum = 0;
  for (const item of this.items) {
    if (item.unitPrice == null || item.quantity == null || item.total == null) return;
    if (item.total !== item.unitPrice * item.quantity) {
      throw new Error(`Item ${item.sku}: total must equal unitPrice * quantity`);
    }
    sum += item.total;
  }
  if (p.subtotal == null || p.total == null) return;
  if (p.subtotal !== sum) throw new Error("pricing.subtotal must equal sum of item totals");
  if (p.discount > p.subtotal) throw new Error("pricing.discount cannot exceed subtotal");
  const expected = p.subtotal + p.shipping + p.codFee - p.discount;
  if (p.total !== expected) {
    throw new Error("pricing.total must equal subtotal + shipping + codFee - discount");
  }
});

// Keeps statusHistory in sync when using .save()
orderSchema.pre("save", function () {
  if (this.isNew || this.isModified("orderStatus")) {
    this.statusHistory.push({ status: this.orderStatus });
  }
});

/**
 * Atomic, idempotent status change. Returns the updated order,
 * or null if the order was not in a valid "from" state (already processed / illegal move).
 * A null result on a duplicate webhook means: do nothing.
 * Order.transition(id, "confirmed", { set: { "payment.status": "paid" } })
 */
orderSchema.statics.transition = function (orderId, to, { from, set = {} } = {}) {
  const legalFrom = Object.keys(ORDER_TRANSITIONS).filter((s) => ORDER_TRANSITIONS[s].includes(to));
  const fromList = from ? [].concat(from).filter((f) => legalFrom.includes(f)) : legalFrom;
  return this.findOneAndUpdate(
    { _id: orderId, orderStatus: { $in: fromList } },
    {
      $set: { ...set, orderStatus: to },
      $push: { statusHistory: { status: to, at: new Date() } },
    },
    { new: true }
  );
};


// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, reservationExpiresAt: 1 }); // expiry sweep
orderSchema.index(
  { "payment.razorpayOrderId": 1 },
  { unique: true, partialFilterExpression: { "payment.razorpayOrderId": { $type: "string" } } }
);
orderSchema.index(
  { "payment.razorpayPaymentId": 1 },
  { unique: true, partialFilterExpression: { "payment.razorpayPaymentId": { $type: "string" } } }
);
orderSchema.index(
  { invoiceNumber: 1 },
  { unique: true, partialFilterExpression: { invoiceNumber: { $type: "string" } } }
);

const orderModel = mongoose.model("Order", orderSchema);

export default orderModel;
