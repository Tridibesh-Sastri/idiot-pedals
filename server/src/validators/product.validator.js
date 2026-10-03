import { param, body, query } from "express-validator";
import mongoose from "mongoose";
import { toMinor } from "../utils/money.js";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SKU_MAX_LENGTH = 64;
const SLUG_MAX_LENGTH = 120;
const PRODUCT_NAME_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 10000;
const URL_MAX_LENGTH = 2048;
const MAX_IMAGES = 20;
const MAX_AUDIO_ASSETS = 20;

/**
 * Optional compare-at ("was") price.
 *
 * Representation rules match `price`, plus `null` is accepted to clear it. The
 * value is display-only and never reaches money arithmetic.
 */
const COMPARE_AT_PRICE_RULES = [
  body("compareAtPrice")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Compare-at price must be a number greater than or equal to 0.")
    .custom(Number.isFinite)
    .withMessage("Compare-at price must be a finite number."),
];

/**
 * Create-time cross-field rule: the body carries both values, so the effective
 * price is the submitted one.
 *
 * Compared in integer paise — never with floats — because `3499 > 3499.000000001`
 * must not be the difference between a valid and an invalid discount.
 *
 * (On update the stored price may be the one that matters, and only the service
 * layer can read it, so that half of the rule lives in product.service.js.)
 */
const COMPARE_AT_ABOVE_SUBMITTED_PRICE = body("compareAtPrice")
  .optional({ nullable: true })
  .custom((value, { req }) => {
    if (value === null || value === undefined) return true;

    const price = req.body?.price;
    if (typeof price !== "number" || !Number.isFinite(price)) return true;

    if (toMinor(value) <= toMinor(price)) {
      throw new Error("Compare-at price must be greater than the price.");
    }

    return true;
  });

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* -------------------------------------------------------------------------- */
/* Reusable Validators                                                        */
/* -------------------------------------------------------------------------- */

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

/* -------------------------------------------------------------------------- */
/* Product ID                                                                 */
/* -------------------------------------------------------------------------- */

export const validateProductId = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Product ID is required.")
    .custom(isValidObjectId)
    .withMessage("Invalid product ID."),
];

/* -------------------------------------------------------------------------- */
/* CREATE PRODUCT                                                             */
/* -------------------------------------------------------------------------- */

