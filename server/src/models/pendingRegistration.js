import mongoose from 'mongoose'

const { Schema } = mongoose

const addressSchema = new Schema(
    {
        label: { type: String, trim: true, maxlength: 30 },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        phone: { type: String, required: true, trim: true, maxlength: 20 },
        addressLine1: { type: String, required: true, trim: true, maxlength: 200 },
        addressLine2: { type: String, trim: true, maxlength: 200 },
        city: { type: String, required: true, trim: true, maxlength: 100 },
        state: { type: String, required: true, trim: true, maxlength: 100 },
        postalCode: { type: String, required: true, trim: true, maxlength: 20 },
        country: { type: String, default: 'India', trim: true, maxlength: 100 },
        isDefault: { type: Boolean, default: false },
    },
    { _id: true, strict: 'throw' }
)

const pendingRegistrationSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
        },

        passwordHash: {
            type: String,
            required: true,
            minlength: 1,
            maxlength: 255,
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 20,
        },

        addresses: {
            type: [addressSchema],
            default: [],
            validate: {
                validator: (addresses) => addresses.length <= 20,
                message: 'A registration cannot contain more than 20 addresses.',
            },
        },

        verificationTokenHash: {
            type: String,
            required: true,
            unique: true,
            /*
             * Deliberately NOT immutable. Re-registration must be able to
             * rotate this hash (verified empirically: with immutable:true
             * Mongoose silently drops the $set, so the mailed token stops
             * matching while the old one keeps working — the exact inverse
             * of the intended behavior).
             */
        },

        /*
         * Verification-mail cooldown bookkeeping. lastVerificationSentAt
         * records the last mail for the 60s resend cooldown; the count caps
         * lifetime sends per pending record. Both are wall-clock state so
         * they survive restarts (unlike rate-limiter memory).
         */
        lastVerificationSentAt: {
            type: Date,
            default: null,
        },

        verificationSendCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        verificationTokenExpiresAt: {
            type: Date,
            required: true,
            index: true,
        },

        registrationExpiresAt: {
            type: Date,
            required: true,
            index: true,
            expires: 0,
        },
    },
    {
        timestamps: true,
        strict: 'throw',
    }
)

// pendingRegistrationSchema.index({ registrationExpiresAt: 1 }, { expireAfterSeconds: 0 })

/*
 * Mongoose 9 runs pre hooks as promises — the callback `next` argument is no
 * longer supplied, so `function (next)` hooks threw "next is not a function" on
 * every create()/save(). Validation failures are reported with `invalidate()`,
 * which produces a normal ValidationError.
 */
pendingRegistrationSchema.pre('validate', function () {
    if (
        this.verificationTokenExpiresAt &&
        this.registrationExpiresAt &&
        this.verificationTokenExpiresAt > this.registrationExpiresAt
    ) {
        this.invalidate(
            'verificationTokenExpiresAt',
            'Verification expiry cannot exceed registration expiry.'
        )
    }
})

const pendingRegistrationModel = mongoose.model('PendingRegistration', pendingRegistrationSchema)

export default pendingRegistrationModel
