import { body } from 'express-validator'
import { handleValidationErrors, rejectUnknownFields, validateAddressItem } from './auth.validator.js'
import { INDIAN_PHONE_RE as PHONE_PATTERN } from './patterns.js'

/*
 * ============================================================================
 * PATCH /api/users/me
 * ============================================================================
 *
 * Field whitelist. Anything not listed here is rejected by rejectUnknownFields,
 * which is what stops a client from sending `role`, `emailVerified`,
 * `passwordHash`, `email`, `authProviders` or any other user field.
 *
 * Changing email is deliberately unsupported here: it would require a fresh
 * verification round-trip and is a separate flow.
 */

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 100

export const updateMeValidator = [
  rejectUnknownFields(['name', 'phone', 'addresses']),

  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string.')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty.')
    .bail()
    .isLength({ min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH })
    .withMessage(
      `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`
    )
    .bail()
    .matches(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u)
    .withMessage('Name contains invalid characters.'),

  body('phone')
    .optional()
    .isString()
    .withMessage('Phone number must be a string.')
    .bail()
    .trim()
    .matches(PHONE_PATTERN)
    .withMessage('Enter a valid 10-digit Indian phone number.'),

  body('addresses')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Addresses must be an array of at most 20 items.')
    .bail()
    .custom((items) => {
      for (const item of items) {
        const problem = validateAddressItem(item)
        if (problem) throw new Error(problem)
      }
      return true
    }),

  // Reject an empty patch rather than returning the unchanged user.
  (req, res, next) => {
    const updates = req.body ?? {}

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        code: 'NO_UPDATABLE_FIELDS',
        message: 'At least one of name, phone or addresses is required.',
      })
    }

    next()
  },

  handleValidationErrors,
]

export default updateMeValidator
