import { body } from 'express-validator'

import {
    handleValidationErrors,
    rejectUnknownFields,
} from './auth.validator.js'

/*
 * Contact form subjects. The real form (ContactPage.tsx) sends one of these
 * fixed values from a <select> — free text is never accepted, so there is
 * nothing injectable in the subject line of the admin email.
 */
export const CONTACT_SUBJECTS = ['technical', 'order', 'warranty', 'bulk']

/* Control characters (including CR/LF) stripped before length checks. */
const stripControls = (value) =>
    typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, '') : value

export const contactValidator = [
    // Honeypot is a known field so it survives here; the controller decides.
    rejectUnknownFields(['name', 'email', 'subject', 'message', 'website']),

    body('name')
        .exists()
        .withMessage('Name is required')
        .bail()
        .isString()
        .withMessage('Name must be a string')
        .bail()
        .trim()
        .customSanitizer(stripControls)
        .isLength({ min: 2, max: 80 })
        .withMessage('Name must be between 2 and 80 characters'),

    body('email')
        .exists()
        .withMessage('Email is required')
        .bail()
        .isString()
        .withMessage('Email must be a string')
        .bail()
        .trim()
        .custom((value) => {
            // Header injection: never let CR/LF through, even stripped.
            if (/[\r\n]/.test(value)) {
                throw new Error('Enter a valid email')
            }
            return true
        })
        .bail()
        .isEmail()
        .withMessage('Enter a valid email')
        .bail()
        .isLength({ max: 254 })
        .withMessage('Email is too long'),

    body('subject')
        .exists()
        .withMessage('Subject is required')
        .bail()
        .isString()
        .withMessage('Subject must be a string')
        .bail()
        .isIn(CONTACT_SUBJECTS)
        .withMessage('Unknown inquiry subject'),

    body('message')
        .exists()
        .withMessage('Message is required')
        .bail()
        .isString()
        .withMessage('Message must be a string')
        .bail()
        .trim()
        .customSanitizer(stripControls)
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters'),

    body('website')
        .optional({ values: 'falsy' })
        .isString()
        .withMessage('Invalid request'),

    handleValidationErrors,
]