export const createProductValidator = [
  body("name")
    .exists()
    .withMessage("Product name is required.")
    .bail()
    .isString()
    .withMessage("Product name must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Product name cannot be empty.")
    .isLength({ min: 1, max: PRODUCT_NAME_MAX_LENGTH })
    .withMessage(
      `Product name must be between 1 and ${PRODUCT_NAME_MAX_LENGTH} characters.`
    ),

  body("slug")
    .exists()
    .withMessage("Slug is required.")
    .bail()
    .isString()
    .withMessage("Slug must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Slug cannot be empty.")
    .isLength({ max: SLUG_MAX_LENGTH })
    .withMessage(`Slug cannot exceed ${SLUG_MAX_LENGTH} characters.`)
    .matches(SLUG_PATTERN)
    .withMessage(
      "Slug can only contain lowercase letters, numbers, and single hyphens."
    ),

  body("sku")
    .exists()
    .withMessage("SKU is required.")
    .bail()
    .isString()
    .withMessage("SKU must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("SKU cannot be empty.")
    .isLength({ max: SKU_MAX_LENGTH })
    .withMessage(`SKU cannot exceed ${SKU_MAX_LENGTH} characters.`)
    .matches(SKU_PATTERN)
    .withMessage(
      "SKU can only contain letters, numbers, dots, underscores, and hyphens."
    ),

  body("description")
    .exists()
    .withMessage("Description is required.")
    .bail()
    .isString()
    .withMessage("Description must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty.")
    .isLength({ min: 1, max: DESCRIPTION_MAX_LENGTH })
    .withMessage(
      `Description must be between 1 and ${DESCRIPTION_MAX_LENGTH} characters.`
    ),

  body("price")
    .exists()
    .withMessage("Price is required.")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("Price must be a number greater than or equal to 0.")
    .custom(Number.isFinite)
    .withMessage("Price must be a finite number."),

  // Optional in the body; admin-only route guards who may set it.
  ...COMPARE_AT_PRICE_RULES,
  COMPARE_AT_ABOVE_SUBMITTED_PRICE,

  body("currency")
    .optional()
    .isString()
    .withMessage("Currency must be a string.")
    .bail()
    .trim()
    .isUppercase()
    .withMessage("Currency must be uppercase.")
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter ISO currency code.")
    .matches(CURRENCY_PATTERN)
    .withMessage("Invalid currency format."),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer."),

  body("reservedStock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Reserved stock must be a non-negative integer."),

  body("status")
    .optional()
    .isIn(["active", "inactive", "out_of_stock"])
    .withMessage("Invalid product status."),

  body("images")
    .optional()
    .isArray({ max: MAX_IMAGES })
    .withMessage(`A product can have at most ${MAX_IMAGES} images.`),

  body("images.*")
    .optional()
    .isString()
    .withMessage("Each image URL must be a string.")
    .bail()
    .trim()
    .isLength({ max: URL_MAX_LENGTH })
    .withMessage(`Image URL cannot exceed ${URL_MAX_LENGTH} characters.`)
    .custom(isValidUrl)
    .withMessage("Each image must be a valid HTTP(S) URL."),

  body("model3D")
    .optional()
    .isObject()
    .withMessage("model3D must be an object."),

  body("model3D.url")
    .optional()
    .isString()
    .withMessage("3D model URL must be a string.")
    .bail()
    .trim()
    .isLength({ max: URL_MAX_LENGTH })
    .withMessage(`3D model URL cannot exceed ${URL_MAX_LENGTH} characters.`)
    .custom(isValidUrl)
    .withMessage("3D model URL must be a valid HTTP(S) URL."),

  body("model3D.poster")
    .optional()
    .isString()
    .withMessage("3D model poster URL must be a string.")
    .bail()
    .trim()
    .isLength({ max: URL_MAX_LENGTH })
    .withMessage(
      `3D model poster URL cannot exceed ${URL_MAX_LENGTH} characters.`
    )
    .custom(isValidUrl)
    .withMessage("3D model poster URL must be a valid HTTP(S) URL."),

  body("audio")
    .optional()
    .isArray({ max: MAX_AUDIO_ASSETS })
    .withMessage(
      `A product can have at most ${MAX_AUDIO_ASSETS} audio assets.`
    ),

  body("audio.*")
    .optional()
    .isObject()
    .withMessage("Each audio asset must be an object."),

  body("audio.*.name")
    .optional()
    .isString()
    .withMessage("Audio name must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Audio name cannot be empty.")
    .isLength({ max: 100 })
    .withMessage("Audio name cannot exceed 100 characters."),

  body("audio.*.url")
    .optional()
    .isString()
    .withMessage("Audio URL must be a string.")
    .bail()
    .trim()
    .isLength({ max: URL_MAX_LENGTH })
    .withMessage(`Audio URL cannot exceed ${URL_MAX_LENGTH} characters.`)
    .custom(isValidUrl)
    .withMessage("Audio URL must be a valid HTTP(S) URL."),

  body("specifications")
    .optional()
    .isObject()
    .withMessage("Specifications must be an object."),
];

/* -------------------------------------------------------------------------- */
/* UPDATE PRODUCT                                                             */
/* -------------------------------------------------------------------------- */

export const updateProductValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Product name must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Product name cannot be empty.")
    .isLength({ max: PRODUCT_NAME_MAX_LENGTH })
    .withMessage(`Product name cannot exceed ${PRODUCT_NAME_MAX_LENGTH} characters.`),

  body("slug")
    .optional()
    .isString()
    .withMessage("Slug must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Slug cannot be empty.")
    .isLength({ max: SLUG_MAX_LENGTH })
    .withMessage(`Slug cannot exceed ${SLUG_MAX_LENGTH} characters.`)
    .matches(SLUG_PATTERN)
    .withMessage(
      "Slug can only contain lowercase letters, numbers, and single hyphens."
    ),

  body("sku")
    .not()
    .exists()
    .withMessage("SKU cannot be changed after product creation."),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty.")
    .isLength({ max: DESCRIPTION_MAX_LENGTH })
    .withMessage(
      `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`
    ),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a number greater than or equal to 0.")
    .custom(Number.isFinite)
    .withMessage("Price must be a finite number."),

  /*
   * Null clears it. The "strictly greater than the effective price" half of the
   * rule is enforced in the service, which can read the stored price.
   */
  ...COMPARE_AT_PRICE_RULES,

  body("currency")
    .optional()
    .isString()
    .withMessage("Currency must be a string.")
    .bail()
    .trim()
    .isUppercase()
    .withMessage("Currency must be uppercase.")
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter ISO currency code.")
    .matches(CURRENCY_PATTERN)
    .withMessage("Invalid currency format."),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer."),

  body("reservedStock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Reserved stock must be a non-negative integer."),

  body("status")
    .optional()
    .isIn(["active", "inactive", "out_of_stock"])
    .withMessage("Invalid product status."),

  body("images")
    .optional()
    .isArray({ max: MAX_IMAGES })
    .withMessage(`A product can have at most ${MAX_IMAGES} images.`),

  body("images.*")
    .optional()
    .isString()
    .withMessage("Each image URL must be a string.")
    .bail()
    .trim()
    .isLength({ max: URL_MAX_LENGTH })
    .withMessage(`Image URL cannot exceed ${URL_MAX_LENGTH} characters.`)
    .custom(isValidUrl)
    .withMessage("Each image must be a valid HTTP(S) URL."),

  body("model3D")
    .optional()
    .isObject()
    .withMessage("model3D must be an object."),

  body("model3D.url")
    .optional()
    .isString()
    .withMessage("3D model URL must be a string.")
    .bail()
    .trim()
    .isLength({ max: URL_MAX_LENGTH })
    .withMessage(`3D model URL cannot exceed ${URL_MAX_LENGTH} characters.`)
    .custom(isValidUrl)
    .withMessage("3D model URL must be a valid HTTP(S) URL."),

  body("model3D.poster")
    .optional()
    .isString()
    .withMessage("3D model poster URL must be a string.")
    .bail()
    .trim()
    .isLength({ max: URL_MAX_LENGTH })
    .withMessage(
      `3D model poster URL cannot exceed ${URL_MAX_LENGTH} characters.`
    )
    .custom(isValidUrl)
    .withMessage("3D model poster URL must be a valid HTTP(S) URL."),

  body("audio")
    .optional()
    .isArray({ max: MAX_AUDIO_ASSETS })
    .withMessage(
      `A product can have at most ${MAX_AUDIO_ASSETS} audio assets.`
    ),

  body("audio.*")
    .optional()
    .isObject()
    .withMessage("Each audio asset must be an object."),

  body("audio.*.name")
    .optional()
    .isString()
    .withMessage("Audio name must be a string.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Audio name cannot be empty.")
    .isLength({ max: 100 })
    .withMessage("Audio name cannot exceed 100 characters."),

  body("audio.*.url")
    .optional()
    .isString()
    .withMessage("Audio URL must be a string.")
    .bail()
    .trim()
    .isLength({ max: URL_MAX_LENGTH })
    .withMessage(`Audio URL cannot exceed ${URL_MAX_LENGTH} characters.`)
    .custom(isValidUrl)
    .withMessage("Audio URL must be a valid HTTP(S) URL."),

  body("specifications")
    .optional()
    .isObject()
    .withMessage("Specifications must be an object."),
];

/* -------------------------------------------------------------------------- */
/* PRODUCT LIST / SEARCH QUERY                                                */
/* -------------------------------------------------------------------------- */

export const productQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100.")
    .toInt(),

  query("status")
    .optional()
    .isIn(["active", "inactive", "out_of_stock"])
    .withMessage("Invalid product status."),

  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string.")
    .bail()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Search cannot exceed 150 characters."),

  query("sort")
    .optional()
    .isIn(["createdAt", "-createdAt", "name", "-name", "price", "-price"])
    .withMessage("Invalid sort option."),
];