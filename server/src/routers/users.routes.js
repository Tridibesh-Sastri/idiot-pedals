import express from 'express'

import authenticateMiddleware from '../middlewares/authenticate.js'
import { updateMeValidator } from '../validators/user.validator.js'
import { getMe, updateMe } from '../controllers/user.controller.js'

const router = express.Router()

/*
 * ============================================================
 * CURRENT USER PROFILE
 * ============================================================
 *
 * Both routes are authenticated and act only on req.user.userId — a user id is
 * never taken from the body, params or query, so one account can never read or
 * modify another.
 */

router.get('/me', authenticateMiddleware, getMe)

router.patch('/me', authenticateMiddleware, updateMeValidator, updateMe)

export default router
