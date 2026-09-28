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
            immutable: true,
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

pendingRegistrationSchema.pre('validate', function (next) {
    if (this.verificationTokenExpiresAt && this.registrationExpiresAt) {
        if (this.verificationTokenExpiresAt > this.registrationExpiresAt) {
            return next(new mongoose.Error.ValidationError(new Error('Verification expiry cannot exceed registration expiry.')))
        }
    }
    next()
})

const pendingRegistrationModel = mongoose.model('PendingRegistration', pendingRegistrationSchema)

export default pendingRegistrationModel
