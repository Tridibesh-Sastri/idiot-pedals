import mongoose from "mongoose";

const URL_MAX_LENGTH = 2048;
const SKU_MAX_LENGTH = 64;
const SLUG_MAX_LENGTH = 120;
const PRODUCT_NAME_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 10000;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const urlValidator = {
  validator: (value) => {
    if (value == null || value === "") return true;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  },
  message: "URL must be a valid HTTP(S) URL.",
};

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: PRODUCT_NAME_MAX_LENGTH,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: SLUG_MAX_LENGTH,
      match: SLUG_PATTERN,
      immutable: false,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: SKU_MAX_LENGTH,
      match: SKU_PATTERN,
      immutable: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: DESCRIPTION_MAX_LENGTH,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Price must be a finite number.",
      },
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
      trim: true,
      match: CURRENCY_PATTERN,
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be an integer.",
      },
    },

    reservedStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Reserved stock must be an integer.",
      },
    },

    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock"],
      default: "active",
      index: true,
    },

    images: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: URL_MAX_LENGTH,
          validate: urlValidator,
        },
      ],
      default: [],
      validate: {
        validator: (value) => value.length <= 20,
        message: "A product can have at most 20 images.",
      },
    },

    model3D: {
      url: {
        type: String,
        trim: true,
        maxlength: URL_MAX_LENGTH,
        validate: urlValidator,
      },
      poster: {
        type: String,
        trim: true,
        maxlength: URL_MAX_LENGTH,
        validate: urlValidator,
      },
    },

    audio: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
          },
          url: {
            type: String,
            required: true,
            trim: true,
            maxlength: URL_MAX_LENGTH,
            validate: urlValidator,
          },
        },
      ],
      default: [],
      validate: {
        validator: (value) => value.length <= 20,
        message: "A product can have at most 20 audio assets.",
      },
    },

    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    strict: true,
    minimize: false,
  }
);

productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ name: "text", description: "text" });

productSchema.pre("validate", function () {
  if (this.reservedStock > this.stock) {
    this.invalidate(
      "reservedStock",
      "Reserved stock cannot exceed total stock."
    );
  }

  if (
    this.status === "out_of_stock" &&
    this.stock > this.reservedStock
  ) {
    this.invalidate(
      "status",
      "An out_of_stock product cannot have available stock."
    );
  }

  if (
    this.status === "active" &&
    this.stock <= this.reservedStock
  ) {
    this.invalidate(
      "status",
      "An active product must have available stock."
    );
  }
});

const productModel =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default productModel;
