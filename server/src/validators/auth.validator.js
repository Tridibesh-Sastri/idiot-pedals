import { body, cookie, validationResult } from 'express-validator'

import { buildRefreshCookieOptions } from '../services/auth.service.js'

/*
 * Address item shape, mirroring pendingRegistration addressSchema so a
 * malformed item is a 400 here instead of a 500 from Mongoose strict mode.
 * Pure and unit-tested below.
 */
const ADDRESS_MAX_ITEMS = 20
const ADDRESS_STRING_LIMITS = {
    label: 30,
    name: 100,
    phone: 20,
    addressLine1: 200,
    addressLine2: 200,
    city: 100,
    state: 100,
    postalCode: 20,
    country: 100,
}
const ADDRESS_ALLOWED_FIELDS = new Set([...Object.keys(ADDRESS_STRING_LIMITS), 'isDefault'])
const ADDRESS_REQUIRED_FIELDS = ['name', 'phone', 'addressLine1', 'city', 'state', 'postalCode']

export const validateAddressItem = (item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return 'Each address must be an object.'
    }

    for (const key of Object.keys(item)) {
        if (!ADDRESS_ALLOWED_FIELDS.has(key)) {
            return `Unexpected address field: ${key}.`
        }
    }

    for (const field of ADDRESS_REQUIRED_FIELDS) {
        if (typeof item[field] !== 'string' || !item[field].trim()) {
            return `Address ${field} is required.`
        }
    }

    for (const [field, max] of Object.entries(ADDRESS_STRING_LIMITS)) {
        if (
            item[field] !== undefined &&
            (typeof item[field] !== 'string' || item[field].length > max)
        ) {
            return `Address ${field} is too long.`
        }
    }

    if (item.isDefault !== undefined && typeof item.isDefault !== 'boolean') {
        return 'Address isDefault must be a boolean.'
    }

    return null
}

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 50
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
/*
 * bcrypt silently truncates past 72 bytes: without this cap, two different
 * long passwords sharing a 72-byte prefix would be identical. Login keeps no
 * byte rule so previously registered passwords always still verify.
 */
const PASSWORD_MAX_BYTES = 72
const PHONE_PATTERN = /^[6-9]\d{9}$/

export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request',
            errors: errors.array({
                onlyFirstError: true,
            }),
        })
    }

    next()
}

export const rejectUnknownFields = (allowedFields) => (req, res, next) => {
    const unknownFields = Object.keys(req.body ?? {}).filter(
        (field) => !allowedFields.includes(field)
    )

    if (unknownFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request',
            errors: unknownFields.map((field) => ({
                type: 'field',
                msg: `Unexpected field: ${field}`,
                path: field,
                location: 'body',
            })),
        })
    }

    next()
}

export const registerValidator = [
    rejectUnknownFields([
        'name',
        'email',
        'phone',
        'addresses',
        'password',
    ]),


    body('email')
        .exists()
        .withMessage('Email is required')
        .bail()
        .isString()
        .withMessage('Email must be a string')
        .bail()
        .trim()
        .toLowerCase()
        .isEmail()
        .withMessage('Enter a valid email')
        .bail()
        .isLength({ max: 254 })
        .withMessage('Email is too long'),

    body('name')
        .exists()
        .withMessage('Name is required')
        .bail()
        .isString()
        .withMessage('Name must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Name cannot be empty')
        .bail()
        .isLength({
            min: NAME_MIN_LENGTH,
            max: NAME_MAX_LENGTH,
        })
        .withMessage(
            `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`
        )
        .bail()
        .matches(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u)
        .withMessage('Name contains invalid characters'),

    body('password')
        .exists()
        .withMessage('Password is required')
        .bail()
        .isString()
        .withMessage('Password must be a string')
        .bail()
        .isLength({
            min: PASSWORD_MIN_LENGTH,
            max: PASSWORD_MAX_LENGTH,
        })
        .withMessage(
            `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`
        )
        .bail()
        .custom((value) => {
            if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) {
                throw new Error(
                    `Password must be at most ${PASSWORD_MAX_BYTES} bytes.`
                )
            }
            return true
        }),

    body('phone')
        .exists()
        .withMessage('Phone number is required')
        .bail()
        .isString()
        .withMessage('Phone number must be a string')
        .bail()
        .trim()
        .matches(PHONE_PATTERN)
        .withMessage(
            'Enter a valid 10-digit Indian phone number'
        ),

    body('addresses')
        .optional()
        .isArray({ max: ADDRESS_MAX_ITEMS })
        .withMessage(`Addresses must be an array of at most ${ADDRESS_MAX_ITEMS} items.`)
        .bail()
        .custom((items) => {
            for (const item of items) {
                const problem = validateAddressItem(item)
                if (problem) throw new Error(problem)
            }
            return true
        }),

    handleValidationErrors,
]

