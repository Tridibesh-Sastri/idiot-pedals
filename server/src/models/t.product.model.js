import mongoose from "mongoose";
import { paiseValidator, intValidator } from "./validators.js";

const { Schema } = mongoose;

const money = (opts = {}) => ({ type: Number, min: 0, validate: paiseValidator, ...opts });
const GST_SLABS = [0, 3, 5, 12, 18, 28];

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, trim: true },

    price: money({ required: true }), // selling price, paise
    mrp: money(), // printed MRP, paise
    currency: { type: String, enum: ["INR"], default: "INR" },

    stock: { type: Number, required: true, min: 0, default: 0, validate: intValidator },
    reservedStock: { type: Number, min: 0, default: 0, validate: intValidator },

    // out_of_stock removed: derive it from stock - reservedStock (see virtuals)
    status: { type: String, enum: ["active", "inactive"], default: "active" },

    // Shiprocket needs these to create a shipment
    weightGrams: { type: Number, required: true, min: 1, validate: intValidator },
    dimensions: {
      lengthCm: { type: Number, required: true, min: 0.1 },
      breadthCm: { type: Number, required: true, min: 0.1 },
      heightCm: { type: Number, required: true, min: 0.1 },
    },

    hsnCode: { type: String, trim: true },
    gstRate: {
      type: Number,
      validate: { validator: (v) => GST_SLABS.includes(v), message: "gstRate must be one of 0,3,5,12,18,28" },
    },

    images: [{ type: String }],

    model3D: { url: String, poster: String },

    audio: [{ name: String, url: String }],

    // Mixed: after changing nested keys call doc.markModified("specifications")
    specifications: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.virtual("availableStock").get(function () {
  return Math.max(0, this.stock - this.reservedStock);
});
productSchema.virtual("inStock").get(function () {
  return this.status === "active" && this.stock - this.reservedStock > 0;
});

productSchema.pre("validate", function () {
  if (this.reservedStock > this.stock) throw new Error("reservedStock cannot exceed stock");
  if (this.mrp != null && this.price != null && this.mrp < this.price) {
    throw new Error("mrp cannot be less than price");
  }
});

/* Atomic stock operations. Use these, never read-then-write. Each returns null on failure. */
productSchema.statics.reserveStock = function (productId, qty) {
  return this.findOneAndUpdate(
    {
      _id: productId,
      status: "active",
      $expr: { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, qty] },
    },
    { $inc: { reservedStock: qty } },
    { new: true }
  );
};

productSchema.statics.releaseStock = function (productId, qty) {
  return this.findOneAndUpdate(
    { _id: productId, reservedStock: { $gte: qty } },
    { $inc: { reservedStock: -qty } },
    { new: true }
  );
};

// On successful payment / confirmed COD: convert reservation into a real deduction
productSchema.statics.commitStock = function (productId, qty) {
  return this.findOneAndUpdate(
    { _id: productId, reservedStock: { $gte: qty }, stock: { $gte: qty } },
    { $inc: { stock: -qty, reservedStock: -qty } },
    { new: true }
  );
};

// Reserve many items; if any fails, roll back the ones already reserved.
// items: [{ productId, quantity }] (merge duplicate productIds before calling)
productSchema.statics.reserveMany = async function (items) {
  const done = [];
  for (const { productId, quantity } of items) {
    const updated = await this.reserveStock(productId, quantity);
    if (!updated) {
      await Promise.all(done.map((d) => this.releaseStock(d.productId, d.quantity)));
      return { ok: false, failedProductId: productId };
    }
    done.push({ productId, quantity });
  }
  return { ok: true };
};

productSchema.index({ name: "text", description: "text" }, { weights: { name: 5, description: 1 } });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1, price: 1 });

const productModel = mongoose.model("Product", productSchema);

export default productModel;
