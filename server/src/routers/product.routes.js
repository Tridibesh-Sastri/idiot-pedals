import express from 'express'
import authenticateMiddleware from '../middlewares/authenticate.js'
import { createProductValidator } from '../validators/product.validator.js'
import { createProductController } from '../controllers/productController.js'
import { createProduct } from '../services/product.service.js'

const router = express.Router()


router.post('/',
    authenticateMiddleware, 
    createProductValidator,
    createProductController,
    createProduct,
)

export default router