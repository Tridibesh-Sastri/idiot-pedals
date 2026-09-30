import mongoose from 'mongoose'

const { Schema } = mongoose

const refreshTokenSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
            match: /^[a-f0-9]{64}$/i,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        revokedAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        strict: 'throw',
    }
)

// MongoDB removes expired sessions automatically. The application should
// still check expiresAt/revokedAt because TTL cleanup is asynchronous.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
refreshTokenSchema.index({ userId: 1, revokedAt: 1 })

const refreshTokenModel = mongoose.model('RefreshToken', refreshTokenSchema)

export default refreshTokenModel
