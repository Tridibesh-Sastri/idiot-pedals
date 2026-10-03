import express from 'express'
import authenticateMiddleware from '../middlewares/authenticate.js'
import {
  createProductValidator,
  productQueryValidator,
  validateProductId,
  updateProductValidator,
} from '../validators/product.validator.js'

import {
  createProductController,
  getProductsController,
  getProductController,
  updateProductController,
  deleteProductController,
} from '../controllers/productController.js'

import { createProduct } from '../services/product.service.js'
import { authorizeAdmin } from '../middlewares/authenticate.js'

const router = express.Router()

// create product
router.post('/',
    authenticateMiddleware,
    authorizeAdmin, 
    createProductValidator,
    createProductController,
    createProduct,
)


/*
 * Catalogue reads are public and change rarely, so they get a short
 * cache lifetime. Express already emits a weak ETag for JSON responses, so a
 * client that revalidates with If-None-Match gets a 304 with no body — the
 * max-age only avoids the round trip entirely for a short window.
 */
const shortPublicCache = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    next()
}

// GET all products
router.get(
    '/',
    shortPublicCache,
    productQueryValidator,
    getProductsController,
)

// Get single product
router.get(
  '/:id',
  shortPublicCache,
  validateProductId,
  getProductController,
)

// Update product
router.patch(
  '/:id',
  authenticateMiddleware,
  authorizeAdmin,
  validateProductId,
  updateProductValidator,
  updateProductController,
)

// Delete product
router.delete(
  '/:id',
  authenticateMiddleware,
  authorizeAdmin,
  validateProductId,
  deleteProductController,
)

export default router