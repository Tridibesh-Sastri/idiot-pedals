import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { toMinor } from "../utils/money.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const isDuplicateKeyError = (error) => error?.code === 11000;

const getDuplicateField = (error) => {
  if (!error?.keyPattern) return null;

  return Object.keys(error.keyPattern)[0] || null;
};

const normalizeProductData = (data) => {
  const normalized = { ...data };

  if (normalized.name) {
    normalized.name = normalized.name.trim();
  }

  if (normalized.slug) {
    normalized.slug = normalized.slug.trim().toLowerCase();
  }

  if (normalized.sku) {
    normalized.sku = normalized.sku.trim().toUpperCase();
  }

  if (normalized.currency) {
    normalized.currency = normalized.currency.trim().toUpperCase();
  }

  if (normalized.description) {
    normalized.description = normalized.description.trim();
  }

  return normalized;
};

/* -------------------------------------------------------------------------- */
/* CREATE PRODUCT                                                             */
/* -------------------------------------------------------------------------- */

export const createProduct = async (data) => {
  const productData = normalizeProductData(data);

  /*
   * Business rule:
   * reservedStock cannot exceed stock.
   */
  if (
    productData.reservedStock !== undefined &&
    productData.stock !== undefined &&
    productData.reservedStock > productData.stock
  ) {
    const error = new Error(
      "Reserved stock cannot exceed total stock."
    );

    error.statusCode = 400;
    throw error;
  }

  /*
   * Business rule: a compare-at price must be strictly above the price.
   *
   * Mirrors the validator so a direct service call (a seed, a test) cannot store
   * an impossible discount either. Integer paise, never floats.
   */
  if (
    productData.compareAtPrice !== null &&
    productData.compareAtPrice !== undefined &&
    typeof productData.price === "number" &&
    toMinor(productData.compareAtPrice) <= toMinor(productData.price)
  ) {
    const error = new Error(
      "Compare-at price must be greater than the price."
    );

    error.statusCode = 400;
    throw error;
  }

  /*
   * Business rule:
   * Active product must have available stock.
   */
  if (
    productData.status === "active" &&
    productData.stock !== undefined
  ) {
    const reservedStock = productData.reservedStock ?? 0;
    const availableStock = productData.stock - reservedStock;

    if (availableStock <= 0) {
      const error = new Error(
        "An active product must have available stock."
      );

      error.statusCode = 400;
      throw error;
    }
  }

  /*
   * Business rule:
   * out_of_stock cannot have available stock.
   */
  if (
    productData.status === "out_of_stock" &&
    productData.stock !== undefined
  ) {
    const reservedStock = productData.reservedStock ?? 0;
    const availableStock = productData.stock - reservedStock;

    if (availableStock > 0) {
      const error = new Error(
        "An out_of_stock product cannot have available stock."
      );

      error.statusCode = 400;
      throw error;
    }
  }

  try {
    return await Product.create(productData);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = getDuplicateField(error);

      const duplicateError = new Error(
        field === "sku"
          ? "A product with this SKU already exists."
          : field === "slug"
            ? "A product with this slug already exists."
            : "A product with the provided unique value already exists."
      );

      duplicateError.statusCode = 409;
      duplicateError.code = "DUPLICATE_PRODUCT";

      throw duplicateError;
    }

    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/* GET PRODUCT BY ID                                                          */
/* -------------------------------------------------------------------------- */

export const getProductById = async (productId) => {
  if (!mongoose.isValidObjectId(productId)) {
    const error = new Error("Invalid product ID.");
    error.statusCode = 400;
    throw error;
  }

  return Product.findById(productId).lean();
};

/* -------------------------------------------------------------------------- */
/* GET PRODUCTS                                                               */
/* -------------------------------------------------------------------------- */

export const getProducts = async ({
  page = 1,
  limit = 20,
  status,
  search,
  sort = "-createdAt",
}) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$text = {
      $search: search,
    };
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Product.countDocuments(filter),
  ]);

  return {
    products,
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

/* -------------------------------------------------------------------------- */
/* UPDATE PRODUCT                                                             */
/* -------------------------------------------------------------------------- */

export const updateProduct = async (productId, data) => {
  if (!mongoose.isValidObjectId(productId)) {
    const error = new Error("Invalid product ID.");
    error.statusCode = 400;
    throw error;
  }

  const existingProduct = await Product.findById(productId);

  if (!existingProduct) {
    return null;
  }

  /*
   * SKU is immutable.
   *
   * The validator already rejects it, but this is an additional
   * service-layer safety check.
   */
  if (Object.prototype.hasOwnProperty.call(data, "sku")) {
    const error = new Error(
      "SKU cannot be changed after product creation."
    );

    error.statusCode = 400;
    throw error;
  }

  const updateData = normalizeProductData(data);

  /* ---------------------------------------------------------------------- */
  /* Compare-at price must stay strictly above the effective price           */
  /* ---------------------------------------------------------------------- */

  /*
   * The effective price is the one in this request if it carries a price,
   * otherwise the stored one — so lowering a price onto (or below) an existing
   * compareAtPrice is rejected, and raising a compareAtPrice to (or below) the
   * price is rejected too.
   *
   * Compared in integer paise, never with floats. `null` clears the field.
   */
  const effectivePrice =
    updateData.price !== undefined ? updateData.price : existingProduct.price;

  const effectiveCompareAtPrice =
    updateData.compareAtPrice !== undefined
      ? updateData.compareAtPrice
      : existingProduct.compareAtPrice;

  if (
    effectiveCompareAtPrice !== null &&
    effectiveCompareAtPrice !== undefined &&
    toMinor(effectiveCompareAtPrice) <= toMinor(effectivePrice)
  ) {
    const error = new Error(
      "Compare-at price must be greater than the price."
    );

    error.statusCode = 400;
    throw error;
  }

  /*
   * Calculate the resulting stock state using the existing
   * values when they are not included in the update.
   */
  const resultingStock =
    updateData.stock !== undefined
      ? updateData.stock
      : existingProduct.stock;

  const resultingReservedStock =
    updateData.reservedStock !== undefined
      ? updateData.reservedStock
      : existingProduct.reservedStock;

  const resultingStatus =
    updateData.status !== undefined
      ? updateData.status
      : existingProduct.status;

  /* ---------------------------------------------------------------------- */
  /* Stock validation                                                       */
  /* ---------------------------------------------------------------------- */

  if (resultingReservedStock > resultingStock) {
    const error = new Error(
      "Reserved stock cannot exceed total stock."
    );

    error.statusCode = 400;
    throw error;
  }

  const availableStock =
    resultingStock - resultingReservedStock;

  if (
    resultingStatus === "active" &&
    availableStock <= 0
  ) {
    const error = new Error(
      "An active product must have available stock."
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    resultingStatus === "out_of_stock" &&
    availableStock > 0
  ) {
    const error = new Error(
      "An out_of_stock product cannot have available stock."
    );

    error.statusCode = 400;
    throw error;
  }

  /* ---------------------------------------------------------------------- */
  /* Update                                                                  */
  /* ---------------------------------------------------------------------- */

  try {
    return await Product.findByIdAndUpdate(
      productId,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    ).lean();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = getDuplicateField(error);

      const duplicateError = new Error(
        field === "slug"
          ? "A product with this slug already exists."
          : "A product with the provided unique value already exists."
      );

      duplicateError.statusCode = 409;
      duplicateError.code = "DUPLICATE_PRODUCT";

      throw duplicateError;
    }

    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/* DELETE PRODUCT                                                             */
/* -------------------------------------------------------------------------- */

export const deleteProduct = async (productId) => {
  if (!mongoose.isValidObjectId(productId)) {
    const error = new Error("Invalid product ID.");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Hard deletion is kept here for now.
   *
   * Later, once orders exist in production, we should probably
   * replace this with a soft-delete/archive strategy.
   */
  return Product.findByIdAndDelete(productId).lean();
};