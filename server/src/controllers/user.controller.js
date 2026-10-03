import { serializeUser } from '../utils/serializeUser.js'
import {
  getPublicUserById,
  updateUserProfile,
} from '../services/user.service.js'

const INTERNAL_ERROR_MESSAGE = 'Internal Server Error.'

/* ============================================================
   GET /api/users/me
   ============================================================ */

export const getMe = async (req, res, next) => {
  try {
    const user = await getPublicUserById(req.user.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'User found successfully.',
      data: { user: serializeUser(user) },
    })
  } catch (error) {
    return next(error)
  }
}

/* ============================================================
   PATCH /api/users/me
   ============================================================
 *
 * The validator whitelists `name` and `phone`; the service copies only those
 * keys. Privileged fields (role, emailVerified, ...) cannot be set here.
 */

export const updateMe = async (req, res, next) => {
  try {
    const user = await updateUserProfile({
      userId: req.user.userId,
      updates: req.body,
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: serializeUser(user) },
    })
  } catch (error) {
    if (error?.statusCode === 400 || error?.statusCode === 409) {
      return res.status(error.statusCode).json({
        success: false,
        ...(error.code ? { code: error.code } : {}),
        message: error.message || INTERNAL_ERROR_MESSAGE,
      })
    }

    return next(error)
  }
}
