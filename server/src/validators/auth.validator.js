import { body, validationResult } from 'express-validator'

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

const rejectUnknownFields = (allowedFields) => (req, res, next) => {
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
        .normalizeEmail()
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
        .normalizeEmail()
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
