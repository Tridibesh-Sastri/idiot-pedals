import { body, cookie, validationResult } from 'express-validator'

import config from '../config/config.js'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 50
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
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
        ),

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
        .isArray()
        .withMessage('Addresses must be an array'),

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

      // Always clear out any unauthenticated cookies if an active mismatch occurs
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.IS_PRODUCTION,
        sameSite: 'strict',
      });

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

export const validateVerifyEmail = (req, res, next) => {
    const { token } = req.query;

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