import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    authProviders: [
      {
        provider: {
          type: String,
          enum: ["email", "google"],
          required: true,
        },

        providerId: {
          type: String,
          required: true,
        },
      },
    ],

    passwordHash: {
      type: String,
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },

    addresses: [
      {
        label: {
          type: String,
          trim: true,
        },

        name: {
          type: String,
          required: true,
          trim: true,
        },

        phone: {
          type: String,
          required: true,
          trim: true,
        },

        addressLine1: {
          type: String,
          required: true,
          trim: true,
        },

        addressLine2: {
          type: String,
          trim: true,
        },

        city: {
          type: String,
          required: true,
          trim: true,
        },

        state: {
          type: String,
          required: true,
          trim: true,
        },

        postalCode: {
          type: String,
          required: true,
          trim: true,
        },

        country: {
          type: String,
          default: "India",
          trim: true,
        },

        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const userModel = mongoose.model("User", userSchema);

export default userModel;