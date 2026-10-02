import mongoose from 'mongoose'

const { Schema } = mongoose

const addressSchema = new Schema(
    {
        label: { type: String, trim: true, maxlength: 30 },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        phone: { type: String, required: true, trim: true, maxlength: 10, minlength: 10 },
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

const authProviderSchema = new Schema(
    {
        provider: {
            type: String,
            enum: ['email', 'google'],
            required: true,
        },
        providerId: {
            type: String,
            trim: true,
            maxlength: 255,
        },
    },
    { _id: false, strict: 'throw' }
)

const userSchema = new Schema(
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

        emailVerified: {
            type: Boolean,
            default: false,
            index: true,
        },

        phone: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            maxlength: 20,
        },

        phoneVerified: {
            type: Boolean,
            default: false,
        },

        authProviders: {
            type: [authProviderSchema],
            default: [],
        },

        passwordHash: {
            type: String,
            minlength: 1,
            maxlength: 255,
        },

        role: {
            type: String,
            enum: ['customer', 'admin'],
            default: 'customer',
            index: true,
        },

        addresses: {
            type: [addressSchema],
            default: [],
            validate: {
                validator: (addresses) => addresses.length <= 20,
                message: 'A user cannot have more than 20 addresses.',
            },
        },
    },
    {
        timestamps: true,
        strict: 'throw',
        versionKey: '__v',
    }
)

// Useful for Google-account lookup. Provider ID uniqueness is intentionally
// enforced by the authentication service rather than a multikey unique index.
userSchema.index(
    { 'authProviders.provider': 1, 'authProviders.providerId': 1 },
    { sparse: true }
)


const userModel = mongoose.model('User', userSchema)

export default userModel
