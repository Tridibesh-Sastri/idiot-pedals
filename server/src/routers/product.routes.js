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


// GET all products
router.get(
    '/',
    productQueryValidator,
    getProductsController,
)

// Get single product
router.get(
  '/:id',
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