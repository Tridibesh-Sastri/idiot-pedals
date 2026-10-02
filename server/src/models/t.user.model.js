import mongoose from "mongoose";
import { PHONE_RE, PINCODE_RE } from "./validators.js";

const { Schema } = mongoose;

const emptyToUndefined = (v) => (v === "" || v === null ? undefined : v);

const addressSchema = new Schema({
  label: { type: String, trim: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, match: [PHONE_RE, "Invalid phone"] },
  addressLine1: { type: String, required: true, trim: true },
  addressLine2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true, match: [PINCODE_RE, "Invalid pincode"] },
  country: { type: String, default: "India", trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    emailVerified: { type: Boolean, default: false }, // set true for Google logins (email_verified)

    phone: {
      type: String,
      trim: true,
      set: emptyToUndefined,
      validate: { validator: (v) => v == null || PHONE_RE.test(v), message: "Invalid phone" },
    },
    phoneVerified: { type: Boolean, default: false },

    authProviders: {
      type: [
        new Schema(
          {
            provider: { type: String, enum: ["email", "google"], required: true },
            providerId: { type: String, required: true }, // google: "sub"; email: the email
          },
          { _id: false }
        ),
      ],
      validate: { validator: (v) => v.length >= 1, message: "At least one auth provider required" },
    },

    passwordHash: { type: String, select: false },

    // NEVER accept role from a request body
    role: { type: String, enum: ["customer", "admin"], default: "customer" },

    isBlocked: { type: Boolean, default: false },
    codBlocked: { type: Boolean, default: false },
    rtoCount: { type: Number, default: 0, min: 0 },

    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },

    addresses: {
      type: [addressSchema],
      validate: { validator: (v) => v.length <= 10, message: "Maximum 10 addresses" },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

userSchema.pre("validate", function () {
  if (this.addresses.filter((a) => a.isDefault).length > 1) {
    throw new Error("Only one default address allowed");
  }
});

userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } }
);

// same Google account can never be linked to two users
userSchema.index(
  { "authProviders.provider": 1, "authProviders.providerId": 1 },
  { unique: true, partialFilterExpression: { "authProviders.providerId": { $exists: true } } }
);

const userModel = mongoose.model("User", userSchema);

export default userModel;