export const loginValidator = [
    rejectUnknownFields(['email', 'password']),

    body('email')
        .exists()
        .withMessage('Email is required')
        .bail()
        .isString()
        .withMessage('Email must be a string')
        .bail()
        .trim()
        .toLowerCase()
        .isEmail()
        .withMessage('Enter a valid email')
        .bail()
        .isLength({ max: 254 })
        .withMessage('Email is too long'),

    body('password')
        .exists()
        .withMessage('Password is required')
        .bail()
        .isString()
        .withMessage('Password must be a string')
        .bail()
        .isLength({
            min: PASSWORD_MIN_LENGTH,
            max: PASSWORD_MAX_LENGTH,
        })
        .withMessage(
            `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`
        ),

    handleValidationErrors,
]

export const validateRefreshCookie = [
  cookie('refreshToken')
    // 1. Presence Enforcement
    .exists({ checkFalsy: true })
    .withMessage('Authentication required.')
    .bail()

    // 2. Structural Type Guard (Blocks parameter pollution, arrays, or objects)
    .custom((value) => {
      if (typeof value !== 'string') {
        throw new Error('Malformed authentication layout.');
      }
      return true;
    })
    .bail()

    // 3. String Trimming
    .trim()

    // 4. Rigid Length Boundaries (Min length of standard small JWT to Max length of large JWT)
    .isLength({ min: 40, max: 2048 })
    .withMessage('Invalid authentication signature length.')
    .bail()

    // 5. Explicit Format Constraints (Enforces accurate Base64URL string segments)
    .matches(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)
    .withMessage('Invalid token syntax character sequence.'),

  /**
   * Final interceptor handling and error parsing middleware.
   */
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Security Practice: Extract the first error message precisely
      const firstError = errors.array()[0].msg;

      // Always clear out any unauthenticated cookies if an active mismatch occurs.
      // Flags come from the shared builder so set/clear can never drift apart
      // (a mismatched path or sameSite silently fails to delete the cookie).
      res.clearCookie('refreshToken', buildRefreshCookieOptions());

      return res.status(401).json({
        success: false,
        message: firstError,
      });
    }
    next();
  },
];

/*
 * NOTE: `validateGoogleCallback` was removed in Phase 1.
 *
 * The Google callback no longer returns JSON, so it no longer runs through an
 * express-validator chain: every failure path must issue a 302 into the SPA
 * (FRONTEND_URL/login?error=<code>). Code and state validation now live in
 * `googleCallbackController`, which redirects instead of returning a body.
 */

/*
 * POST /api/auth/resend-verification takes an email only. Rules mirror the
 * register email rules exactly (same shape in, same 400s out).
 */
export const resendVerificationValidator = [
    body('email')
        .exists()
        .withMessage('Email is required')
        .bail()
        .isString()
        .withMessage('Email must be a string')
        .bail()
        .trim()
        .toLowerCase()
        .isEmail()
        .withMessage('Enter a valid email')
        .bail()
        .isLength({ max: 254 })
        .withMessage('Email is too long'),

    handleValidationErrors,
]

export const validateVerifyEmail = (req, res, next) => {
    // POST body only: the token must never travel in a URL for the API call
    // (URLs leak via history, referrers and logs; the emailed link itself
    // only carries it to the page, which POSTs it from memory).
    const { token } = req.body ?? {};

    if (
        typeof token !== 'string' ||
        token.length !== 64 ||
        !/^[a-f0-9]{64}$/.test(token)
    ) {
        return res.status(400).json({
            success: false,
            code: 'EMAIL_TOKEN_INVALID',
            message: 'Invalid verification token.'
        });
    }

    next();
};