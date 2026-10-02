import mongoose from "mongoose";

const { Schema } = mongoose;

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    tokenHash: { type: String, required: true, unique: true }, // sha256 of the token, never the token

    // One family per login. If a revoked token is reused, revoke the whole family (theft detected)
    familyId: { type: String, required: true, index: true },

    expiresAt: { type: Date, required: true }, // TTL index defined below (no index:true here)

    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },

    userAgent: { type: String, maxlength: 300 },
    ip: { type: String, maxlength: 64 },
  },
  { timestamps: true }
);

// Mongo deletes the doc when expiresAt passes (runs ~every 60s)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.statics.revokeFamily = function (familyId) {
  return this.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
};

const refreshTokenModel = mongoose.model("RefreshToken", refreshTokenSchema);

export default refreshTokenModel;
