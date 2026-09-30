import { validationResult } from "express-validator";

// import Product from "../models/Product.js";
import {
  createProduct,
  getProductById,
  getProducts,
  updateProduct,
  deleteProduct,
} from "../services/product.service.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const handleValidationErrors = (req) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));
  }

  return null;
};

/* -------------------------------------------------------------------------- */
/* CREATE PRODUCT                                                             */
/* -------------------------------------------------------------------------- */

export const createProductController = async (req, res, next) => {
  try {
    const validationErrors = handleValidationErrors(req);

    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validationErrors,
      });
    }

    const product = await createProduct(req.body);

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* GET ALL PRODUCTS                                                           */
/* -------------------------------------------------------------------------- */

export const getProductsController = async (req, res, next) => {
  try {
    const validationErrors = handleValidationErrors(req);

    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: validationErrors,
      });
    }

    const result = await getProducts(req.query);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* GET SINGLE PRODUCT                                                         */
/* -------------------------------------------------------------------------- */

export const getProductController = async (req, res, next) => {
  try {
    const validationErrors = handleValidationErrors(req);

    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
        errors: validationErrors,
      });
    }

    const product = await getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully.",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* UPDATE PRODUCT                                                             */
/* -------------------------------------------------------------------------- */

export const updateProductController = async (req, res, next) => {
  try {
    const validationErrors = handleValidationErrors(req);

    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validationErrors,
      });
    }

    const product = await updateProduct(
      req.params.id,
      req.body
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* DELETE PRODUCT                                                             */
/* -------------------------------------------------------------------------- */

export const deleteProductController = async (req, res, next) => {
  try {
    const validationErrors = handleValidationErrors(req);

    if (validationErrors) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
        errors: validationErrors,
      });
    }

    const product = await deleteProduct(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};