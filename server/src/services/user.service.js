import userModel from '../models/user.model.js'
import { PUBLIC_USER_FIELDS } from '../utils/serializeUser.js'

/**
 * Fields a client is allowed to change through PATCH /api/users/me.
 *
 * This is the authoritative whitelist: even if a validator were bypassed, only
 * these keys are ever copied into the update document. `role`, `emailVerified`,
 * `phoneVerified`, `passwordHash`, `authProviders` and `email` can never be
 * written from a request body.
 */
const UPDATABLE_FIELDS = ['name', 'phone']

export const getPublicUserById = async (userId) =>
  userModel.findById(userId).select(PUBLIC_USER_FIELDS).lean()

export const updateUserProfile = async ({ userId, updates }) => {
  const patch = {}

  for (const field of UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates ?? {}, field)) {
      patch[field] = updates[field]
    }
  }

  if (Object.keys(patch).length === 0) {
    const error = new Error('At least one of name or phone is required.')
    error.statusCode = 400
    error.code = 'NO_UPDATABLE_FIELDS'
    throw error
  }

  try {
    return await userModel
      .findByIdAndUpdate(
        userId,
        { $set: patch },
        { new: true, runValidators: true, context: 'query' }
      )
      .select(PUBLIC_USER_FIELDS)
      .lean()
  } catch (error) {
    if (error?.code === 11000) {
      const conflict = new Error('That phone number is already in use.')
      conflict.statusCode = 409
      conflict.code = 'PHONE_IN_USE'
      throw conflict
    }

    throw error
  }
}
